import type { TrackDto } from '@roman/shared';

import type { MediaUrls } from '@/lib/cloudinary';

import { clearSession, saveSession, type SavedSession } from './persistence';
import {
  currentTrack,
  hasNext,
  initialPlayerState,
  playerReducer,
  type PlayerAction,
} from './playerState';
import { createTimeStore, type TimeStore } from './timeStore';

/** Going back within this many seconds goes to the previous track; later, it restarts. */
const RESTART_THRESHOLD_SECONDS = 3;
const SAVE_INTERVAL_MS = 5000;

export interface AudioController {
  readonly timeStore: TimeStore;
  // Function properties (not methods): the provider hands them out unbound.
  playTrack: (track: TrackDto, queue?: TrackDto[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  pause: () => void;
  close: () => void;
  retry: () => void;
  /** Brings back a saved session, paused, unless something has been played since loading. */
  restore: (saved: SavedSession) => void;
  destroy: () => void;
}

interface ControllerOptions {
  /** React's dispatch. Every action also updates the controller's own copy of the state. */
  dispatch: (action: PlayerAction) => void;
  urls: () => MediaUrls;
}

function artworkFor(track: TrackDto, urls: MediaUrls): MediaImage[] {
  const cover = track.cover ?? track.album?.cover;
  if (!cover) return [];
  return [96, 256, 512].map((size) => ({
    src: urls.imageUrl(cover.asset, {
      crop: 'fill',
      width: size,
      height: size,
      format: 'jpg',
    }),
    sizes: `${String(size)}x${String(size)}`,
    type: 'image/jpeg',
  }));
}

/**
 * Owns the site's single HTMLAudioElement (plan §23). Created once by AudioPlayerProvider, so the
 * element and playback survive page navigation. Nothing plays without a user gesture: the element
 * has preload="none" and gets its source only when someone presses play.
 */
export function createAudioController({ dispatch, urls }: ControllerOptions): AudioController {
  let state = initialPlayerState;
  let element: HTMLAudioElement | undefined;
  /** Where to start the next load from: a restored session's saved position. */
  let pendingSeek: number | undefined;
  let lastSave = 0;
  const timeStore = createTimeStore();
  const session =
    typeof navigator !== 'undefined' && 'mediaSession' in navigator
      ? navigator.mediaSession
      : undefined;

  function send(action: PlayerAction): void {
    state = playerReducer(state, action);
    dispatch(action);
    if (session) {
      session.playbackState =
        state.status === 'playing' ? 'playing' : state.status === 'idle' ? 'none' : 'paused';
    }
  }

  function persist(force = false): void {
    const now = Date.now();
    if (!force && now - lastSave < SAVE_INTERVAL_MS) return;
    lastSave = now;
    if (state.index === -1) return;
    saveSession({
      queue: state.queue,
      index: state.index,
      position: element?.currentTime ?? pendingSeek ?? 0,
      volume: state.volume,
    });
  }

  function updateBuffered(audio: HTMLAudioElement): void {
    const { buffered, currentTime } = audio;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        timeStore.set({ buffered: buffered.end(i) });
        return;
      }
    }
  }

  function updatePositionState(audio: HTMLAudioElement): void {
    if (!session || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      session.setPositionState({
        duration: audio.duration,
        position: Math.min(audio.currentTime, audio.duration),
        playbackRate: audio.playbackRate,
      });
    } catch {
      // Older browsers reject position state; the controls still work.
    }
  }

  function audio(): HTMLAudioElement {
    if (element) return element;
    const el = new Audio();
    el.preload = 'none';
    el.volume = state.volume;
    el.muted = state.muted;

    el.addEventListener('playing', () => {
      send({ type: 'playing' });
    });
    el.addEventListener('pause', () => {
      if (!el.ended) send({ type: 'paused' });
      persist(true);
    });
    el.addEventListener('waiting', () => {
      send({ type: 'waiting' });
    });
    el.addEventListener('loadedmetadata', () => {
      if (pendingSeek !== undefined) {
        el.currentTime = pendingSeek;
        pendingSeek = undefined;
      }
    });
    el.addEventListener('timeupdate', () => {
      timeStore.set({ currentTime: el.currentTime });
      updatePositionState(el);
      persist();
    });
    el.addEventListener('durationchange', () => {
      if (Number.isFinite(el.duration)) timeStore.set({ duration: el.duration });
    });
    el.addEventListener('progress', () => {
      updateBuffered(el);
    });
    el.addEventListener('ended', () => {
      if (hasNext(state)) {
        load(state.queue, state.index + 1);
      } else {
        send({ type: 'ended' });
        persist(true);
      }
    });
    el.addEventListener('error', () => {
      // An empty src (after close) also fires "error"; only real failures count.
      if (el.getAttribute('src')) send({ type: 'error' });
    });
    element = el;
    return el;
  }

  function play(el: HTMLAudioElement): void {
    el.play().catch((error: unknown) => {
      // Autoplay policy (no user gesture): stay paused, without an error (plan §23).
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        send({ type: 'paused' });
      }
      // AbortError means a newer load replaced this one; anything else fires "error".
    });
  }

  function updateMetadata(track: TrackDto): void {
    if (!session || typeof MediaMetadata === 'undefined') return;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artistCredit,
      album: track.album?.title ?? '',
      artwork: artworkFor(track, urls()),
    });
  }

  function load(queue: TrackDto[], index: number, position?: number): void {
    const track = queue[index];
    if (!track) return;
    send({ type: 'load', queue, index });
    const el = audio();
    pendingSeek = position;
    timeStore.set({ currentTime: position ?? 0, duration: track.duration, buffered: 0 });
    el.src = urls().audioUrl(track.audio);
    updateMetadata(track);
    persist(true);
    play(el);
  }

  const controller: AudioController = {
    timeStore,

    playTrack(track, queue = [track]) {
      const index = queue.findIndex((item) => item.id === track.id);
      if (index === -1) load([track], 0);
      else load(queue, index);
    },

    toggle() {
      const el = element;
      if (state.status === 'playing' || state.status === 'loading') {
        el?.pause();
        return;
      }
      // A restored session has no source yet: load it at the saved position.
      if (!el?.getAttribute('src') || state.status === 'error') {
        load(state.queue, state.index, pendingSeek ?? (el ? el.currentTime : undefined));
        return;
      }
      play(el);
    },

    next() {
      if (hasNext(state)) load(state.queue, state.index + 1);
    },

    prev() {
      const el = element;
      if (el && el.currentTime > RESTART_THRESHOLD_SECONDS) {
        controller.seek(0);
      } else if (state.index > 0) {
        load(state.queue, state.index - 1);
      } else {
        controller.seek(0);
      }
    },

    seek(seconds) {
      const duration = timeStore.get().duration;
      const target = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
      timeStore.set({ currentTime: target });
      if (element?.getAttribute('src')) {
        element.currentTime = target;
      } else {
        pendingSeek = target;
      }
    },

    setVolume(volume) {
      const muted = volume === 0 ? state.muted : false;
      send({ type: 'volume', volume, muted });
      if (element) {
        element.volume = state.volume;
        element.muted = state.muted;
      }
      persist(true);
    },

    toggleMute() {
      send({ type: 'volume', volume: state.volume, muted: !state.muted });
      if (element) element.muted = state.muted;
    },

    pause() {
      element?.pause();
    },

    close() {
      if (element) {
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      pendingSeek = undefined;
      send({ type: 'close' });
      timeStore.set({ currentTime: 0, duration: 0, buffered: 0 });
      if (session) session.metadata = null;
      clearSession();
    },

    retry() {
      load(state.queue, state.index, element?.currentTime);
    },

    restore(saved) {
      if (state.index !== -1) return;
      send({ type: 'restore', queue: saved.queue, index: saved.index, volume: saved.volume });
      pendingSeek = saved.position;
      const track = currentTrack(state);
      if (track) timeStore.set({ currentTime: saved.position, duration: track.duration });
    },

    destroy() {
      persist(true);
      element?.pause();
    },
  };

  // Lock-screen, notification and headphone controls (plan §23).
  if (session) {
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        'play',
        () => {
          controller.toggle();
        },
      ],
      [
        'pause',
        () => {
          controller.pause();
        },
      ],
      [
        'previoustrack',
        () => {
          controller.prev();
        },
      ],
      [
        'nexttrack',
        () => {
          controller.next();
        },
      ],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined) controller.seek(details.seekTime);
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action in this browser.
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      persist(true);
    });
  }

  return controller;
}

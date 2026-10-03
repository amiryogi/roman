import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TrackDto } from '@roman/shared';

import { createMediaUrls } from '@/lib/cloudinary';
import { FakeAudio } from '@/test/fakeAudio';
import { trackFixture } from '@/test/fixtures';

import { createAudioController } from './audioController';
import { formatDuration, spokenDuration } from './duration';
import { loadSession } from './persistence';
import {
  currentTrack,
  initialPlayerState,
  playerReducer,
  type PlayerAction,
  type PlayerState,
} from './playerState';

const tracks: TrackDto[] = [
  trackFixture({ id: 'a', title: 'First' }),
  trackFixture({ id: 'b', title: 'Second' }),
  trackFixture({ id: 'c', title: 'Third' }),
];

describe('playerReducer', () => {
  const run = (...actions: PlayerAction[]) => actions.reduce(playerReducer, initialPlayerState);

  it('loads, plays and pauses', () => {
    const state = run({ type: 'load', queue: tracks, index: 1 }, { type: 'playing' });
    expect(state).toMatchObject({ index: 1, status: 'playing', visible: true });
    expect(currentTrack(state)?.title).toBe('Second');
    expect(playerReducer(state, { type: 'paused' }).status).toBe('paused');
  });

  it('keeps an error until something new is loaded', () => {
    const failed = run({ type: 'load', queue: tracks, index: 0 }, { type: 'error' });
    expect(playerReducer(failed, { type: 'paused' }).status).toBe('error');
    expect(playerReducer(failed, { type: 'load', queue: tracks, index: 1 }).status).toBe('loading');
  });

  it('ignores events when nothing is loaded and out-of-range loads', () => {
    expect(run({ type: 'playing' })).toBe(initialPlayerState);
    expect(run({ type: 'load', queue: tracks, index: 3 })).toBe(initialPlayerState);
  });

  it('clamps volume and keeps it when the player closes', () => {
    const state = run(
      { type: 'load', queue: tracks, index: 0 },
      { type: 'volume', volume: 7, muted: true },
      { type: 'close' },
    );
    expect(state).toEqual<PlayerState>({ ...initialPlayerState, volume: 1, muted: true });
  });
});

describe('duration', () => {
  it('formats for display and for screen readers', () => {
    expect(formatDuration(225.6)).toBe('3:45');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(spokenDuration(83)).toBe('1 minute 23 seconds');
    expect(spokenDuration(60)).toBe('1 minute');
    expect(spokenDuration(0)).toBe('0 seconds');
  });
});

describe('audio controller', () => {
  let state: PlayerState;
  const urls = () => createMediaUrls('test-cloud');

  function setup(initial: PlayerState = initialPlayerState, resumeAt?: number) {
    state = initial;
    return createAudioController({
      dispatch: (action) => {
        state = playerReducer(state, action);
      },
      initial,
      resumeAt,
      urls,
    });
  }

  beforeEach(() => {
    FakeAudio.reset();
    vi.stubGlobal('Audio', FakeAudio);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates no audio element and loads nothing until something is played', () => {
    setup();
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it('plays the chosen track from its MP3 stream, with preload off', async () => {
    const player = setup();
    player.playTrack(tracks[1] ?? trackFixture(), tracks);
    await Promise.resolve();

    const audio = FakeAudio.last();
    expect(audio.preload).toBe('none');
    expect(audio.src).toContain('/video/private/ac_mp3,br_160k/');
    expect(audio.src).toMatch(/\.mp3$/);
    expect(state).toMatchObject({ index: 1, status: 'playing' });
  });

  it('advances at the end of a track and stops at the end of the queue', () => {
    const player = setup();
    player.playTrack(tracks[1] ?? trackFixture(), tracks);

    FakeAudio.last().finish();
    expect(currentTrack(state)?.title).toBe('Third');

    FakeAudio.last().finish();
    expect(currentTrack(state)?.title).toBe('Third');
    expect(state.status).toBe('paused');
  });

  it('restarts the track when going back after 3 seconds, otherwise goes to the previous one', () => {
    const player = setup();
    player.playTrack(tracks[1] ?? trackFixture(), tracks);
    const audio = FakeAudio.last();

    audio.currentTime = 42;
    player.prev();
    expect(audio.currentTime).toBe(0);
    expect(currentTrack(state)?.title).toBe('Second');

    player.prev();
    expect(currentTrack(state)?.title).toBe('First');
  });

  it('stays paused without an error when the browser blocks playback', async () => {
    FakeAudio.rejectNextPlay = 'NotAllowedError';
    const player = setup();
    player.playTrack(tracks[0] ?? trackFixture());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(state.status).toBe('paused');
  });

  it('reports a playback error, and retries', () => {
    const player = setup();
    player.playTrack(tracks[0] ?? trackFixture());
    FakeAudio.last().fire('error');
    expect(state.status).toBe('error');

    player.retry();
    expect(state.status).toBe('playing');
  });

  it('saves the session and resumes it paused, at the saved position', () => {
    const player = setup();
    player.playTrack(tracks[2] ?? trackFixture(), tracks);
    const audio = FakeAudio.last();
    audio.currentTime = 61;
    audio.pause();

    const saved = loadSession();
    expect(saved).toMatchObject({ index: 2, position: 61 });

    // A reload: a new controller from the saved session.
    FakeAudio.reset();
    const restored = playerReducer(initialPlayerState, {
      type: 'restore',
      queue: saved?.queue ?? [],
      index: saved?.index ?? 0,
      volume: saved?.volume ?? 1,
    });
    const resumed = setup(restored, saved?.position);
    expect(state).toMatchObject({ status: 'paused', visible: true });
    expect(resumed.timeStore.get().currentTime).toBe(61);
    expect(FakeAudio.instances).toHaveLength(0); // nothing loads until play is pressed

    resumed.toggle();
    const reloaded = FakeAudio.last();
    reloaded.fire('loadedmetadata');
    expect(reloaded.currentTime).toBe(61);
    expect(state.status).toBe('playing');
  });

  it('stops, hides and forgets the session on close', () => {
    const player = setup();
    player.playTrack(tracks[0] ?? trackFixture());
    player.close();

    expect(FakeAudio.last().paused).toBe(true);
    expect(FakeAudio.last().getAttribute('src')).toBeNull();
    expect(state.visible).toBe(false);
    expect(loadSession()).toBeUndefined();
  });

  it('unmutes when the volume is raised', () => {
    const player = setup();
    player.playTrack(tracks[0] ?? trackFixture());
    player.toggleMute();
    expect(FakeAudio.last().muted).toBe(true);

    player.setVolume(0.4);
    expect(FakeAudio.last()).toMatchObject({ muted: false, volume: 0.4 });
  });
});

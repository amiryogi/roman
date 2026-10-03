import { createContext, useContext, useSyncExternalStore } from 'react';

import type { TrackDto } from '@roman/shared';

import type { PlayerState } from './playerState';
import type { TimeSnapshot, TimeStore } from './timeStore';

/** What `useAudioPlayer()` exposes (plan §23). */
export interface AudioPlayer {
  state: PlayerState;
  current: TrackDto | undefined;
  /** Plays `track`, with `queue` (default: just that track) for next/previous. */
  playTrack: (track: TrackDto, queue?: TrackDto[]) => void;
  toggle: () => void;
  next: () => void;
  /** Restarts the track when more than 3 s in, otherwise goes to the previous one. */
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** For video players: only one source plays at a time. */
  pause: () => void;
  /** Stops playback and hides the player. */
  close: () => void;
  retry: () => void;
  timeStore: TimeStore;
}

export const AudioPlayerContext = createContext<AudioPlayer | null>(null);

export function useAudioPlayer(): AudioPlayer {
  const player = useContext(AudioPlayerContext);
  if (!player) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider');
  return player;
}

/** Current time, duration and buffered end. Only components that call this re-render on ticks. */
export function useAudioTime(): TimeSnapshot {
  const { timeStore } = useAudioPlayer();
  return useSyncExternalStore(timeStore.subscribe, timeStore.get);
}

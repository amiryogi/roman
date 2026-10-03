import type { TrackDto } from '@roman/shared';

/** Player state (plan §23). Time lives in a separate store so it can update 4×/s cheaply. */
export interface PlayerState {
  queue: TrackDto[];
  /** Index of the current track in `queue`, or -1 when nothing is loaded. */
  index: number;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  volume: number;
  muted: boolean;
  /** The bar appears on first play (or a restored session) and hides when closed. */
  visible: boolean;
}

export type PlayerAction =
  | { type: 'load'; queue: TrackDto[]; index: number }
  | { type: 'restore'; queue: TrackDto[]; index: number; volume: number }
  | { type: 'playing' }
  | { type: 'paused' }
  | { type: 'waiting' }
  | { type: 'error' }
  | { type: 'ended' }
  | { type: 'volume'; volume: number; muted: boolean }
  | { type: 'close' };

export const initialPlayerState: PlayerState = {
  queue: [],
  index: -1,
  status: 'idle',
  volume: 1,
  muted: false,
  visible: false,
};

function clampVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'load':
      if (action.index < 0 || action.index >= action.queue.length) return state;
      return {
        ...state,
        queue: action.queue,
        index: action.index,
        status: 'loading',
        visible: true,
      };
    case 'restore':
      if (action.index < 0 || action.index >= action.queue.length) return state;
      return {
        ...state,
        queue: action.queue,
        index: action.index,
        status: 'paused',
        volume: clampVolume(action.volume),
        visible: true,
      };
    case 'playing':
      return state.index === -1 ? state : { ...state, status: 'playing' };
    case 'paused':
      return state.index === -1 || state.status === 'error'
        ? state
        : { ...state, status: 'paused' };
    case 'waiting':
      return state.status === 'playing' ? { ...state, status: 'loading' } : state;
    case 'error':
      return state.index === -1 ? state : { ...state, status: 'error' };
    case 'ended':
      // End of the queue: stop on the last track (no repeat in v1).
      return { ...state, status: 'paused' };
    case 'volume':
      return { ...state, volume: clampVolume(action.volume), muted: action.muted };
    case 'close':
      return { ...initialPlayerState, volume: state.volume, muted: state.muted };
  }
}

export function currentTrack(state: PlayerState): TrackDto | undefined {
  return state.queue[state.index];
}

export function hasNext(state: PlayerState): boolean {
  return state.index >= 0 && state.index < state.queue.length - 1;
}

export function hasPrevious(state: PlayerState): boolean {
  return state.index > 0;
}

/** Playing or about to play: the button should offer "Pause". */
export function isActive(state: PlayerState): boolean {
  return state.status === 'playing' || state.status === 'loading';
}

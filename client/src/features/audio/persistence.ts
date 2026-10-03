import type { TrackDto } from '@roman/shared';

import { MAX_SAVED_QUEUE } from './sessionLimits';

const STORAGE_KEY = 'rb-player';

export interface SavedSession {
  queue: TrackDto[];
  index: number;
  position: number;
  volume: number;
}

/**
 * The player survives a reload within the tab (plan §23): queue, track, position and volume are
 * kept in sessionStorage and restored paused. Storage can be unavailable (private modes), so
 * every access is guarded. The stored value is validated with the shared track schema, loaded on
 * demand so Zod stays out of the initial JavaScript (plan §16).
 */
export async function loadSession(): Promise<SavedSession | undefined> {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    const { parseSavedSession } = await import('./sessionSchema');
    const value: unknown = JSON.parse(raw);
    return parseSavedSession(value);
  } catch {
    return undefined;
  }
}

export function saveSession(session: {
  queue: TrackDto[];
  index: number;
  position: number;
  volume: number;
}): void {
  try {
    // Keep the current track inside the stored window when the queue is long.
    const start = Math.max(0, Math.min(session.index, session.queue.length - MAX_SAVED_QUEUE));
    const queue = session.queue.slice(start, start + MAX_SAVED_QUEUE);
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, queue, index: session.index - start }),
    );
  } catch {
    // Storage full or blocked: the player still works, it just won't be restored.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

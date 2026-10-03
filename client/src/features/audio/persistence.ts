import { z } from 'zod';

import { trackDtoSchema, type TrackDto } from '@roman/shared';

const STORAGE_KEY = 'rb-player';
const MAX_QUEUE = 50;

const savedSessionSchema = z.object({
  queue: z.array(trackDtoSchema).min(1).max(MAX_QUEUE),
  index: z.number().int().min(0),
  position: z.number().min(0),
  volume: z.number().min(0).max(1),
});

export type SavedSession = z.infer<typeof savedSessionSchema>;

/**
 * The player survives a reload within the tab (plan §23): queue, track, position and volume are
 * kept in sessionStorage and restored paused. Storage can be unavailable (private modes), so
 * every access is guarded.
 */
export function loadSession(): SavedSession | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = savedSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.index >= parsed.data.queue.length) return undefined;
    return parsed.data;
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
    const start = Math.max(0, Math.min(session.index, session.queue.length - MAX_QUEUE));
    const queue = session.queue.slice(start, start + MAX_QUEUE);
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

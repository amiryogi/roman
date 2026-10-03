export interface TimeSnapshot {
  currentTime: number;
  duration: number;
  /** End of the buffered range that contains the playhead, in seconds. */
  buffered: number;
}

// Function properties (not methods): useSyncExternalStore receives them unbound.
export interface TimeStore {
  get: () => TimeSnapshot;
  set: (next: Partial<TimeSnapshot>) => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * A tiny external store for playback time, read with useSyncExternalStore, so only the progress
 * UI re-renders on `timeupdate` instead of the whole app (plan §12.3).
 */
export function createTimeStore(): TimeStore {
  let snapshot: TimeSnapshot = { currentTime: 0, duration: 0, buffered: 0 };
  const listeners = new Set<() => void>();

  return {
    get: () => snapshot,
    set(next) {
      const merged = { ...snapshot, ...next };
      if (
        merged.currentTime === snapshot.currentTime &&
        merged.duration === snapshot.duration &&
        merged.buffered === snapshot.buffered
      ) {
        return;
      }
      snapshot = merged;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

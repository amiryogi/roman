import { useSyncExternalStore } from 'react';

import { REDUCED_MOTION_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';

// Which on-page video has its sound on. Videos play muted by themselves; only one at a time may
// have sound, so turning one on mutes the rest (and the site's music is paused by the caller).

let owner: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function claimSound(id: string): void {
  owner = id;
  emit();
}

export function releaseSound(id: string): void {
  if (owner !== id) return;
  owner = null;
  emit();
}

export function useSoundOwner(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => owner,
    () => null,
  );
}

/** The browser's data-saver setting (Network Information API, where it exists). */
export function savingData(): boolean {
  if (!('connection' in navigator)) return false;
  const { connection } = navigator;
  return (
    typeof connection === 'object' &&
    connection !== null &&
    'saveData' in connection &&
    connection.saveData === true
  );
}

/** Videos may start by themselves (muted), unless the visitor prefers less motion or data use. */
export function useAutoplayAllowed(): boolean {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  return !reducedMotion && !savingData();
}

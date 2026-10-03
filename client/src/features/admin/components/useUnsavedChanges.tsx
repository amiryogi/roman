import { useEffect } from 'react';
import { useBlocker, type Location } from 'react-router';

import { ConfirmDialog } from './ConfirmDialog';

/** Navigation state that marks "leaving because the form was just saved". */
export const SAVED_STATE = { saved: true } as const;

function leavingAfterSave(location: Location): boolean {
  const state: unknown = location.state;
  return typeof state === 'object' && state !== null && 'saved' in state && state.saved === true;
}

/**
 * Asks before leaving a form with unsaved changes (plan §25 Phase 9): in-app navigation shows a
 * dialog, and closing or reloading the tab gets the browser's own prompt. Navigating with
 * `{ state: SAVED_STATE }` after a successful save is never blocked.
 */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      currentLocation.pathname !== nextLocation.pathname &&
      !leavingAfterSave(nextLocation),
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Leave without saving?"
      message="Your changes on this page haven’t been saved yet."
      confirmLabel="Leave without saving"
      onConfirm={() => {
        blocker.proceed?.();
      }}
      onCancel={() => {
        blocker.reset?.();
      }}
    />
  );
}

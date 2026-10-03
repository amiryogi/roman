import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { getMediaUrls } from '@/lib/cloudinary';

import { createAudioController } from './audioController';
import { AudioPlayerContext, type AudioPlayer } from './AudioPlayerContext';
import { loadSession } from './persistence';
import { currentTrack, initialPlayerState, playerReducer } from './playerState';

/**
 * Global audio player (plan §23). Mounted by the public layout, above the routed pages, so music
 * keeps playing while visitors navigate. A reloaded tab gets its last track back, paused.
 */
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [controller] = useState(() => createAudioController({ dispatch, urls: getMediaUrls }));

  useEffect(() => {
    let active = true;
    void loadSession().then((saved) => {
      if (active && saved) controller.restore(saved);
    });
    return () => {
      active = false;
      controller.destroy();
    };
  }, [controller]);

  const player = useMemo<AudioPlayer>(
    () => ({
      state,
      current: currentTrack(state),
      playTrack: controller.playTrack,
      toggle: controller.toggle,
      next: controller.next,
      prev: controller.prev,
      seek: controller.seek,
      setVolume: controller.setVolume,
      toggleMute: controller.toggleMute,
      pause: controller.pause,
      close: controller.close,
      retry: controller.retry,
      timeStore: controller.timeStore,
    }),
    [state, controller],
  );

  return <AudioPlayerContext value={player}>{children}</AudioPlayerContext>;
}

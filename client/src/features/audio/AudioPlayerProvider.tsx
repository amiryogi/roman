import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { getMediaUrls } from '@/lib/cloudinary';

import { createAudioController } from './audioController';
import { AudioPlayerContext, type AudioPlayer } from './AudioPlayerContext';
import { loadSession } from './persistence';
import { currentTrack, initialPlayerState, playerReducer, type PlayerState } from './playerState';

function restoredState(): { state: PlayerState; position?: number } {
  const saved = loadSession();
  if (!saved) return { state: initialPlayerState };
  return {
    state: playerReducer(initialPlayerState, {
      type: 'restore',
      queue: saved.queue,
      index: saved.index,
      volume: saved.volume,
    }),
    position: saved.position,
  };
}

/**
 * Global audio player (plan §23). Mounted by the public layout, above the routed pages, so music
 * keeps playing while visitors navigate. A reloaded tab gets its last track back, paused.
 */
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [restored] = useState(restoredState);
  const [state, dispatch] = useReducer(playerReducer, restored.state);
  const [controller] = useState(() =>
    createAudioController({
      dispatch,
      initial: restored.state,
      resumeAt: restored.position,
      urls: getMediaUrls,
    }),
  );

  useEffect(
    () => () => {
      controller.destroy();
    },
    [controller],
  );

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

import { useRef } from 'react';

import { Container } from '@/components/ui/Container';

import { useAudioPlayer } from './AudioPlayerContext';
import {
  PlayPauseButton,
  ProgressLine,
  SeekSlider,
  TransportControls,
  VolumeControl,
} from './controls';
import { ChevronDownIcon, CloseIcon } from './icons';
import { hasNext } from './playerState';
import { TrackArtwork } from './TrackArtwork';

/** Height reserved at the bottom of the page while the bar is visible (plan §7.4). */
export const PLAYER_BAR_PADDING = 'pb-16 md:pb-20';

const textButton =
  'inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium underline-offset-4 hover:underline';

/**
 * The persistent player (plan §23). Hidden until the first play. Desktop: one row with every
 * control. Phones: a compact bar that opens a bottom sheet with the full controls.
 */
export function PlayerBar() {
  const player = useAudioPlayer();
  const { state, current, close } = player;
  const sheetRef = useRef<HTMLDialogElement>(null);

  if (!state.visible || !current) return null;

  const meta = [current.artistCredit, current.album?.title].filter(Boolean).join(' · ');
  const error = state.status === 'error';

  function closeSheet() {
    sheetRef.current?.close();
  }

  return (
    <section
      aria-label="Audio player"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ivory/10 surface-dark-raised pb-[env(safe-area-inset-bottom)]"
    >
      {/* Announces track changes, not play/pause (plan §18). */}
      <p className="sr-only" aria-live="polite">
        Current track: {current.title}
      </p>

      {/* Phones: compact bar */}
      <div className="md:hidden">
        <ProgressLine />
        <div className="flex h-16 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => sheetRef.current?.showModal()}
            aria-haspopup="dialog"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <TrackArtwork track={current} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{current.title}</span>
              <span className="block truncate text-xs text-mist">
                {error ? 'Couldn’t play this track' : meta}
              </span>
              <span className="sr-only">, open the player</span>
            </span>
          </button>
          <PlayPauseButton />
        </div>
      </div>

      {/* Tablet and desktop: everything in one row */}
      <Container className="hidden h-20 items-center gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.6fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <TrackArtwork track={current} size={48} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-mist">{meta}</p>
          </div>
        </div>
        <TransportControls />
        {error ? <PlaybackError /> : <SeekSlider />}
        <div className="flex items-center gap-1">
          <VolumeControl />
          <button
            type="button"
            onClick={close}
            aria-label="Close player"
            className="inline-flex size-11 items-center justify-center rounded-full hover:text-(--accent)"
          >
            <CloseIcon />
          </button>
        </div>
      </Container>

      {/* Phones: full controls in a bottom sheet */}
      <dialog
        ref={sheetRef}
        aria-label="Player"
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-sm surface-dark-raised p-0 backdrop:bg-ebony/80 md:hidden"
      >
        <div className="flex flex-col gap-6 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <p className="label-caps text-mist">Now playing</p>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Collapse player"
              className="inline-flex size-11 items-center justify-center rounded-full"
            >
              <ChevronDownIcon />
            </button>
          </div>
          <TrackArtwork track={current} size={240} className="mx-auto" />
          <div className="text-center">
            <p className="font-display text-[1.75rem] leading-tight font-medium">{current.title}</p>
            <p className="mt-1 text-sm text-mist">{meta}</p>
          </div>
          {error ? <PlaybackError /> : <SeekSlider tall />}
          <div className="flex justify-center">
            <TransportControls large />
          </div>
          <div className="flex items-center justify-between gap-4">
            <VolumeControl />
            <button
              type="button"
              onClick={() => {
                closeSheet();
                close();
              }}
              className={textButton}
            >
              Stop and close
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

/** Inline error with Retry and Skip; no automatic skipping, to avoid a cascade (plan §23). */
function PlaybackError() {
  const { state, retry, next } = useAudioPlayer();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-2 text-sm">
      <span>This track couldn’t be played.</span>
      <button type="button" onClick={retry} className={textButton}>
        Retry
      </button>
      {hasNext(state) && (
        <button type="button" onClick={next} className={textButton}>
          Skip
        </button>
      )}
    </div>
  );
}

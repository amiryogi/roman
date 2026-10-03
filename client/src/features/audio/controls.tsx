import { useState, type KeyboardEvent } from 'react';

import { useAudioPlayer, useAudioTime } from './AudioPlayerContext';
import { formatDuration, spokenDuration } from './duration';
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon, VolumeIcon } from './icons';
import { hasNext, isActive } from './playerState';

const SEEK_STEP_SECONDS = 5;

const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:text-(--accent) disabled:opacity-40 disabled:hover:text-current';

function percent(value: number, total: number): string {
  return total > 0 ? `${String(Math.min(100, (value / total) * 100))}%` : '0%';
}

/** Volume is read-only on iOS (hardware buttons only), so the slider is hidden there (plan §23). */
let volumeSettable: boolean | undefined;
function canSetVolume(): boolean {
  if (volumeSettable === undefined) {
    try {
      const probe = document.createElement('audio');
      probe.volume = 0.5;
      volumeSettable = probe.volume === 0.5;
    } catch {
      volumeSettable = false;
    }
  }
  return volumeSettable;
}

export function PlayPauseButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { state, current, toggle } = useAudioPlayer();
  const active = isActive(state);
  const title = current?.title ?? 'track';
  const dimensions = size === 'lg' ? 'size-16' : 'size-11';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${active ? 'Pause' : 'Play'} ${title}`}
      className={`relative inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full bg-(--accent) text-(--on-accent) transition hover:brightness-110`}
    >
      {active ? <PauseIcon /> : <PlayIcon className="size-5 translate-x-px" />}
      {state.status === 'loading' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-ivory motion-reduce:animate-none"
        />
      )}
    </button>
  );
}

export function TransportControls({ large = false }: { large?: boolean }) {
  const { state, prev, next } = useAudioPlayer();
  return (
    <div className={`flex items-center ${large ? 'gap-6' : 'gap-1'}`}>
      <button type="button" onClick={prev} aria-label="Previous track" className={iconButton}>
        <PreviousIcon />
      </button>
      <PlayPauseButton size={large ? 'lg' : 'md'} />
      <button
        type="button"
        onClick={next}
        disabled={!hasNext(state)}
        aria-label="Next track"
        className={iconButton}
      >
        <NextIcon />
      </button>
    </div>
  );
}

/**
 * The seek slider, drawn as a string. Arrow keys move 5 s, Home/End jump to the ends, and the
 * value is spoken as "1 minute 23 seconds of 3 minutes 45 seconds" (plan §18).
 */
export function SeekSlider({ tall = false }: { tall?: boolean }) {
  const { seek } = useAudioPlayer();
  const { currentTime, duration, buffered } = useAudioTime();
  const max = duration > 0 ? duration : 0;
  const value = Math.min(currentTime, max);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? SEEK_STEP_SECONDS
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -SEEK_STEP_SECONDS
          : 0;
    if (step !== 0) {
      event.preventDefault();
      seek(value + step);
    }
  }

  return (
    <div className="flex w-full items-center gap-3 text-xs text-(--muted) tabular-nums">
      <span className="w-10 text-right" aria-hidden="true">
        {formatDuration(value)}
      </span>
      <input
        type="range"
        min={0}
        max={max || 1}
        step="any"
        value={value}
        disabled={max === 0}
        aria-label="Seek"
        aria-valuetext={`${spokenDuration(value)} of ${spokenDuration(max)}`}
        onChange={(event) => {
          seek(Number(event.currentTarget.value));
        }}
        onKeyDown={handleKeyDown}
        className={`string-range flex-1 text-ivory ${tall ? 'h-11' : ''}`}
        style={{ '--progress': percent(value, max), '--buffered': percent(buffered, max) }}
      />
      <span className="w-10" aria-hidden="true">
        {formatDuration(max)}
      </span>
    </div>
  );
}

/** Mute and volume slider; only the mute button on devices that don't allow setting volume. */
export function VolumeControl() {
  const { state, setVolume, toggleMute } = useAudioPlayer();
  const [settable] = useState(canSetVolume);
  const shown = state.muted ? 0 : state.volume;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggleMute}
        aria-label={state.muted ? 'Unmute' : 'Mute'}
        className={iconButton}
      >
        <VolumeIcon muted={state.muted || state.volume === 0} />
      </button>
      {settable && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={shown}
          aria-label="Volume"
          aria-valuetext={`${String(Math.round(shown * 100))}%`}
          onChange={(event) => {
            setVolume(Number(event.currentTarget.value));
          }}
          className="string-range w-24 text-ivory"
          style={{ '--progress': percent(shown, 1), '--buffered': '0%' }}
        />
      )}
    </div>
  );
}

/** Thin progress line along the top of the compact mobile bar. Decorative; the sheet has the slider. */
export function ProgressLine() {
  const { currentTime, duration } = useAudioTime();
  return (
    <div aria-hidden="true" className="h-0.5 w-full bg-ivory/15">
      <div className="h-full bg-(--accent)" style={{ width: percent(currentTime, duration) }} />
    </div>
  );
}

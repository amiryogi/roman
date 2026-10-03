import type { TrackDto } from '@roman/shared';

import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { formatDuration } from '@/features/audio/duration';
import { PauseIcon, PlayIcon, PlayingIndicator } from '@/features/audio/icons';
import { isActive } from '@/features/audio/playerState';
import { TrackArtwork } from '@/features/audio/TrackArtwork';

/** Tracks that play through the global player; the list is the queue for next/previous. */
export function TrackList({ tracks }: { tracks: TrackDto[] }) {
  return (
    <ol className="divide-y divide-current/15 border-y border-current/15">
      {tracks.map((track) => (
        <li key={track.id}>
          <TrackRow track={track} queue={tracks} />
        </li>
      ))}
    </ol>
  );
}

function TrackRow({ track, queue }: { track: TrackDto; queue: TrackDto[] }) {
  const { state, current, playTrack, toggle } = useAudioPlayer();
  const isCurrent = current?.id === track.id;
  const playing = isCurrent && isActive(state);
  const details = [track.artistCredit, track.album?.title, track.year].filter(Boolean).join(' · ');
  const headingId = `track-${track.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 sm:gap-6"
    >
      {/* The label changes with the state ("Play X" / "Pause X"), so no aria-pressed as well. */}
      <button
        type="button"
        onClick={() => {
          if (isCurrent) toggle();
          else playTrack(track, queue);
        }}
        aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
        className="group relative size-14 shrink-0 rounded-sm"
      >
        <TrackArtwork track={track} size={56} />
        <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-ebony/45 text-ivory opacity-90 transition-opacity group-hover:bg-ebony/60">
          {playing ? <PauseIcon /> : <PlayIcon className="size-5 translate-x-px" />}
        </span>
      </button>

      <div className="min-w-0">
        <h3 id={headingId} className="flex items-center gap-2 text-base font-medium sm:text-lg">
          <span className="truncate">{track.title}</span>
          {isCurrent && <PlayingIndicator active={playing} className="size-3.5 text-(--accent)" />}
        </h3>
        {details && <p className="truncate text-sm text-(--muted)">{details}</p>}
        {track.credits && (
          <p className="mt-1 line-clamp-2 text-sm text-(--muted)">{track.credits}</p>
        )}
      </div>

      <time
        dateTime={`PT${String(Math.round(track.duration))}S`}
        className="text-sm text-(--muted) tabular-nums"
      >
        {formatDuration(track.duration)}
      </time>
    </article>
  );
}

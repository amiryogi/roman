import { useEffect, useRef, useState } from 'react';

import type { VideoDto } from '@roman/shared';

import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { formatDuration } from '@/features/audio/duration';
import { PauseIcon, PlayIcon, VolumeIcon } from '@/features/audio/icons';
import { getMediaUrls } from '@/lib/cloudinary';

import { videoAspect, videoPosterUrl } from './videoPoster';
import { claimSound, releaseSound, useAutoplayAllowed, useSoundOwner } from './videoSound';

const control =
  'inline-flex size-10 items-center justify-center rounded-full bg-night/70 text-snow backdrop-blur-sm transition-colors hover:bg-crimson-deep';

interface InlineVideoProps {
  video: VideoDto;
  /** Which width the poster is shown at. */
  sizes: string;
}

/**
 * A video that plays in place, in its own shape (as on the reference design). While at least
 * 60 % of it is on screen it plays muted and on a loop, unless the visitor prefers reduced
 * motion or saves data; then it shows its poster until played. "Sound on" gives it sound and pauses
 * the site's music and any other video's sound. Pausing stops it for good, until played again.
 */
export function InlineVideo({ video, sizes }: InlineVideoProps) {
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  /** The visitor pressed play or sound on. */
  const [started, setStarted] = useState(false);
  /** The visitor paused it: it doesn't start by itself again. */
  const [stopped, setStopped] = useState(false);
  const autoplay = useAutoplayAllowed();
  const soundOwner = useSoundOwner();
  const { state, pause: pauseAudio } = useAudioPlayer();
  const musicPlaying = state.status === 'playing' || state.status === 'loading';

  useEffect(() => {
    const node = box.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const hasSound = started && soundOwner === video.id && !musicPlaying;
  // Off screen, a muted video is unloaded; one with sound keeps playing.
  const showPlayer = !stopped && (hasSound || ((started || autoplay) && inView));

  function play() {
    setStopped(false);
    setStarted(true);
    claimSound(video.id);
    pauseAudio();
  }

  function stop() {
    setStopped(true);
    setStarted(false);
    releaseSound(video.id);
  }

  function toggleSound() {
    if (hasSound) {
      setStarted(false);
      releaseSound(video.id);
    } else {
      play();
    }
  }

  const aspect = videoAspect(video);

  return (
    <div
      ref={box}
      style={{ aspectRatio: String(aspect) }}
      className="group relative w-full overflow-hidden rounded-xl bg-night-raised"
    >
      {showPlayer ? (
        <>
          {video.source === 'youtube' ? (
            <YouTubePlayer key={hasSound ? 'sound' : 'muted'} video={video} muted={!hasSound} />
          ) : (
            <UploadedPlayer video={video} muted={!hasSound} />
          )}
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button
              type="button"
              aria-label={`Pause: ${video.title}`}
              onClick={stop}
              className={control}
            >
              <PauseIcon className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`${hasSound ? 'Turn sound off' : 'Turn sound on'}: ${video.title}`}
              onClick={toggleSound}
              className={control}
            >
              <VolumeIcon muted={!hasSound} className="size-4" />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          aria-label={`Play video: ${video.title}`}
          onClick={play}
          className="absolute inset-0 size-full"
        >
          <img
            src={videoPosterUrl(video, getMediaUrls(), 800)}
            srcSet={[480, 800, 1200]
              .map((width) => `${videoPosterUrl(video, getMediaUrls(), width)} ${String(width)}w`)
              .join(', ')}
            sizes={sizes}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-night/20 transition-colors duration-500 group-hover:bg-night/40">
            <span className="flex size-16 items-center justify-center rounded-full bg-crimson-deep text-snow shadow-lg transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none">
              <PlayIcon className="size-7 translate-x-0.5" />
            </span>
          </span>
          {video.duration !== undefined && (
            <span className="absolute right-3 bottom-3 rounded-full bg-night/80 px-2.5 py-0.5 text-xs text-snow tabular-nums">
              {formatDuration(video.duration)}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function YouTubePlayer({
  video,
  muted,
}: {
  video: Extract<VideoDto, { source: 'youtube' }>;
  muted: boolean;
}) {
  const id = encodeURIComponent(video.youtubeId);
  // Muted: a silent loop without YouTube's controls (ours sit on top). With sound: the full player.
  const params: Record<string, string> = muted
    ? { autoplay: '1', mute: '1', controls: '0', loop: '1', playlist: video.youtubeId }
    : { autoplay: '1', mute: '0', controls: '1' };
  const search = new URLSearchParams({ ...params, playsinline: '1', rel: '0' });
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?${search.toString()}`}
      title={`YouTube video: ${video.title}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className={`absolute inset-0 size-full border-0 ${muted ? 'pointer-events-none' : ''}`}
    />
  );
}

/**
 * Progressive MP4 from Cloudinary (plan §9.4): 720 px on phones, the 1280 px rendition otherwise.
 * `muted` is also set on the element itself, as React doesn't always update the property.
 */
function UploadedPlayer({
  video,
  muted,
}: {
  video: Extract<VideoDto, { source: 'cloudinary' }>;
  muted: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const urls = getMediaUrls();

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  return (
    // Caption files (uploaded VTT) are a planned enhancement (plan §18, §28). An empty <track>
    // would only pretend there are captions, so none is rendered until there are files to load.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      autoPlay
      loop
      muted={muted}
      playsInline
      preload="metadata"
      poster={videoPosterUrl(video, urls, 1280)}
      className="absolute inset-0 size-full object-cover"
    >
      <source
        media="(max-width: 767px)"
        src={urls.videoUrl(video.media, { width: 720 })}
        type="video/mp4"
      />
      <source src={urls.videoUrl(video.media)} type="video/mp4" />
    </video>
  );
}

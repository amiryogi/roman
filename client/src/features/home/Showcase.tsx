import { useEffect, useRef, useState } from 'react';

import type { VideoDto } from '@roman/shared';

import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { PlayIcon } from '@/features/audio/icons';
import { videoPosterUrl } from '@/features/videos/videoPoster';
import { REDUCED_MOTION_QUERY } from '@/hooks/useMediaQuery';
import { getMediaUrls } from '@/lib/cloudinary';

/**
 * - `poster`: an image and a play button; nothing from YouTube has loaded.
 * - `muted`: started by itself when scrolled into view, without sound.
 * - `sound`: started by the visitor, with sound (the site's music pauses).
 */
type Mode = 'poster' | 'muted' | 'sound';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The browser's data-saver setting (Network Information API, where it exists). */
function savingData(): boolean {
  if (!('connection' in navigator)) return false;
  const { connection } = navigator;
  return (
    typeof connection === 'object' &&
    connection !== null &&
    'saveData' in connection &&
    connection.saveData === true
  );
}

/**
 * "Songs I've played on": the videos the owner marked as showcase. The first one starts muted when
 * the player is half in view, as on the reference design, except for people who prefer reduced
 * motion or save data, or while the site's music is playing. Choosing a song plays it with sound.
 */
export function Showcase({ videos }: { videos: readonly VideoDto[] }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('poster');
  const panel = useRef<HTMLDivElement>(null);
  const { state, pause: pauseAudio } = useAudioPlayer();
  const musicPlaying = state.status === 'playing' || state.status === 'loading';

  useEffect(() => {
    const node = panel.current;
    if (mode !== 'poster' || musicPlaying || !node) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches || savingData()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMode('muted');
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [mode, musicPlaying]);

  const video = videos[Math.min(index, videos.length - 1)];
  if (!video) return null;

  function play(next: number) {
    setIndex(next);
    setMode('sound');
    pauseAudio();
  }

  const status = mode === 'poster' ? 'Song' : 'Now playing';

  return (
    <div className="flex flex-col gap-6">
      <div ref={panel} className="overflow-hidden showcase-frame">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <p className="flex items-center gap-3 label-caps text-crimson">
            {mode !== 'poster' && (
              <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
                <span className="eq-bar" />
                <span className="eq-bar [animation-delay:0.2s]" />
                <span className="eq-bar [animation-delay:0.4s]" />
                <span className="eq-bar [animation-delay:0.1s]" />
              </span>
            )}
            {status} · {pad(index + 1)} / {pad(videos.length)}
          </p>
          {video.source === 'youtube' && (
            <a
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-snow/15 px-4 text-sm text-fog transition-colors hover:border-crimson hover:text-snow"
            >
              <span aria-hidden="true" className="icon icon-youtube" />
              Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
        <div className="mx-2 aspect-video overflow-hidden rounded-xl bg-night sm:mx-3">
          {mode === 'poster' ? (
            <button
              type="button"
              aria-label={`Play video: ${video.title}`}
              onClick={() => {
                play(index);
              }}
              className="group relative size-full"
            >
              <img
                src={videoPosterUrl(video, getMediaUrls(), 1280)}
                alt=""
                loading="lazy"
                decoding="async"
                width={1280}
                height={720}
                className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-night/25">
                <span className="flex size-18 items-center justify-center rounded-full bg-crimson-deep text-snow shadow-lg transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                  <PlayIcon className="size-8 translate-x-0.5" />
                </span>
              </span>
            </button>
          ) : (
            <ShowcasePlayer
              key={`${video.id}-${mode}`}
              video={video}
              muted={mode === 'muted'}
              onSound={pauseAudio}
            />
          )}
        </div>
        <div className="flex flex-col gap-1 px-5 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
          <h3 className="font-display text-[1.75rem] leading-tight font-semibold">{video.title}</h3>
          {video.description && <p className="text-fog sm:text-right">{video.description}</p>}
        </div>
      </div>

      {videos.length > 1 && (
        <ul className="grid gap-4 md:grid-cols-3">
          {videos.map((item, position) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={position === index ? 'true' : undefined}
                onClick={() => {
                  play(position);
                }}
                className="group flex w-full items-center gap-4 rounded-xl border border-snow/10 bg-night-raised p-2.5 text-left transition-colors hover:border-crimson/60 aria-[current=true]:border-crimson/70"
              >
                <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-night">
                  <img
                    src={videoPosterUrl(item, getMediaUrls(), 480)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={480}
                    height={270}
                    className="size-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-9 items-center justify-center rounded-full bg-snow text-night group-aria-[current=true]:bg-crimson-deep group-aria-[current=true]:text-snow">
                      <PlayIcon className="size-4 translate-x-px" />
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block label-caps text-fog">{pad(position + 1)}</span>
                  <span className="mt-1 block truncate font-semibold">{item.title}</span>
                  {item.description && (
                    <span className="mt-0.5 block truncate text-sm text-fog">
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShowcasePlayer({
  video,
  muted,
  onSound,
}: {
  video: VideoDto;
  muted: boolean;
  onSound: () => void;
}) {
  if (video.source === 'youtube') {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: muted ? '1' : '0',
      playsinline: '1',
      rel: '0',
    });
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeId)}?${params.toString()}`}
        title={`YouTube video: ${video.title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    );
  }
  const urls = getMediaUrls();
  return (
    // Captions are a planned enhancement (plan §18, §28), as in the video gallery.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      controls
      autoPlay
      playsInline
      muted={muted}
      poster={videoPosterUrl(video, urls, 1280)}
      // Sound and site music never play together: unmuting pauses the music.
      onPlay={(event) => {
        if (!event.currentTarget.muted) onSound();
      }}
      onVolumeChange={(event) => {
        if (!event.currentTarget.muted && !event.currentTarget.paused) onSound();
      }}
      className="size-full"
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

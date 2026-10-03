import { useEffect, useId, useRef, useState } from 'react';

import type { VideoDto } from '@roman/shared';

import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { formatDuration } from '@/features/audio/duration';
import { CloseIcon, PlayIcon } from '@/features/audio/icons';
import { getMediaUrls } from '@/lib/cloudinary';
import { VIDEO_CATEGORY_LABELS } from '@/lib/labels';

import { videoPosterUrl } from './videoPoster';

/**
 * A grid of video cards and the player dialog they open (plan §12.6). Nothing from the video,
 * and no YouTube code, loads until a card is clicked; starting a video pauses the music.
 */
interface VideoGalleryProps {
  videos: VideoDto[];
  /** 2 directly under the page's <h1> (Videos page), 3 inside a titled section (Home). */
  headingLevel?: 2 | 3;
}

export function VideoGallery({ videos, headingLevel = 3 }: VideoGalleryProps) {
  const [selected, setSelected] = useState<VideoDto | null>(null);

  return (
    <>
      <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <li key={video.id}>
            <VideoCard
              video={video}
              headingLevel={headingLevel}
              onPlay={() => {
                setSelected(video);
              }}
            />
          </li>
        ))}
      </ul>
      {selected && (
        <VideoDialog
          video={selected}
          onClose={() => {
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

function VideoCard({
  video,
  headingLevel,
  onPlay,
}: {
  video: VideoDto;
  headingLevel: 2 | 3;
  onPlay: () => void;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const urls = getMediaUrls();
  const details = [
    VIDEO_CATEGORY_LABELS[video.category],
    video.venue,
    video.recordedAt?.slice(0, 4),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article aria-labelledby={`video-${video.id}`} className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play video: ${video.title}`}
        className="group relative aspect-video w-full overflow-hidden rounded-sm bg-ebony-raised"
      >
        <img
          src={videoPosterUrl(video, urls, 800)}
          srcSet={[480, 800, 1200]
            .map((width) => `${videoPosterUrl(video, urls, width)} ${String(width)}w`)
            .join(', ')}
          sizes="(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 100vw"
          alt=""
          loading="lazy"
          decoding="async"
          width={800}
          height={450}
          className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] motion-reduce:transition-none"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-ebony/20 transition-colors duration-500 group-hover:bg-ebony/40">
          <span className="flex size-16 items-center justify-center rounded-full bg-varnish text-ebony shadow-lg ring-0 ring-varnish/40 transition-[scale,box-shadow] duration-500 group-hover:scale-110 group-hover:ring-8 motion-reduce:transition-none">
            <PlayIcon className="size-7 translate-x-0.5" />
          </span>
        </span>
        {video.duration !== undefined && (
          <span className="absolute right-3 bottom-3 rounded-sm bg-ebony/80 px-2 py-0.5 text-xs text-ivory tabular-nums">
            {formatDuration(video.duration)}
          </span>
        )}
      </button>
      <div>
        <Heading id={`video-${video.id}`} className="text-lg font-medium">
          {video.title}
        </Heading>
        {details && <p className="mt-1 text-sm text-(--muted)">{details}</p>}
      </div>
    </article>
  );
}

/** Modal player. Closing it removes the player, which stops playback. */
function VideoDialog({ video, onClose }: { video: VideoDto; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { pause: pauseAudio } = useAudioPlayer();

  useEffect(() => {
    ref.current?.showModal();
    // A YouTube video starts by itself once opened; the music must not play over it.
    if (video.source === 'youtube') pauseAudio();
  }, [video, pauseAudio]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(72rem,calc(100%-2rem))] max-w-none overflow-visible bg-transparent p-0 text-ivory backdrop:bg-ebony/90"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id={titleId} className="truncate text-lg font-medium">
          {video.title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close video"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:text-varnish"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-sm bg-ebony">
        {video.source === 'cloudinary' ? (
          <CloudinaryVideo video={video} onPlay={pauseAudio} />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeId)}?autoplay=1&rel=0`}
            title={`YouTube video: ${video.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full border-0"
          />
        )}
      </div>
      {video.description && (
        <p className="mt-4 max-w-3xl leading-relaxed text-mist">{video.description}</p>
      )}
    </dialog>
  );
}

/**
 * Progressive MP4 from Cloudinary (plan §9.4): 720 px on phones, the 1280 px rendition prepared at
 * upload otherwise. It starts because the visitor just clicked play; native controls stay.
 */
function CloudinaryVideo({
  video,
  onPlay,
}: {
  video: Extract<VideoDto, { source: 'cloudinary' }>;
  onPlay: () => void;
}) {
  const urls = getMediaUrls();
  return (
    // Caption files (uploaded VTT) are a planned enhancement (plan §18, §28). An empty <track>
    // would only pretend there are captions, so none is rendered until there are files to load.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      controls
      autoPlay
      playsInline
      preload="none"
      poster={videoPosterUrl(video, urls, 1280)}
      onPlay={onPlay}
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

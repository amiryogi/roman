import type { VideoDto } from '@roman/shared';

import { VIDEO_CATEGORY_LABELS } from '@/lib/labels';

import { InlineVideo } from './InlineVideo';
import { videoAspect } from './videoPoster';

/** Width (rem) a card would have at the row's natural height, per unit of aspect ratio. */
const ROW_HEIGHT_REM = 17;

interface VideoGalleryProps {
  videos: VideoDto[];
  /** 2 directly under the page's <h1> (Videos page), 3 inside a titled section (Home). */
  headingLevel?: 2 | 3;
}

/**
 * Videos in justified rows (plan §12.6, 2026-10 revamp): each card keeps its video's shape and
 * grows in proportion to it, so cards in a row share one height and fill the width, and a wide
 * video covers more of the page than a vertical clip. The last row doesn't stretch (`after:`
 * spacer). Each card plays in place (`InlineVideo`).
 */
export function VideoGallery({ videos, headingLevel = 3 }: VideoGalleryProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-12 after:grow-10 after:content-['']">
      {videos.map((video) => {
        const aspect = videoAspect(video);
        const details = [
          VIDEO_CATEGORY_LABELS[video.category],
          video.venue,
          video.recordedAt?.slice(0, 4),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li
            key={video.id}
            style={{ flexGrow: aspect, flexBasis: `${String(aspect * ROW_HEIGHT_REM)}rem` }}
            className="min-w-0"
          >
            <article aria-labelledby={`video-${video.id}`} className="flex flex-col gap-4">
              <InlineVideo
                video={video}
                sizes={
                  aspect >= 1 ? '(min-width: 1024px) 45vw, 100vw' : '(min-width: 640px) 25vw, 50vw'
                }
              />
              <div>
                <Heading id={`video-${video.id}`} className="text-lg font-semibold">
                  {video.title}
                </Heading>
                {details && <p className="mt-1 text-sm text-(--muted)">{details}</p>}
                {video.description && (
                  <p className="mt-2 line-clamp-2 leading-relaxed text-(--muted)">
                    {video.description}
                  </p>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

import type { TrackDto } from '@roman/shared';

import { getMediaUrls } from '@/lib/cloudinary';

interface TrackArtworkProps {
  track: TrackDto;
  /** Rendered size in CSS pixels; the image is requested at twice that for sharp screens. */
  size: number;
  className?: string;
}

/**
 * Square artwork: the track's cover, else its album's, else a quiet string motif.
 * Decorative (the title is always next to it), so alt is empty.
 */
export function TrackArtwork({ track, size, className = '' }: TrackArtworkProps) {
  const cover = track.cover ?? track.album?.cover;
  const box = `shrink-0 overflow-hidden rounded-sm ${className}`;

  if (!cover) {
    return (
      <span
        aria-hidden="true"
        className={`${box} flex items-center justify-center bg-ebony-raised text-varnish`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" className="w-1/2" fill="none" stroke="currentColor">
          {[7, 10.5, 13.5, 17].map((x) => (
            <line key={x} x1={x} x2={x} y1="3" y2="21" strokeWidth="0.8" />
          ))}
        </svg>
      </span>
    );
  }

  const urls = getMediaUrls();
  return (
    <img
      src={urls.imageUrl(cover.asset, { crop: 'fill', width: size * 2, height: size * 2 })}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`${box} object-cover`}
      style={cover.asset.dominantColor ? { backgroundColor: cover.asset.dominantColor } : undefined}
    />
  );
}

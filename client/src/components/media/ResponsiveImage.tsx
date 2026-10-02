import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import type { MediaAssetDto } from '@roman/shared';

import { getMediaUrls, type MediaUrls, type SrcSetOptions } from '@/lib/cloudinary';

type ImgProps = Omit<
  ComponentPropsWithoutRef<'img'>,
  'src' | 'srcSet' | 'sizes' | 'width' | 'height' | 'alt' | 'loading' | 'decoding'
>;

export interface ResponsiveImageProps extends ImgProps {
  asset: MediaAssetDto;
  /** Required: describe the image, or "" if it is purely decorative. */
  alt: string;
  /** Which width the image is shown at, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  /** width ÷ height to crop to. Omit to keep the natural shape (never crops baked-in text). */
  aspect?: number;
  gravity?: SrcSetOptions['gravity'];
  /** The page's main image (LCP): loads eagerly with high priority. */
  priority?: boolean;
  /** Defaults to the site's Cloudinary account. */
  urls?: MediaUrls;
}

/** Fallback `src` for browsers without srcset support; srcset does the real work. */
const FALLBACK_WIDTH = 1024;

/**
 * Cloudinary image with a srcset, explicit dimensions (no layout shift) and the dominant colour as
 * a placeholder background (plan §9.3, §12.6).
 */
export function ResponsiveImage({
  asset,
  alt,
  sizes,
  aspect,
  gravity,
  priority = false,
  urls = getMediaUrls(),
  style,
  ...imgProps
}: ResponsiveImageProps) {
  const naturalWidth = asset.width ?? FALLBACK_WIDTH;
  const naturalHeight = asset.height ?? Math.round(naturalWidth / (aspect ?? 1.5));
  const width =
    aspect === undefined
      ? naturalWidth
      : Math.round(Math.min(naturalWidth, naturalHeight * aspect));
  const height = aspect === undefined ? naturalHeight : Math.round(width / aspect);
  const fallbackWidth = Math.min(width, FALLBACK_WIDTH);

  const src =
    aspect === undefined
      ? urls.imageUrl(asset, { crop: 'limit', width: fallbackWidth })
      : urls.imageUrl(asset, {
          crop: 'fill',
          width: fallbackWidth,
          height: fallbackWidth / aspect,
          gravity,
        });

  const placeholder: CSSProperties = asset.dominantColor
    ? { backgroundColor: asset.dominantColor }
    : {};

  return (
    <img
      {...imgProps}
      src={src}
      srcSet={urls.imageSrcSet(asset, { aspect, gravity })}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      style={{ ...placeholder, ...style }}
    />
  );
}

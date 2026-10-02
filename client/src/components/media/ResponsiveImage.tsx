import type { ComponentPropsWithoutRef } from 'react';

import type { MediaAssetDto } from '@roman/shared';

import { getMediaUrls, type MediaUrls } from '@/lib/cloudinary';

import { imageAttributes, placeholderStyle, type ImageCrop } from './imageAttributes';

type ImgProps = Omit<
  ComponentPropsWithoutRef<'img'>,
  'src' | 'srcSet' | 'sizes' | 'width' | 'height' | 'alt' | 'loading' | 'decoding'
>;

export interface ResponsiveImageProps extends ImgProps, ImageCrop {
  asset: MediaAssetDto;
  /** Required: describe the image, or "" if it is purely decorative. */
  alt: string;
  /** Which width the image is shown at, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  /** The page's main image (LCP): loads eagerly with high priority. */
  priority?: boolean;
  /** Defaults to the site's Cloudinary account. */
  urls?: MediaUrls;
}

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
  const attributes = imageAttributes(urls, asset, { aspect, gravity });

  return (
    <img
      {...imgProps}
      {...attributes}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      style={{ ...placeholderStyle(asset), ...style }}
    />
  );
}

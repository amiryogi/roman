import type { MediaAssetDto } from '@roman/shared';

import type { MediaUrls, SrcSetOptions } from '../../lib/mediaUrls';

/** Fallback `src` width for browsers without srcset support; srcset does the real work. */
const FALLBACK_WIDTH = 1024;

export interface ImageCrop {
  /** width ÷ height to crop to. Omit to keep the natural shape (never crops baked-in text). */
  aspect?: number;
  gravity?: SrcSetOptions['gravity'];
}

/** src, srcset and the intrinsic size (prevents layout shift) for one Cloudinary image. */
export function imageAttributes(
  urls: MediaUrls,
  asset: MediaAssetDto,
  { aspect, gravity }: ImageCrop = {},
): { src: string; srcSet: string; width: number; height: number } {
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

  return { src, srcSet: urls.imageSrcSet(asset, { aspect, gravity }), width, height };
}

export function placeholderStyle(asset: MediaAssetDto): { backgroundColor?: string } {
  return asset.dominantColor ? { backgroundColor: asset.dominantColor } : {};
}

/**
 * Removes the placeholder colour once the image has loaded, so it can't show through transparent
 * areas of PNG or WebP images.
 */
export function clearPlaceholder(event: { currentTarget: HTMLImageElement }): void {
  event.currentTarget.style.removeProperty('background-color');
}

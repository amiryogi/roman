import type { MediaAssetDto } from '@roman/shared';
import {
  AUDIO_STREAM_FORMAT,
  AUDIO_STREAM_TRANSFORMATION,
  MEDIA_DELIVERY_TYPE,
  VIDEO_STANDARD_FORMAT,
  VIDEO_STANDARD_TRANSFORMATION,
} from '@roman/shared/lite';

// No app imports here: the build-time SEO script (scripts/postbuild-seo.ts) uses these builders
// in Node, where Vite's `import.meta.env` doesn't exist.

/**
 * Typed Cloudinary delivery URLs (plan §9.6). URLs are derived from publicId + version, never
 * stored, and there is no SDK in the bundle. Option types only allow valid combinations:
 * gravity exists only for `fill`, which also needs both dimensions.
 */

export type MediaAsset = Pick<MediaAssetDto, 'publicId' | 'version'> &
  Partial<Pick<MediaAssetDto, 'width' | 'height'>>;

type Quality = 'auto' | 'auto:good' | 'auto:eco' | 'auto:low';

interface DeliveryOptions {
  /** Default "auto": AVIF/WebP where the browser supports them. JPG for social previews. */
  format?: 'auto' | 'jpg';
  quality?: Quality;
}

/** Scale down to fit within the box, keeping the aspect ratio. Never crops (baked-in text). */
interface LimitCrop extends DeliveryOptions {
  crop: 'limit';
  width?: number;
  height?: number;
}

/** Fill an exact box, cropping around the subject. */
interface FillCrop extends DeliveryOptions {
  crop: 'fill';
  width: number;
  height: number;
  gravity?: 'auto' | 'face' | 'center';
}

export type ImageOptions = LimitCrop | FillCrop;

/** srcset candidates (plan §9.3). Never larger than the original. */
export const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600, 1920, 2400] as const;

export interface SrcSetOptions extends DeliveryOptions {
  /** width ÷ height. With an aspect the image is cropped to it (`fill`), otherwise `limit`. */
  aspect?: number;
  gravity?: FillCrop['gravity'];
  widths?: readonly number[];
}

export interface MediaUrls {
  imageUrl(asset: MediaAsset, options: ImageOptions): string;
  imageSrcSet(asset: MediaAsset, options?: SrcSetOptions): string;
  /** Tiny blurred placeholder, about 300 bytes. */
  lqipUrl(asset: MediaAsset): string;
  /** 1200×630 JPG for Open Graph; social scrapers don't reliably accept AVIF. */
  ogImageUrl(asset: MediaAsset): string;
  /** Progressive MP4. 1280 is the rendition created at upload; 720 suits phones. */
  videoUrl(asset: MediaAsset, options?: { width?: 1280 | 720 }): string;
  /** A frame of the video as an image. `offset` "auto" lets Cloudinary pick a representative one. */
  videoPosterUrl(asset: MediaAsset, options?: { width?: number; offset?: 'auto' | number }): string;
  /** MP3 stream (160 kbps) of an audio asset. */
  audioUrl(asset: MediaAsset): string;
}

function int(value: number): string {
  return String(Math.round(value));
}

function delivery(options: DeliveryOptions): string[] {
  return [`f_${options.format ?? 'auto'}`, `q_${options.quality ?? 'auto'}`];
}

export function imageTransformation(options: ImageOptions): string {
  const parts: string[] = [`c_${options.crop}`];
  if (options.crop === 'fill') {
    parts.push(
      `g_${options.gravity ?? 'auto'}`,
      `w_${int(options.width)}`,
      `h_${int(options.height)}`,
    );
  } else {
    if (options.width !== undefined) parts.push(`w_${int(options.width)}`);
    if (options.height !== undefined) parts.push(`h_${int(options.height)}`);
  }
  return [...parts, ...delivery(options)].join(',');
}

/** Widths for a srcset: the candidates up to `maxWidth`, plus `maxWidth` itself if it falls between. */
export function responsiveWidths(
  maxWidth: number | undefined,
  widths: readonly number[] = RESPONSIVE_WIDTHS,
): number[] {
  if (maxWidth === undefined) return [...widths];
  const fitting = widths.filter((width) => width <= maxWidth);
  const largest = fitting.at(-1);
  if (largest === undefined || (largest < maxWidth && maxWidth < (widths.at(-1) ?? 0))) {
    fitting.push(Math.floor(maxWidth));
  }
  return fitting;
}

export function youtubeThumbnailUrl(
  youtubeId: string,
  quality: 'hqdefault' | 'maxresdefault' = 'hqdefault',
): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/${quality}.jpg`;
}

export function createMediaUrls(cloudName: string): MediaUrls {
  const base = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}`;

  function url(
    resourceType: 'image' | 'video',
    transformation: string,
    asset: MediaAsset,
    extension = '',
  ): string {
    const publicId = asset.publicId.split('/').map(encodeURIComponent).join('/');
    const version = `v${String(asset.version)}`;
    return `${base}/${resourceType}/${MEDIA_DELIVERY_TYPE}/${transformation}/${version}/${publicId}${extension}`;
  }

  const imageUrl: MediaUrls['imageUrl'] = (asset, options) =>
    url('image', imageTransformation(options), asset);

  return {
    imageUrl,

    imageSrcSet(asset, options = {}) {
      const { aspect, gravity, widths, ...deliveryOptions } = options;
      // A cropped image can't be wider than the original allows at that aspect ratio.
      const maxWidth =
        aspect !== undefined && asset.width !== undefined && asset.height !== undefined
          ? Math.min(asset.width, asset.height * aspect)
          : asset.width;
      return responsiveWidths(maxWidth, widths)
        .map((width) => {
          const transform: ImageOptions =
            aspect === undefined
              ? { crop: 'limit', width, ...deliveryOptions }
              : { crop: 'fill', width, height: width / aspect, gravity, ...deliveryOptions };
          return `${imageUrl(asset, transform)} ${String(width)}w`;
        })
        .join(', ');
    },

    lqipUrl: (asset) => url('image', 'w_32,e_blur:1000,q_1,f_auto', asset),

    ogImageUrl: (asset) =>
      imageUrl(asset, { crop: 'fill', width: 1200, height: 630, gravity: 'auto', format: 'jpg' }),

    videoUrl(asset, { width = 1280 } = {}) {
      const transformation =
        width === 1280
          ? VIDEO_STANDARD_TRANSFORMATION
          : `c_limit,w_${String(width)},q_auto,vc_auto`;
      return url('video', transformation, asset, `.${VIDEO_STANDARD_FORMAT}`);
    },

    videoPosterUrl(asset, { width = 1280, offset = 'auto' } = {}) {
      const transformation = `so_${String(offset)},c_limit,w_${int(width)},f_auto,q_auto`;
      return url('video', transformation, asset, '.jpg');
    },

    audioUrl: (asset) =>
      url('video', AUDIO_STREAM_TRANSFORMATION, asset, `.${AUDIO_STREAM_FORMAT}`),
  };
}

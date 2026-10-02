import type { ImageDto } from '@roman/shared';

import { getMediaUrls, type MediaUrls } from '@/lib/cloudinary';

import { imageAttributes, placeholderStyle } from './imageAttributes';

/** Below this width the mobile image is used (Tailwind's `md` breakpoint). */
export const HERO_MOBILE_QUERY = '(max-width: 767px)';

interface HeroPictureProps {
  desktop: ImageDto;
  mobile?: ImageDto;
  className?: string;
  urls?: MediaUrls;
}

/**
 * The page's main image (LCP): art-directed with <picture> (plan §7.3), loaded eagerly at high
 * priority. Both images keep their natural shape (`c_limit`), so a wordmark baked into the photo
 * is never cropped (plan §0.4).
 */
export function HeroPicture({
  desktop,
  mobile,
  className,
  urls = getMediaUrls(),
}: HeroPictureProps) {
  const main = imageAttributes(urls, desktop.asset);
  const small = mobile ? imageAttributes(urls, mobile.asset) : undefined;

  return (
    <picture>
      {small && (
        <source
          media={HERO_MOBILE_QUERY}
          srcSet={small.srcSet}
          sizes="100vw"
          width={small.width}
          height={small.height}
        />
      )}
      <img
        src={main.src}
        srcSet={main.srcSet}
        sizes="100vw"
        width={main.width}
        height={main.height}
        alt={desktop.alt}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className={className}
        style={placeholderStyle(desktop.asset)}
      />
    </picture>
  );
}

import type { ImageDto } from '@roman/shared';

import { getMediaUrls, type MediaUrls } from '@/lib/cloudinary';

import { HERO_DESKTOP_CROP, HERO_MOBILE_CROP, HERO_MOBILE_QUERY, HERO_SIZES } from './hero';
import { clearPlaceholder, imageAttributes, placeholderStyle } from './imageAttributes';

interface HeroPictureProps {
  desktop: ImageDto;
  mobile?: ImageDto;
  className?: string;
  urls?: MediaUrls;
  /** Called once the photo has loaded, or failed to: the hero starts its entrance then. */
  onReady?: () => void;
}

/**
 * The page's main image (LCP): art-directed with <picture> (plan §7.3), loaded eagerly at high
 * priority. Phones get a tall crop (of the mobile image if there is one, otherwise of the same
 * photo), wider screens a landscape one; see `hero.ts`.
 */
export function HeroPicture({
  desktop,
  mobile,
  className,
  urls = getMediaUrls(),
  onReady,
}: HeroPictureProps) {
  const main = imageAttributes(urls, desktop.asset, HERO_DESKTOP_CROP);
  const small = imageAttributes(urls, (mobile ?? desktop).asset, HERO_MOBILE_CROP);

  return (
    <picture>
      <source
        media={HERO_MOBILE_QUERY}
        srcSet={small.srcSet}
        sizes={HERO_SIZES}
        width={small.width}
        height={small.height}
      />
      <img
        src={main.src}
        srcSet={main.srcSet}
        sizes={HERO_SIZES}
        width={main.width}
        height={main.height}
        alt={desktop.alt}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className={className}
        style={placeholderStyle(desktop.asset)}
        onLoad={(event) => {
          clearPlaceholder(event);
          onReady?.();
        }}
        onError={onReady}
      />
    </picture>
  );
}

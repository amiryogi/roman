import { getMediaUrls } from '@/lib/cloudinary';
import { env } from '@/lib/env';

import type { SeoContext } from './structuredData';

/** The site's URL and media URL builders, for structured data rendered in the browser. */
export function seoContext(): SeoContext {
  return { siteUrl: env.siteUrl, urls: getMediaUrls() };
}

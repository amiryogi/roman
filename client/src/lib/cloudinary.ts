import { env } from '@/lib/env';

import { createMediaUrls, type MediaUrls } from './mediaUrls';

export * from './mediaUrls';

let siteMediaUrls: MediaUrls | undefined;

/** URL builders for the site's Cloudinary account (VITE_CLOUDINARY_CLOUD_NAME). */
export function getMediaUrls(): MediaUrls {
  if (!env.cloudinaryCloudName) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME is not set, so media URLs cannot be built.');
  }
  siteMediaUrls ??= createMediaUrls(env.cloudinaryCloudName);
  return siteMediaUrls;
}

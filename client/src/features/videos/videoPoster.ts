import type { VideoDto } from '@roman/shared';

import { youtubeThumbnailUrl, type MediaUrls } from '@/lib/cloudinary';

/**
 * Poster image for a video (plan §9.4): the custom poster if uploaded, otherwise a frame Cloudinary
 * picks from the video, or YouTube's own thumbnail.
 */
export function videoPosterUrl(video: VideoDto, urls: MediaUrls, width: number): string {
  if (video.poster) {
    return urls.imageUrl(video.poster.asset, {
      crop: 'fill',
      width,
      height: Math.round((width * 9) / 16),
    });
  }
  if (video.source === 'cloudinary') return urls.videoPosterUrl(video.media, { width });
  return youtubeThumbnailUrl(video.youtubeId);
}

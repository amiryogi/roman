import type { VideoDto } from '@roman/shared';

import { youtubeThumbnailUrl, type MediaUrls } from '@/lib/cloudinary';

/**
 * The video's shape (width ÷ height): an uploaded file's own, so vertical clips stay tall.
 * YouTube doesn't tell us, so YouTube videos are taken as 16:9.
 */
export function videoAspect(video: VideoDto): number {
  if (video.source === 'cloudinary' && video.media.width && video.media.height) {
    return video.media.width / video.media.height;
  }
  return 16 / 9;
}

/**
 * Poster image for a video (plan §9.4): the custom poster if uploaded (cropped to the video's
 * shape), otherwise a frame Cloudinary picks from the video, or YouTube's own thumbnail.
 */
export function videoPosterUrl(video: VideoDto, urls: MediaUrls, width: number): string {
  if (video.poster) {
    return urls.imageUrl(video.poster.asset, {
      crop: 'fill',
      width,
      height: Math.round(width / videoAspect(video)),
    });
  }
  if (video.source === 'cloudinary') return urls.videoPosterUrl(video.media, { width });
  return youtubeThumbnailUrl(video.youtubeId);
}

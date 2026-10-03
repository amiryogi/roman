// Plain values with no Zod dependency, so the public site can import them without loading the
// validation library up front (`@roman/shared/lite`, plan §16). The schemas build on these.

export const PUBLICATION_STATUSES = ['draft', 'published'] as const;

export const MEDIA_RESOURCE_TYPES = ['image', 'video'] as const;

export const UPLOAD_KINDS = [
  'profile',
  'gallery',
  'track-audio',
  'track-cover',
  'album-cover',
  'video',
  'video-poster',
  'event',
] as const;

export const VIDEO_SOURCES = ['cloudinary', 'youtube'] as const;

// Activity types listed in the CV; categories, not claims.
export const VIDEO_CATEGORIES = [
  'performance',
  'orchestra',
  'studio',
  'wedding-event',
  'teaching',
  'other',
] as const;

export const GALLERY_CATEGORIES = [
  'performance',
  'portrait',
  'event',
  'behind-the-scenes',
] as const;

export const EVENT_STATUSES = ['scheduled', 'postponed', 'cancelled'] as const;

export const EVENT_TIMEFRAMES = ['upcoming', 'past'] as const;

export const INQUIRY_TYPES = ['booking', 'lessons', 'collaboration', 'general'] as const;

export const BOOKING_EVENT_TYPES = [
  'wedding',
  'concert',
  'corporate',
  'private-event',
  'studio-recording',
  'other',
] as const;

export const INQUIRY_STATUSES = ['new', 'read', 'replied', 'archived'] as const;

export const SOCIAL_PLATFORMS = [
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'spotify',
  'other',
] as const;

export const EXPERIENCE_CATEGORIES = ['teaching', 'performance', 'other'] as const;

/**
 * Cloudinary delivery type for every asset. "private" means the untransformed original (which
 * may contain camera and GPS metadata) needs a signed URL, while transformed versions, the only
 * URLs the site builds, stay public. Transformations strip that metadata.
 */
export const MEDIA_DELIVERY_TYPE = 'private';

/**
 * Standard video rendition. The server requests it as an eager transformation at upload time and
 * the client delivers exactly this, so the first viewer never waits for a transcode (plan §9.4).
 */
export const VIDEO_STANDARD_TRANSFORMATION = 'c_limit,w_1280,q_auto,vc_auto';
export const VIDEO_STANDARD_FORMAT = 'mp4';

/** Streaming audio: MP3 at 160 kbps (Cloudinary `ac_mp3,br_160k`, delivered as .mp3; plan §9.5). */
export const AUDIO_STREAM_TRANSFORMATION = 'ac_mp3,br_160k';
export const AUDIO_STREAM_FORMAT = 'mp3';

/** Type guard for the value lists above, e.g. a `?category=` search parameter. */
export function isOneOf<const T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.some((item) => item === value);
}

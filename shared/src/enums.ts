import { z } from 'zod';

export const PUBLICATION_STATUSES = ['draft', 'published'] as const;
export const publicationStatusSchema = z.enum(PUBLICATION_STATUSES);
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

export const MEDIA_RESOURCE_TYPES = ['image', 'video'] as const;
export const mediaResourceTypeSchema = z.enum(MEDIA_RESOURCE_TYPES);
export type MediaResourceType = z.infer<typeof mediaResourceTypeSchema>;

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
export const uploadKindSchema = z.enum(UPLOAD_KINDS);
export type UploadKind = z.infer<typeof uploadKindSchema>;

export const VIDEO_SOURCES = ['cloudinary', 'youtube'] as const;
export const videoSourceSchema = z.enum(VIDEO_SOURCES);
export type VideoSource = z.infer<typeof videoSourceSchema>;

// Activity types listed in the CV; categories, not claims.
export const VIDEO_CATEGORIES = [
  'performance',
  'orchestra',
  'studio',
  'wedding-event',
  'teaching',
  'other',
] as const;
export const videoCategorySchema = z.enum(VIDEO_CATEGORIES);
export type VideoCategory = z.infer<typeof videoCategorySchema>;

export const GALLERY_CATEGORIES = [
  'performance',
  'portrait',
  'event',
  'behind-the-scenes',
] as const;
export const galleryCategorySchema = z.enum(GALLERY_CATEGORIES);
export type GalleryCategory = z.infer<typeof galleryCategorySchema>;

export const EVENT_STATUSES = ['scheduled', 'postponed', 'cancelled'] as const;
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const EVENT_TIMEFRAMES = ['upcoming', 'past'] as const;
export const eventTimeframeSchema = z.enum(EVENT_TIMEFRAMES);
export type EventTimeframe = z.infer<typeof eventTimeframeSchema>;

export const INQUIRY_TYPES = ['booking', 'lessons', 'collaboration', 'general'] as const;
export const inquiryTypeSchema = z.enum(INQUIRY_TYPES);
export type InquiryType = z.infer<typeof inquiryTypeSchema>;

export const BOOKING_EVENT_TYPES = [
  'wedding',
  'concert',
  'corporate',
  'private-event',
  'studio-recording',
  'other',
] as const;
export const bookingEventTypeSchema = z.enum(BOOKING_EVENT_TYPES);
export type BookingEventType = z.infer<typeof bookingEventTypeSchema>;

export const INQUIRY_STATUSES = ['new', 'read', 'replied', 'archived'] as const;
export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const SOCIAL_PLATFORMS = [
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'spotify',
  'other',
] as const;
export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

export const EXPERIENCE_CATEGORIES = ['teaching', 'performance', 'other'] as const;
export const experienceCategorySchema = z.enum(EXPERIENCE_CATEGORIES);
export type ExperienceCategory = z.infer<typeof experienceCategorySchema>;

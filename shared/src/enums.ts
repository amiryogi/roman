import { z } from 'zod';

import {
  PUBLICATION_STATUSES,
  MEDIA_RESOURCE_TYPES,
  UPLOAD_KINDS,
  VIDEO_SOURCES,
  VIDEO_CATEGORIES,
  GALLERY_CATEGORIES,
  EVENT_STATUSES,
  EVENT_TIMEFRAMES,
  INQUIRY_TYPES,
  BOOKING_EVENT_TYPES,
  INQUIRY_STATUSES,
  SOCIAL_PLATFORMS,
  EXPERIENCE_CATEGORIES,
} from './constants.js';

export const publicationStatusSchema = z.enum(PUBLICATION_STATUSES);
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

export const mediaResourceTypeSchema = z.enum(MEDIA_RESOURCE_TYPES);
export type MediaResourceType = z.infer<typeof mediaResourceTypeSchema>;

export const uploadKindSchema = z.enum(UPLOAD_KINDS);
export type UploadKind = z.infer<typeof uploadKindSchema>;

export const videoSourceSchema = z.enum(VIDEO_SOURCES);
export type VideoSource = z.infer<typeof videoSourceSchema>;

export const videoCategorySchema = z.enum(VIDEO_CATEGORIES);
export type VideoCategory = z.infer<typeof videoCategorySchema>;

export const galleryCategorySchema = z.enum(GALLERY_CATEGORIES);
export type GalleryCategory = z.infer<typeof galleryCategorySchema>;

export const eventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const eventTimeframeSchema = z.enum(EVENT_TIMEFRAMES);
export type EventTimeframe = z.infer<typeof eventTimeframeSchema>;

export const inquiryTypeSchema = z.enum(INQUIRY_TYPES);
export type InquiryType = z.infer<typeof inquiryTypeSchema>;

export const bookingEventTypeSchema = z.enum(BOOKING_EVENT_TYPES);
export type BookingEventType = z.infer<typeof bookingEventTypeSchema>;

export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

export const experienceCategorySchema = z.enum(EXPERIENCE_CATEGORIES);
export type ExperienceCategory = z.infer<typeof experienceCategorySchema>;

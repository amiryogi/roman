import type {
  BookingEventType,
  ExperienceCategory,
  GalleryCategory,
  InquiryStatus,
  InquiryType,
  SocialPlatform,
  VideoCategory,
} from '@roman/shared';

// Display names for categories. They describe kinds of work listed in the CV, not claims.

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  performance: 'Performances',
  orchestra: 'Orchestra',
  studio: 'Studio',
  'wedding-event': 'Weddings & events',
  teaching: 'Teaching',
  other: 'Other',
};

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  performance: 'Performance',
  portrait: 'Portraits',
  event: 'Events',
  'behind-the-scenes': 'Behind the scenes',
};

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  booking: 'Booking a performance',
  lessons: 'Violin lessons',
  collaboration: 'Collaboration or recording',
  general: 'General question',
};

export const BOOKING_EVENT_TYPE_LABELS: Record<BookingEventType, string> = {
  wedding: 'Wedding',
  concert: 'Concert',
  corporate: 'Corporate event',
  'private-event': 'Private event',
  'studio-recording': 'Studio recording',
  other: 'Other',
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  read: 'Read',
  replied: 'Replied',
  archived: 'Archived',
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  spotify: 'Spotify',
  other: 'Other',
};

export const EXPERIENCE_CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  teaching: 'Teaching',
  performance: 'Performance',
  other: 'Other',
};

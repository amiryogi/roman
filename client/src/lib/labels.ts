import type { GalleryCategory, VideoCategory } from '@roman/shared';

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

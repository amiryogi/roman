import { z } from 'zod';

import { eventDtoSchema } from './event.js';
import { galleryImageDtoSchema } from './gallery.js';
import { profileSummaryDtoSchema } from './profile.js';
import { trackDtoSchema } from './track.js';
import { videoDtoSchema } from './video.js';

export const HOME_LIMITS = {
  featuredTracks: 4,
  featuredVideos: 3,
  featuredImages: 8,
  upcomingEvents: 3,
} as const;

/** `GET /api/home`: everything the home page needs in one request. */
export const homeDtoSchema = z.strictObject({
  profile: profileSummaryDtoSchema,
  featuredTracks: z.array(trackDtoSchema),
  featuredVideos: z.array(videoDtoSchema),
  featuredImages: z.array(galleryImageDtoSchema),
  upcomingEvents: z.array(eventDtoSchema),
});
export type HomeDto = z.infer<typeof homeDtoSchema>;

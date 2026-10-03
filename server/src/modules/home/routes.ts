import { Router } from 'express';

import { HOME_LIMITS, type HomeDto } from '@roman/shared';

import { sendData } from '../../lib/respond.js';
import { toProfileSummaryDto } from '../profile/mapper.js';
import { getProfileDoc } from '../profile/service.js';
import { listFeaturedTracks } from '../tracks/service.js';

/**
 * `GET /api/home`: everything the home page needs in one request (plan §10.2).
 * Sections not built yet stay empty until their phases add them (videos and gallery: 7,
 * events: 8); the home page hides empty sections.
 */
export function createHomeRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const [profile, featuredTracks] = await Promise.all([
      getProfileDoc(),
      listFeaturedTracks(HOME_LIMITS.featuredTracks),
    ]);
    const data: HomeDto = {
      profile: toProfileSummaryDto(profile),
      featuredTracks,
      featuredVideos: [],
      featuredImages: [],
      upcomingEvents: [],
    };
    sendData(res, data);
  });

  return router;
}

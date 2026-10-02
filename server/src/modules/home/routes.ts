import { Router } from 'express';

import type { HomeDto } from '@roman/shared';

import { sendData } from '../../lib/respond.js';
import { toProfileSummaryDto } from '../profile/mapper.js';
import { getProfileDoc } from '../profile/service.js';

/**
 * `GET /api/home`: everything the home page needs in one request (plan §10.2).
 * The featured sections stay empty until their phases add them (tracks: 6, videos and
 * gallery: 7, events: 8); the home page hides empty sections.
 */
export function createHomeRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const data: HomeDto = {
      profile: toProfileSummaryDto(await getProfileDoc()),
      featuredTracks: [],
      featuredVideos: [],
      featuredImages: [],
      upcomingEvents: [],
    };
    sendData(res, data);
  });

  return router;
}

import { Router } from 'express';

import { HOME_LIMITS, type HomeDto } from '@roman/shared';

import { sendData } from '../../lib/respond.js';
import { toProfileSummaryDto } from '../profile/mapper.js';
import { getProfileDoc } from '../profile/service.js';
import { listUpcomingEvents } from '../events/service.js';
import { listFeaturedImages } from '../gallery/service.js';
import { listFeaturedTracks } from '../tracks/service.js';
import { countPublishedSheetMusic } from '../sheetMusic/service.js';
import { listFeaturedVideos, listShowcaseVideos } from '../videos/service.js';

/**
 * `GET /api/home`: everything the home page needs in one request (plan §10.2).
 * The home page hides empty sections.
 */
export function createHomeRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const [
      profile,
      featuredTracks,
      featuredVideos,
      featuredImages,
      upcomingEvents,
      showcaseVideos,
      sheetMusicCount,
    ] = await Promise.all([
      getProfileDoc(),
      listFeaturedTracks(HOME_LIMITS.featuredTracks),
      listFeaturedVideos(HOME_LIMITS.featuredVideos),
      listFeaturedImages(HOME_LIMITS.featuredImages),
      listUpcomingEvents(HOME_LIMITS.upcomingEvents),
      listShowcaseVideos(HOME_LIMITS.showcaseVideos),
      countPublishedSheetMusic(),
    ]);
    const data: HomeDto = {
      profile: toProfileSummaryDto(profile),
      featuredTracks,
      featuredVideos,
      featuredImages,
      upcomingEvents,
      showcaseVideos,
      sheetMusicCount,
    };
    sendData(res, data);
  });

  return router;
}

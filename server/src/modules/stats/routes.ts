import { Router } from 'express';

import type { AdminStatsDto } from '@roman/shared';

import { sendData } from '../../lib/respond.js';
import { AlbumModel } from '../albums/model.js';
import { EventModel } from '../events/model.js';
import { timeframeFilter } from '../events/service.js';
import { GalleryImageModel } from '../gallery/model.js';
import { InquiryModel } from '../inquiries/model.js';
import { TrackModel } from '../tracks/model.js';
import { VideoModel } from '../videos/model.js';

/** Dashboard counts (plan §10.4, §13). Content counts include drafts; "drafts" totals them. */
export async function getStats(now = new Date()): Promise<AdminStatsDto> {
  const draft = { status: 'draft' } as const;
  const [inquiriesNew, tracks, videos, images, upcomingEvents, ...drafts] = await Promise.all([
    InquiryModel.countDocuments({ status: 'new' }),
    TrackModel.countDocuments(),
    VideoModel.countDocuments(),
    GalleryImageModel.countDocuments(),
    EventModel.countDocuments(timeframeFilter('upcoming', now)),
    TrackModel.countDocuments(draft),
    AlbumModel.countDocuments(draft),
    VideoModel.countDocuments(draft),
    GalleryImageModel.countDocuments(draft),
    EventModel.countDocuments(draft),
  ]);
  return {
    inquiriesNew,
    tracks,
    videos,
    images,
    upcomingEvents,
    drafts: drafts.reduce((sum, count) => sum + count, 0),
  };
}

/** `GET /api/admin/stats`. */
export function createStatsRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    sendData(res, await getStats());
  });

  return router;
}

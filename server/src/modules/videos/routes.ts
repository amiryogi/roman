import { Router } from 'express';

import {
  reorderInputSchema,
  videoAdminListQuerySchema,
  videoCreateInputSchema,
  videosPublicQuerySchema,
  videoUpdateInputSchema,
} from '@roman/shared';

import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import {
  createVideo,
  deleteVideo,
  getAdminVideo,
  listAdminVideos,
  listPublicVideos,
  reorderVideos,
  updateVideo,
} from './service.js';

/** `GET /api/videos` (plan §10.2). */
export function createPublicVideosRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicVideos(videosPublicQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  return router;
}

/** `/api/admin/videos/*` (plan §10.4). Mounted behind requireAuth. */
export function createAdminVideosRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminVideos(videoAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createVideo(videoCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  router.patch('/order', async (req, res) => {
    await reorderVideos(reorderInputSchema.parse(req.body).ids);
    sendNoContent(res);
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminVideo(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateVideo(id, videoUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    await deleteVideo(idParam(req.params), deps);
    sendNoContent(res);
  });

  return router;
}

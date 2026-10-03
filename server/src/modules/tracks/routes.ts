import { Router } from 'express';

import {
  reorderInputSchema,
  trackAdminListQuerySchema,
  trackCreateInputSchema,
  tracksPublicQuerySchema,
  trackUpdateInputSchema,
} from '@roman/shared';

import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import {
  createTrack,
  deleteTrack,
  getAdminTrack,
  listAdminTracks,
  listPublicTracks,
  reorderTracks,
  updateTrack,
  type MediaDeps,
} from './service.js';

/** `GET /api/tracks` (plan §10.2). */
export function createPublicTracksRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicTracks(tracksPublicQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  return router;
}

/** `/api/admin/tracks/*` (plan §10.4). Mounted behind requireAuth. */
export function createAdminTracksRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminTracks(trackAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createTrack(trackCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  // Before "/:id", so "order" is never read as an id.
  router.patch('/order', async (req, res) => {
    await reorderTracks(reorderInputSchema.parse(req.body).ids);
    sendNoContent(res);
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminTrack(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateTrack(id, trackUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    await deleteTrack(idParam(req.params), deps);
    sendNoContent(res);
  });

  return router;
}

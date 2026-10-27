import { Router } from 'express';

import {
  reorderInputSchema,
  sheetMusicAdminListQuerySchema,
  sheetMusicCreateInputSchema,
  sheetMusicPublicQuerySchema,
  sheetMusicUpdateInputSchema,
} from '@roman/shared';

import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import {
  createSheetMusic,
  deleteSheetMusic,
  getAdminSheetMusic,
  listAdminSheetMusic,
  listPublicSheetMusic,
  reorderSheetMusic,
  updateSheetMusic,
} from './service.js';

/** `GET /api/sheet-music`. */
export function createPublicSheetMusicRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicSheetMusic(
      sheetMusicPublicQuerySchema.parse(req.query),
    );
    sendData(res, items, { meta });
  });

  return router;
}

/** `/api/admin/sheet-music/*`. Mounted behind requireAuth. */
export function createAdminSheetMusicRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminSheetMusic(
      sheetMusicAdminListQuerySchema.parse(req.query),
    );
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createSheetMusic(sheetMusicCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  router.patch('/order', async (req, res) => {
    await reorderSheetMusic(reorderInputSchema.parse(req.body).ids);
    sendNoContent(res);
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminSheetMusic(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateSheetMusic(id, sheetMusicUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    await deleteSheetMusic(idParam(req.params), deps);
    sendNoContent(res);
  });

  return router;
}

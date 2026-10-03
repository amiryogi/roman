import { Router } from 'express';

import {
  galleryAdminListQuerySchema,
  galleryImageCreateInputSchema,
  galleryImageUpdateInputSchema,
  galleryPublicQuerySchema,
  reorderInputSchema,
} from '@roman/shared';

import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import {
  createImage,
  deleteImage,
  getAdminImage,
  listAdminImages,
  listPublicImages,
  reorderImages,
  updateImage,
} from './service.js';

/** `GET /api/gallery` (plan §10.2). */
export function createPublicGalleryRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicImages(galleryPublicQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  return router;
}

/** `/api/admin/gallery/*` (plan §10.4). Mounted behind requireAuth. */
export function createAdminGalleryRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminImages(galleryAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createImage(galleryImageCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  router.patch('/order', async (req, res) => {
    await reorderImages(reorderInputSchema.parse(req.body).ids);
    sendNoContent(res);
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminImage(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateImage(id, galleryImageUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    await deleteImage(idParam(req.params), deps);
    sendNoContent(res);
  });

  return router;
}

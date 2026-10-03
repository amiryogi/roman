import { Router } from 'express';

import {
  albumAdminListQuerySchema,
  albumCreateInputSchema,
  albumDeleteQuerySchema,
  albumsPublicQuerySchema,
  albumUpdateInputSchema,
  reorderInputSchema,
  slugSchema,
} from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import {
  createAlbum,
  deleteAlbum,
  getAdminAlbum,
  getPublicAlbum,
  listAdminAlbums,
  listPublicAlbums,
  reorderAlbums,
  updateAlbum,
} from './service.js';

/** `GET /api/albums` and `GET /api/albums/:slug` (plan §10.2). */
export function createPublicAlbumsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicAlbums(albumsPublicQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.get('/:slug', async (req, res) => {
    const slug = slugSchema.safeParse(req.params.slug);
    if (!slug.success) throw AppError.notFound('This album is not available.');
    sendData(res, await getPublicAlbum(slug.data));
  });

  return router;
}

/** `/api/admin/albums/*` (plan §10.4). Mounted behind requireAuth. */
export function createAdminAlbumsRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminAlbums(albumAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createAlbum(albumCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  router.patch('/order', async (req, res) => {
    await reorderAlbums(reorderInputSchema.parse(req.body).ids);
    sendNoContent(res);
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminAlbum(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateAlbum(id, albumUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    const id = idParam(req.params);
    const { detachTracks = false } = albumDeleteQuerySchema.parse(req.query);
    await deleteAlbum(id, { detachTracks }, deps);
    sendNoContent(res);
  });

  return router;
}

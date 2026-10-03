import { Router } from 'express';

import { profileInputSchema } from '@roman/shared';

import { sendData } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import { toProfileAdminDto, toProfileDto } from './mapper.js';
import { getProfileDoc, replaceProfile } from './service.js';

/** `GET /api/profile`: the public profile for the About and Contact pages (plan §10.2). */
export function createProfileRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    sendData(res, toProfileDto(await getProfileDoc()));
  });

  return router;
}

/** `GET|PUT /api/admin/profile` (plan §10.4): includes the hidden phone and its visibility. */
export function createAdminProfileRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    sendData(res, toProfileAdminDto(await getProfileDoc()));
  });

  router.put('/', async (req, res) => {
    sendData(res, await replaceProfile(profileInputSchema.parse(req.body), deps));
  });

  return router;
}

import { Router } from 'express';

import { sendData } from '../../lib/respond.js';
import { toProfileDto } from './mapper.js';
import { getProfileDoc } from './service.js';

/** `GET /api/profile`: the public profile for the About and Contact pages (plan §10.2). */
export function createProfileRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    sendData(res, toProfileDto(await getProfileDoc()));
  });

  return router;
}

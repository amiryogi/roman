import { Router } from 'express';

import {
  eventAdminListQuerySchema,
  eventCreateInputSchema,
  eventsPublicQuerySchema,
  eventUpdateInputSchema,
} from '@roman/shared';

import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import type { MediaDeps } from '../tracks/service.js';
import {
  createEvent,
  deleteEvent,
  getAdminEvent,
  listAdminEvents,
  listPublicEvents,
  updateEvent,
} from './service.js';

/** `GET /api/events?when=upcoming|past` (plan §10.2). */
export function createPublicEventsRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listPublicEvents(eventsPublicQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  return router;
}

/** `/api/admin/events/*` (plan §10.4). Sorted by date, so there is no reorder endpoint. */
export function createAdminEventsRouter(deps: MediaDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listAdminEvents(eventAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.post('/', async (req, res) => {
    sendData(res, await createEvent(eventCreateInputSchema.parse(req.body), deps), {
      status: 201,
    });
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getAdminEvent(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateEvent(id, eventUpdateInputSchema.parse(req.body), deps));
  });

  router.delete('/:id', async (req, res) => {
    await deleteEvent(idParam(req.params), deps);
    sendNoContent(res);
  });

  return router;
}

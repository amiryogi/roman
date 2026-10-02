import { Router } from 'express';

import type { HealthDto } from '@roman/shared';

import { isDbConnected } from '../../config/db.js';
import { sendData } from '../../lib/respond.js';
import { noStore } from '../../middleware/cacheControl.js';

/**
 * `GET /api/health`: liveness and readiness for Render's health check and uptime monitors.
 * Responds 503 when the database is unreachable so the platform can react.
 */
export function createHealthRouter(version: string): Router {
  const router = Router();

  router.get('/', noStore, (_req, res) => {
    const db = isDbConnected() ? 'up' : 'down';
    const data: HealthDto = {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
      version,
    };
    sendData(res, data, { status: db === 'up' ? 200 : 503 });
  });

  return router;
}

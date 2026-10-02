import express, { type Express } from 'express';

import type { ApiSuccess, HealthDto } from '@roman/shared';

// Builds the Express app without listening, so tests can drive it with Supertest.
// Phase 2 adds config, security middleware, error handling and the DB-aware health check.
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    const body: ApiSuccess<HealthDto> = {
      success: true,
      data: { status: 'ok', uptime: process.uptime() },
    };
    res.json(body);
  });

  return app;
}

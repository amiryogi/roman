import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';

import type { Logger } from './config/logger.js';
import { createErrorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createGlobalRateLimiter } from './middleware/rateLimit.js';
import { createRequestLogger } from './middleware/requestLogger.js';
import { requireJsonBody } from './middleware/requireJsonBody.js';
import { createHealthRouter } from './modules/health/routes.js';

export interface AppOptions {
  clientOrigins: readonly string[];
  /** Number of proxy hops in front of the app (Vercel rewrite + Render), for correct client IPs. */
  trustProxy: number;
  version: string;
  logger: Logger;
}

export const JSON_BODY_LIMIT = '100kb';

// Builds the Express app without listening, so tests can drive it with Supertest.
export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy);

  app.use(createRequestLogger(options.logger));
  app.use(helmet());
  app.use(
    cors({
      origin: [...options.clientOrigins],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
    }),
  );

  // Health sits outside the rate limiter so platform health checks never get throttled.
  app.use('/api/health', createHealthRouter(options.version));

  app.use('/api', createGlobalRateLimiter());
  app.use(requireJsonBody);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = Router();
  // Resource routers are mounted here in later phases.
  app.use('/api', api);

  app.use(notFound);
  app.use(createErrorHandler(options.logger));

  return app;
}

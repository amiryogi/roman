import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';

import type { Logger } from './config/logger.js';
import { noStore, publicCache } from './middleware/cacheControl.js';
import { createErrorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createGlobalRateLimiter } from './middleware/rateLimit.js';
import { createRequestLogger } from './middleware/requestLogger.js';
import { createRequireAuth } from './middleware/requireAuth.js';
import { requireJsonBody } from './middleware/requireJsonBody.js';
import type { AuthConfig } from './modules/auth/config.js';
import { createAdminAlbumsRouter, createPublicAlbumsRouter } from './modules/albums/routes.js';
import { createAuthRouter } from './modules/auth/routes.js';
import { createHealthRouter } from './modules/health/routes.js';
import { createHomeRouter } from './modules/home/routes.js';
import { createProfileRouter } from './modules/profile/routes.js';
import { createAdminTracksRouter, createPublicTracksRouter } from './modules/tracks/routes.js';
import { createUploadsRouter } from './modules/uploads/routes.js';
import type { MediaService } from './services/media/MediaService.js';

export interface AppOptions {
  clientOrigins: readonly string[];
  /** Number of proxy hops in front of the app (Vercel rewrite + Render), for correct client IPs. */
  trustProxy: number;
  version: string;
  logger: Logger;
  auth: AuthConfig;
  media: MediaService;
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

  app.use('/api/auth', noStore, createAuthRouter(options.auth));

  // Public content (plan §10.2): short cache plus Express's weak ETag.
  app.use('/api/profile', publicCache, createProfileRouter());
  app.use('/api/home', publicCache, createHomeRouter());
  app.use('/api/tracks', publicCache, createPublicTracksRouter());
  app.use('/api/albums', publicCache, createPublicAlbumsRouter());

  // Everything under /api/admin requires a valid access token. Authentication is enforced here,
  // at the mount point, so a resource router added later cannot forget it.
  const admin = Router();
  const mediaDeps = { media: options.media, logger: options.logger };
  admin.use('/uploads', createUploadsRouter(options.media, options.logger));
  admin.use('/tracks', createAdminTracksRouter(mediaDeps));
  admin.use('/albums', createAdminAlbumsRouter(mediaDeps));
  app.use('/api/admin', noStore, createRequireAuth(options.auth), admin);

  app.use(notFound);
  app.use(createErrorHandler(options.logger));

  return app;
}

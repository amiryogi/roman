import type { Express } from 'express';

import { createApp } from '../src/app.js';
import { silentLogger } from '../src/config/logger.js';
import type { AuthConfig } from '../src/modules/auth/config.js';
import {
  createFakeMediaService,
  type FakeMediaService,
} from '../src/services/media/fakeMediaService.js';

export const TEST_ORIGIN = 'http://localhost:5173';

export const TEST_AUTH: AuthConfig = {
  accessSecret: 'test-secret-that-is-at-least-32-characters-long',
  issuer: 'test-api',
  audience: 'test-admin',
  accessTtlSeconds: 900,
  refreshTtlDays: 7,
  secureCookies: false,
};

export const TEST_MEDIA_ROOT = 'roman-budhathoki/test';
export const TEST_INQUIRY_SECRET = 'test-inquiry-secret-value';

export function createTestMedia(): FakeMediaService {
  return createFakeMediaService({
    rootFolder: TEST_MEDIA_ROOT,
    limits: {
      maxBytes: { image: 20 * 1024 * 1024, audio: 100 * 1024 * 1024, video: 100 * 1024 * 1024 },
    },
  });
}

export function createTestApp(
  media: FakeMediaService = createTestMedia(),
  { rateLimiting = true }: { rateLimiting?: boolean } = {},
): Express {
  return createApp({
    rateLimiting,
    clientOrigins: [TEST_ORIGIN],
    trustProxy: 0,
    version: 'test',
    logger: silentLogger,
    auth: TEST_AUTH,
    media,
    inquiries: { secret: TEST_INQUIRY_SECRET },
  });
}

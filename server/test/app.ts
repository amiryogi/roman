import type { Express } from 'express';

import { createApp } from '../src/app.js';
import { silentLogger } from '../src/config/logger.js';
import type { AuthConfig } from '../src/modules/auth/config.js';

export const TEST_ORIGIN = 'http://localhost:5173';

export const TEST_AUTH: AuthConfig = {
  accessSecret: 'test-secret-that-is-at-least-32-characters-long',
  issuer: 'test-api',
  audience: 'test-admin',
  accessTtlSeconds: 900,
  refreshTtlDays: 7,
  secureCookies: false,
};

export function createTestApp(): Express {
  return createApp({
    clientOrigins: [TEST_ORIGIN],
    trustProxy: 0,
    version: 'test',
    logger: silentLogger,
    auth: TEST_AUTH,
  });
}

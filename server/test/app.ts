import type { Express } from 'express';

import { createApp } from '../src/app.js';
import { silentLogger } from '../src/config/logger.js';

export const TEST_ORIGIN = 'http://localhost:5173';

export function createTestApp(): Express {
  return createApp({
    clientOrigins: [TEST_ORIGIN],
    trustProxy: 0,
    version: 'test',
    logger: silentLogger,
  });
}

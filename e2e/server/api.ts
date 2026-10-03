// The API for Playwright runs (plan §19): the real Express app on an in-memory MongoDB with the
// fake media driver, seeded with neutral test content. Started by playwright.config.ts.

import { fileURLToPath } from 'node:url';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { UPLOAD_KIND_RULES, UPLOAD_KINDS, type UploadKind } from '@roman/shared';

import { createApp } from '../../server/src/app.js';
import { configureMongoose } from '../../server/src/config/db.js';
import { createLogger } from '../../server/src/config/logger.js';
import { syncAllIndexes } from '../../server/src/models.js';
import { uploadFolder, type MediaService } from '../../server/src/services/media/MediaService.js';
import { createFakeMediaService } from '../../server/src/services/media/fakeMediaService.js';

import { E2E_API_PORT, E2E_CLIENT_ORIGIN, E2E_MEDIA_ROOT } from '../config.js';
import { seed } from './seed.js';

// Reuse the binary the server tests downloaded (see server/vitest.config.ts).
process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(
  new URL('../../node_modules/.cache/mongodb-memory-server', import.meta.url),
);

const fake = createFakeMediaService({
  rootFolder: E2E_MEDIA_ROOT,
  limits: { maxBytes: { image: 20_000_000, audio: 100_000_000, video: 100_000_000 } },
});

/** The upload kind whose folder holds `publicId` (the most specific folder wins). */
function kindForPublicId(publicId: string, resourceType: string): UploadKind | undefined {
  const [kind] = UPLOAD_KINDS.filter((candidate) => {
    const rule = UPLOAD_KIND_RULES[candidate];
    return (
      rule.resourceType === resourceType &&
      publicId.startsWith(`${uploadFolder(E2E_MEDIA_ROOT, rule.folder)}/`)
    );
  }).sort((a, b) => UPLOAD_KIND_RULES[b].folder.length - UPLOAD_KIND_RULES[a].folder.length);
  return kind;
}

/**
 * The browser's Cloudinary upload is intercepted by the tests (e2e/fixtures.ts), so the server's
 * fake never saw it: any asset in the E2E folders counts as uploaded the first time it is checked.
 */
const media: MediaService = {
  ...fake,
  async getResource(ref) {
    const known = await fake.getResource(ref);
    if (known) return known;
    const kind = kindForPublicId(ref.publicId, ref.resourceType);
    return kind ? fake.simulateUpload(kind, { publicId: ref.publicId }) : null;
  },
};

configureMongoose({ autoIndex: false });
const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
await syncAllIndexes();
await seed();

const logger = createLogger({ level: 'warn', pretty: true });
const app = createApp({
  clientOrigins: [E2E_CLIENT_ORIGIN],
  trustProxy: 0,
  version: 'e2e',
  logger,
  auth: {
    accessSecret: 'e2e-access-secret-that-is-at-least-32-chars',
    issuer: 'e2e-api',
    audience: 'e2e-admin',
    accessTtlSeconds: 900,
    refreshTtlDays: 7,
    secureCookies: false,
  },
  media,
  inquiries: { secret: 'e2e-inquiry-secret-value' },
  // Every test signs in or sends an inquiry from the same address.
  rateLimiting: false,
});

const server = app.listen(E2E_API_PORT, () => {
  logger.warn({ port: E2E_API_PORT }, 'E2E API listening');
});

async function shutdown(): Promise<void> {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

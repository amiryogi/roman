// Adds the YouTube songs from the owner's reference page as published videos under "Songs I've
// played on" (2026-10-27). Each song is matched to its video by the title YouTube reports.
// Safe to run again; videos already saved (by YouTube ID) are left as the owner edited them.
//
//   npm run seed:videos
import { configureMongoose, connectDb, disconnectDb } from '../config/db.js';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { createMediaService } from '../services/media/index.js';
import { seedShowcaseVideos } from './seed/showcaseVideos.js';

try {
  const env = loadEnv();
  const logger = createLogger({ level: 'info', pretty: true });
  configureMongoose({ autoIndex: false });
  await connectDb(env.mongodbUri, { dnsServers: env.dnsServers });

  // YouTube videos store no media; the service is only there for the shared create path.
  const summary = await seedShowcaseVideos({ media: createMediaService(env.media), logger });
  console.info(
    [
      'Songs I’ve played on:',
      `  added: ${summary.created.join(', ') || 'none'}`,
      `  already there: ${summary.kept.join(', ') || 'none'}`,
    ].join('\n'),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}

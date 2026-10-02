// Creates/drops indexes to match the schemas. Run on every deploy, because autoIndex is off
// in production (plan §8.1, §24).
import { configureMongoose, connectDb, disconnectDb } from '../config/db.js';
import { loadEnv } from '../config/env.js';
import { syncAllIndexes } from '../models.js';

try {
  const env = loadEnv();
  configureMongoose({ autoIndex: false });
  await connectDb(env.mongodbUri);
  await syncAllIndexes();
  console.info('Indexes are in sync.');
} catch (error) {
  console.error(`Index sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}

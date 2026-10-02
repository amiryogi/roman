import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { configureMongoose, isDbConnected } from '../src/config/db.js';
import { syncAllIndexes } from '../src/models.js';

/** In-memory MongoDB for one test file, with production Mongoose settings and real indexes. */
export function useTestDb(): void {
  let mongod: MongoMemoryServer | undefined;

  beforeAll(async () => {
    configureMongoose({ autoIndex: false });
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await syncAllIndexes();
  });

  afterEach(async () => {
    // Some tests deliberately disconnect (e.g. the health check's 503 path).
    if (!isDbConnected()) return;
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
  });
}

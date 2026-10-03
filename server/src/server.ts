import mongoose from 'mongoose';

import { createApp } from './app.js';
import { configureMongoose, connectDb, disconnectDb } from './config/db.js';
import { EnvError, loadEnv, type Env } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createMediaService } from './services/media/index.js';

function readEnv(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnv();
const logger = createLogger({ level: env.logLevel, pretty: env.nodeEnv === 'development' });

configureMongoose({ autoIndex: !env.isProduction });
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

try {
  await connectDb(env.mongodbUri);
  logger.info('MongoDB connected');
} catch (error) {
  logger.fatal({ err: error }, 'Could not connect to MongoDB');
  process.exit(1);
}

const app = createApp({
  clientOrigins: env.clientOrigins,
  trustProxy: env.trustProxy,
  version: env.version,
  logger,
  auth: env.auth,
  media: createMediaService(env.media),
  inquiries: env.inquiries,
});

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, env: env.nodeEnv, version: env.version, media: env.media.driver },
    'API listening',
  );
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down');
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(() => {
    disconnectDb()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Error while disconnecting from MongoDB');
        process.exit(1);
      });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

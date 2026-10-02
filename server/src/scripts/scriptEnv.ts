import { loadEnv, type Env } from '../config/env.js';
import { createLogger, type Logger } from '../config/logger.js';
import { createMediaService } from '../services/media/index.js';
import type { MediaService } from '../services/media/MediaService.js';

export class ScriptError extends Error {}

/** Env, a readable logger and the real Cloudinary driver, for scripts that manage media. */
export function loadMediaScriptEnv(): { env: Env; logger: Logger; media: MediaService } {
  const env = loadEnv();
  if (env.media.driver !== 'cloudinary') {
    throw new ScriptError('This script needs MEDIA_DRIVER=cloudinary and Cloudinary credentials.');
  }
  return {
    env,
    logger: createLogger({ level: 'info', pretty: true }),
    media: createMediaService(env.media),
  };
}

import type { Env } from '../../config/env.js';
import { createCloudinaryApi } from './cloudinaryApi.js';
import { createCloudinaryMediaService } from './cloudinaryMediaService.js';
import { createFakeMediaService } from './fakeMediaService.js';
import type { MediaService } from './MediaService.js';

export type MediaConfig = Env['media'];

/** Picks the driver from MEDIA_DRIVER (plan §21.2). */
export function createMediaService(config: MediaConfig): MediaService {
  if (config.driver === 'fake') return createFakeMediaService(config);
  return createCloudinaryMediaService(config, createCloudinaryApi(config.cloudinary));
}

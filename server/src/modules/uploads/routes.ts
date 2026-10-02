import { Router } from 'express';

import {
  uploadSignatureInputSchema,
  uploadVerifyInputSchema,
  type UploadVerifyDto,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { toMediaAssetDto } from '../../lib/mongo.js';
import { sendData } from '../../lib/respond.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { currentAdmin } from '../../middleware/requireAuth.js';
import type { MediaService } from '../../services/media/MediaService.js';
import { verifyUpload } from '../../services/media/verify.js';

const ONE_HOUR = 60 * 60 * 1000;

/** `/api/admin/uploads/*` (plan §9.2, §10.4). Mounted behind requireAuth. */
export function createUploadsRouter(media: MediaService, logger: Logger): Router {
  const router = Router();

  // Plan §15: 60 signatures per hour per admin. Verification also calls Cloudinary's Admin API,
  // which has an hourly quota, so it is limited too.
  const perAdmin = (limit: number) =>
    createRateLimiter({
      windowMs: ONE_HOUR,
      limit,
      keyGenerator: (req) => currentAdmin(req)._id.toHexString(),
      message: 'Too many uploads in a short time. Please try again later.',
    });

  router.post('/signature', perAdmin(60), async (req, res) => {
    const { kind } = uploadSignatureInputSchema.parse(req.body);
    sendData(res, await media.createUploadSignature(kind));
  });

  router.post('/verify', perAdmin(120), async (req, res) => {
    const { kind, mediaRef } = uploadVerifyInputSchema.parse(req.body);
    const asset = await verifyUpload(media, kind, mediaRef, logger);
    const body: UploadVerifyDto = { asset: toMediaAssetDto(asset) };
    sendData(res, body);
  });

  return router;
}

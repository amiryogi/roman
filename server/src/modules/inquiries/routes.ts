import { Router } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

import { inquiryCreateInputSchema, type InquiryFormTokenDto } from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { sendData } from '../../lib/respond.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { issueFormToken } from './formToken.js';
import { createInquiry } from './service.js';

export interface InquiryConfig {
  /** Keys IP hashes and form tokens (IP_HASH_SALT). */
  secret: string;
}

/** Public contact/booking endpoints (plan §10.2). Mounted with Cache-Control: no-store. */
export function createInquiriesRouter(config: InquiryConfig, logger: Logger): Router {
  const router = Router();

  // 5 inquiries per hour per IP (plan §15). Only accepted ones count, so someone correcting
  // a mistake in the form isn't locked out; the global limiter still caps everything else.
  const perIp = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    skipFailedRequests: true,
    message:
      'Too many messages from this connection. Please try again in an hour, or email directly.',
  });

  router.get('/form-token', (_req, res) => {
    const body: InquiryFormTokenDto = { token: issueFormToken(config.secret) };
    sendData(res, body);
  });

  router.post('/', perIp, async (req, res) => {
    const input = inquiryCreateInputSchema.parse(req.body);
    const receipt = await createInquiry(input, {
      secret: config.secret,
      ip: ipKeyGenerator(req.ip ?? 'unknown'),
      userAgent: req.get('user-agent'),
      logger,
    });
    sendData(res, receipt, { status: 201 });
  });

  return router;
}

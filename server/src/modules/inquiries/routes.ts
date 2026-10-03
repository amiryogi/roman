import { Router } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

import {
  inquiryAdminListQuerySchema,
  inquiryCreateInputSchema,
  inquiryUpdateInputSchema,
  type InquiryFormTokenDto,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { idParam } from '../../lib/query.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { issueFormToken } from './formToken.js';
import {
  createInquiry,
  deleteInquiry,
  getInquiry,
  listInquiries,
  updateInquiry,
} from './service.js';

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

/** `/api/admin/inquiries/*` (plan §10.4): the inbox. Mounted behind requireAuth. */
export function createAdminInquiriesRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { items, meta } = await listInquiries(inquiryAdminListQuerySchema.parse(req.query));
    sendData(res, items, { meta });
  });

  router.get('/:id', async (req, res) => {
    sendData(res, await getInquiry(idParam(req.params)));
  });

  router.patch('/:id', async (req, res) => {
    const id = idParam(req.params);
    sendData(res, await updateInquiry(id, inquiryUpdateInputSchema.parse(req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await deleteInquiry(idParam(req.params));
    sendNoContent(res);
  });

  return router;
}

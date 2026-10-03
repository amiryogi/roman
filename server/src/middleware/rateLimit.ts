import { rateLimit, type Options, type RateLimitRequestHandler } from 'express-rate-limit';

import { AppError } from '../lib/AppError.js';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  keyGenerator?: Options['keyGenerator'];
  /** Count only failed requests (status >= 400). */
  skipSuccessfulRequests?: boolean;
  /** Count only successful requests (status < 400). */
  skipFailedRequests?: boolean;
}

/** Rate limiter that answers with the standard error envelope and a Retry-After header. */
export function createRateLimiter(options: LimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    handler: (_req, res, next) => {
      res.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
      next(new AppError(429, 'RATE_LIMITED', options.message));
    },
  });
}

/** Baseline for all of /api (plan §15): 300 requests per 15 minutes per IP. */
export function createGlobalRateLimiter(): RateLimitRequestHandler {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: 'Too many requests. Please try again in a few minutes.',
  });
}

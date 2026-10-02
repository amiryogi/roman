import type { RequestHandler } from 'express';

/** Public content: short browser/CDN cache with background revalidation (plan §16). */
export const publicCache: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  next();
};

/** Admin, auth and health responses must never be cached. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

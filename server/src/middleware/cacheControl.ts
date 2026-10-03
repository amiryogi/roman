import type { RequestHandler } from 'express';

/**
 * Public content: cacheable, but checked with the server every time. Express's ETag turns an
 * unchanged response into a small 304, and a change the owner publishes shows on the next request
 * instead of after a cache period (a max-age kept stale lists on screen for minutes).
 */
export const publicCache: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'public, no-cache');
  next();
};

/** Admin, auth and health responses must never be cached. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

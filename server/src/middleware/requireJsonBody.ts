import type { RequestHandler } from 'express';

import { AppError } from '../lib/AppError.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Rejects bodies that are not JSON with 415. `req.is()` returns null when there is no body
 * (e.g. POST /auth/logout), which is allowed.
 */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  if (METHODS_WITH_BODY.has(req.method) && req.is('application/json') === false) {
    next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must be sent as JSON.'));
    return;
  }
  next();
};

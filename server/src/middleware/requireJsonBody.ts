import type { RequestHandler } from 'express';

import { AppError } from '../lib/AppError.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Rejects bodies that are not JSON with 415. Empty bodies are allowed (e.g. POST /auth/logout):
 * `req.is()` returns null without body headers, but browsers send `Content-Length: 0` for a
 * bodyless POST, which `req.is()` counts as a body, so that case is checked explicitly.
 */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  if (
    METHODS_WITH_BODY.has(req.method) &&
    req.get('content-length') !== '0' &&
    req.is('application/json') === false
  ) {
    next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must be sent as JSON.'));
    return;
  }
  next();
};

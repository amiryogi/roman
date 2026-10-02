import type { RequestHandler } from 'express';

import { AppError } from '../lib/AppError.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('This API route does not exist.'));
};

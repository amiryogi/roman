import type { ErrorRequestHandler, Request } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import type { ApiErrorBody, ApiErrorDetail, ErrorCode } from '@roman/shared';

import type { Logger } from '../config/logger.js';
import { AppError } from '../lib/AppError.js';
import { isBodyParserError, isDuplicateKeyError } from '../lib/guards.js';

interface MappedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

const INTERNAL: MappedError = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'Something went wrong on our side. Please try again later.',
};

/** Maps any thrown value to a client-safe error (plan §10.5). Unknown errors never leak details. */
export function mapError(error: unknown): MappedError {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  }

  if (error instanceof z.ZodError) {
    return {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid.',
      details: error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return error.path === '_id'
      ? { status: 404, code: 'NOT_FOUND', message: 'The requested resource was not found.' }
      : {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Some fields are invalid.',
          details: [{ path: error.path, message: 'Invalid value' }],
        };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid.',
      details: Object.values(error.errors).map((fieldError) => ({
        path: fieldError.path,
        message: fieldError.message,
      })),
    };
  }

  if (isDuplicateKeyError(error)) {
    const fields = Object.keys(error.keyValue ?? {});
    return {
      status: 409,
      code: 'CONFLICT',
      message:
        fields.length > 0
          ? `That ${fields.join(', ')} is already in use.`
          : 'This item conflicts with an existing one.',
      details: fields.map((field) => ({ path: field, message: 'Already in use' })),
    };
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' };
    }
    if (error.status >= 400 && error.status < 500) {
      return { status: 400, code: 'BAD_REQUEST', message: 'The request body could not be read.' };
    }
  }

  return INTERNAL;
}

function requestIdOf(req: Request): string {
  return typeof req.id === 'string' ? req.id : 'unknown';
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    const mapped = mapError(error);
    const requestId = requestIdOf(req);

    if (mapped.status >= 500) {
      logger.error({ err: error, requestId }, 'Unhandled error');
    }

    if (res.headersSent) {
      next(error);
      return;
    }

    const body: ApiErrorBody = {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
        requestId,
      },
    };
    res.status(mapped.status).json(body);
  };
}

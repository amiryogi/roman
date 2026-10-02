import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiErrorBodySchema } from '@roman/shared';

import { silentLogger } from '../config/logger.js';
import { AppError } from '../lib/AppError.js';
import { TrackModel } from '../modules/tracks/model.js';
import { createErrorHandler } from './errorHandler.js';

function appThrowing(error: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(createErrorHandler(silentLogger));
  return app;
}

async function errorBody(error: unknown) {
  const res = await request(appThrowing(error)).get('/boom');
  return { status: res.status, body: apiErrorBodySchema.parse(res.body) };
}

describe('error handler', () => {
  it('passes AppError through unchanged', async () => {
    const { status, body } = await errorBody(AppError.conflict('Slug taken'));

    expect(status).toBe(409);
    expect(body.error).toMatchObject({ code: 'CONFLICT', message: 'Slug taken' });
  });

  it('maps Zod errors to 422 with field details', async () => {
    const result = z.object({ email: z.email(), age: z.number() }).safeParse({ email: 'x' });
    const { status, body } = await errorBody(result.error);

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.path).sort()).toEqual(['age', 'email']);
  });

  it('maps a bad ObjectId to 404', async () => {
    const { status, body } = await errorBody(
      new mongoose.Error.CastError('ObjectId', 'not-an-id', '_id'),
    );

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('maps Mongoose validation errors to 422', async () => {
    const validationError: unknown = await new TrackModel({})
      .validate()
      .catch((error: unknown) => error);
    const { status, body } = await errorBody(validationError);

    expect(status).toBe(422);
    expect(body.error.details?.map((d) => d.path)).toEqual(
      expect.arrayContaining(['title', 'slug']),
    );
  });

  it('maps duplicate keys to 409 naming the field', async () => {
    const { status, body } = await errorBody({ code: 11000, keyValue: { slug: 'live' } });

    expect(status).toBe(409);
    expect(body.error).toMatchObject({ code: 'CONFLICT', message: 'That slug is already in use.' });
  });

  it('hides the details of unexpected errors', async () => {
    const { status, body } = await errorBody(
      new Error('connect ECONNREFUSED mongodb://admin:secret@db'),
    );

    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});

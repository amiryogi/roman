import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { apiErrorBodySchema, apiSuccessSchema, healthDtoSchema } from '@roman/shared';

const healthResponse = apiSuccessSchema(healthDtoSchema);

import { createTestApp, TEST_ORIGIN } from '../test/app.js';
import { useTestDb } from '../test/db.js';

useTestDb();

describe('app', () => {
  const app = createTestApp();

  it('reports health with the database up', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(healthResponse.parse(res.body).data).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    const body = apiErrorBodySchema.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('rejects bodies over the size limit with 413', async () => {
    const res = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'x'.repeat(150 * 1024) }));

    expect(res.status).toBe(413);
    expect(apiErrorBodySchema.parse(res.body).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects non-JSON bodies with 415', async () => {
    const res = await request(app).post('/api/anything').type('form').send('a=1');

    expect(res.status).toBe(415);
    expect(apiErrorBodySchema.parse(res.body).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(apiErrorBodySchema.parse(res.body).error.code).toBe('BAD_REQUEST');
  });

  it('sets security headers and hides Express', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('echoes a well-formed incoming request id', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'trace-12345678');

    expect(res.headers['x-request-id']).toBe('trace-12345678');
  });

  it('allows CORS only for configured origins', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', TEST_ORIGIN);
    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  // Runs last: it disconnects the database.
  it('reports 503 when the database is down', async () => {
    await mongoose.disconnect();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(healthResponse.parse(res.body).data).toMatchObject({ status: 'degraded', db: 'down' });
  });
});

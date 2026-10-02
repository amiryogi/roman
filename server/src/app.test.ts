import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('GET /api/health', () => {
  it('reports the API as up', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  it('does not advertise Express', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

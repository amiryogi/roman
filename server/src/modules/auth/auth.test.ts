import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { adminDtoSchema, apiErrorBodySchema, apiSuccessSchema } from '@roman/shared';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createAdminUser,
  parseAuthResponse,
  refreshCookieHeader,
  refreshSetCookie,
  refreshTokenFrom,
} from '../../../test/auth.js';
import { createTestApp, TEST_AUTH, TEST_ORIGIN } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import { signAccessToken } from '../../lib/tokens.js';
import { AdminModel } from './admin.model.js';
import { SessionModel } from './session.model.js';

useTestDb();

const CSRF = { 'X-Requested-With': 'fetch' };
const meResponse = apiSuccessSchema(adminDtoSchema);

function errorOf(res: request.Response) {
  return apiErrorBodySchema.parse(res.body).error;
}

describe('auth', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    app = createTestApp(); // fresh rate-limit counters per test
    await createAdminUser();
  });

  async function login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
    return request(app).post('/api/auth/login').send({ email, password });
  }

  async function refresh(token: string) {
    return request(app)
      .post('/api/auth/refresh')
      .set(CSRF)
      .set('Cookie', refreshCookieHeader(token));
  }

  describe('POST /login', () => {
    it('returns an access token and sets a locked-down refresh cookie', async () => {
      const res = await login();

      expect(res.status).toBe(200);
      const body = parseAuthResponse(res);
      expect(body.expiresIn).toBe(TEST_AUTH.accessTtlSeconds);
      expect(body.admin.email).toBe(ADMIN_EMAIL);
      expect(body.admin.lastLoginAt).toBeDefined();
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|refresh/i);

      const cookie = refreshSetCookie(res);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('treats the email case-insensitively', async () => {
      expect((await login(ADMIN_EMAIL.toUpperCase())).status).toBe(200);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await login(ADMIN_EMAIL, 'not the password');
      const unknownEmail = await login('nobody@example.com', ADMIN_PASSWORD);

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(errorOf(wrongPassword).message).toBe(errorOf(unknownEmail).message);
      expect(refreshSetCookie(wrongPassword)).toBeUndefined();
    });

    it('validates the body', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(errorOf(res).details?.map((d) => d.path)).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
    });

    it('rejects operator injection in credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: { $gt: '' } });

      expect(res.status).toBe(422);
    });

    it('rate-limits repeated failures for an account', async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        expect((await login(ADMIN_EMAIL, 'wrong password')).status).toBe(401);
      }
      const blocked = await login(ADMIN_EMAIL, 'wrong password');

      expect(blocked.status).toBe(429);
      expect(errorOf(blocked).code).toBe('RATE_LIMITED');
      expect(blocked.headers['retry-after']).toBeDefined();
    });
  });

  describe('POST /refresh', () => {
    it('requires the CSRF header', async () => {
      const token = refreshTokenFrom(await login());
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookieHeader(token));

      expect(res.status).toBe(403);
    });

    it('rejects a missing cookie', async () => {
      const res = await request(app).post('/api/auth/refresh').set(CSRF);

      expect(res.status).toBe(401);
    });

    it('rotates the refresh token and issues a new access token', async () => {
      const first = refreshTokenFrom(await login());
      const res = await refresh(first);

      expect(res.status).toBe(200);
      expect(parseAuthResponse(res).accessToken).toBeTruthy();
      const second = refreshTokenFrom(res);
      expect(second).not.toBe(first);
      expect((await refresh(second)).status).toBe(200);
    });

    it('refuses a token replayed during the grace window without revoking anything', async () => {
      const first = refreshTokenFrom(await login());
      const second = refreshTokenFrom(await refresh(first));

      expect((await refresh(first)).status).toBe(401);
      expect((await refresh(second)).status).toBe(200);
    });

    it('revokes every session when a rotated token is replayed later (theft)', async () => {
      const first = refreshTokenFrom(await login());
      const second = refreshTokenFrom(await refresh(first));
      const otherDevice = refreshTokenFrom(await login());
      await SessionModel.updateMany(
        { rotatedAt: mongoose.trusted({ $exists: true }) },
        { $set: { rotatedAt: new Date(Date.now() - 60_000) } },
      );

      expect((await refresh(first)).status).toBe(401);
      expect((await refresh(second)).status).toBe(401);
      expect((await refresh(otherDevice)).status).toBe(401);
      expect(await SessionModel.countDocuments()).toBe(0);
    });

    it('rejects an expired session and clears the cookie', async () => {
      const token = refreshTokenFrom(await login());
      await SessionModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await refresh(token);

      expect(res.status).toBe(401);
      expect(refreshSetCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('stores only a hash of the refresh token', async () => {
      const token = refreshTokenFrom(await login());
      const session = await SessionModel.findOne().orFail();

      expect(session.tokenHash).not.toBe(token);
      expect(session.tokenHash).toMatch(/^[a-f\d]{64}$/);
    });
  });

  describe('POST /logout', () => {
    it('ends the session and clears the cookie', async () => {
      const token = refreshTokenFrom(await login());
      const res = await request(app)
        .post('/api/auth/logout')
        .set(CSRF)
        .set('Cookie', refreshCookieHeader(token));

      expect(res.status).toBe(204);
      expect(refreshSetCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect((await refresh(token)).status).toBe(401);
    });

    it('succeeds without a cookie', async () => {
      expect((await request(app).post('/api/auth/logout').set(CSRF)).status).toBe(204);
    });
  });

  describe('access tokens', () => {
    async function me(token?: string) {
      const req = request(app).get('/api/auth/me');
      return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
    }

    it('accepts a valid token', async () => {
      const { accessToken } = parseAuthResponse(await login());
      const res = await me(accessToken);

      expect(res.status).toBe(200);
      expect(meResponse.parse(res.body).data.email).toBe(ADMIN_EMAIL);
    });

    it('rejects missing, malformed and forged tokens', async () => {
      const admin = await AdminModel.findOne().orFail();
      const forged = signAccessToken(admin._id.toHexString(), {
        ...TEST_AUTH,
        accessSecret: 'a-different-secret-of-at-least-32-chars!!',
      });
      const unsigned = jwt.sign({ sub: admin._id.toHexString() }, '', { algorithm: 'none' });

      for (const token of [undefined, 'garbage', forged, unsigned]) {
        const res = await me(token);
        expect(res.status).toBe(401);
        expect(errorOf(res).code).toBe('UNAUTHENTICATED');
      }
    });

    it('reports an expired token as TOKEN_EXPIRED so the client can refresh', async () => {
      const admin = await AdminModel.findOne().orFail();
      const expired = signAccessToken(admin._id.toHexString(), TEST_AUTH, -10);
      const res = await me(expired);

      expect(res.status).toBe(401);
      expect(errorOf(res).code).toBe('TOKEN_EXPIRED');
    });

    it('rejects tokens issued before the password changed', async () => {
      const { accessToken } = parseAuthResponse(await login());
      await AdminModel.updateMany({}, { $set: { passwordChangedAt: new Date(Date.now() + 5000) } });

      expect(errorOf(await me(accessToken)).code).toBe('TOKEN_EXPIRED');
    });

    it('rejects tokens of a deleted admin', async () => {
      const { accessToken } = parseAuthResponse(await login());
      await AdminModel.deleteMany({});

      expect((await me(accessToken)).status).toBe(401);
    });
  });

  describe('PUT /password', () => {
    const NEW_PASSWORD = 'an even longer new password';

    it('requires the current password', async () => {
      const { accessToken } = parseAuthResponse(await login());
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'wrong password', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(422);
      expect(errorOf(res).details?.[0]?.path).toBe('currentPassword');
    });

    it('changes the password, keeps this session and ends the others', async () => {
      const loginRes = await login();
      const { accessToken } = parseAuthResponse(loginRes);
      const thisSession = refreshTokenFrom(loginRes);
      const otherSession = refreshTokenFrom(await login());

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookieHeader(thisSession))
        .send({ currentPassword: ADMIN_PASSWORD, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(204);
      expect((await refresh(otherSession)).status).toBe(401);
      expect((await refresh(thisSession)).status).toBe(200);
      expect((await login(ADMIN_EMAIL, ADMIN_PASSWORD)).status).toBe(401);
      expect((await login(ADMIN_EMAIL, NEW_PASSWORD)).status).toBe(200);
    });

    it('enforces the minimum length', async () => {
      const { accessToken } = parseAuthResponse(await login());
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: ADMIN_PASSWORD, newPassword: 'short' });

      expect(res.status).toBe(422);
    });
  });

  describe('admin area', () => {
    const paths = [
      '/api/admin',
      '/api/admin/tracks',
      '/api/admin/tracks/order',
      '/api/admin/tracks/64b7f0c2a1b2c3d4e5f60718',
      '/api/admin/albums',
      '/api/admin/albums/order',
      '/api/admin/albums/64b7f0c2a1b2c3d4e5f60718',
      '/api/admin/videos',
      '/api/admin/videos/order',
      '/api/admin/videos/64b7f0c2a1b2c3d4e5f60718',
      '/api/admin/gallery',
      '/api/admin/gallery/order',
      '/api/admin/gallery/64b7f0c2a1b2c3d4e5f60718',
      '/api/admin/uploads/signature',
      '/api/admin/uploads/verify',
      '/api/admin/anything/64b7f0c2a1b2c3d4e5f60718',
    ];

    it.each(paths)('requires authentication for every method on %s', async (path) => {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const res = await request(app)[method](path).send({});
        expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
        expect(res.headers['cache-control']).toBe('no-store');
      }
    });

    it('lets authenticated requests through to the admin routes', async () => {
      const { accessToken } = parseAuthResponse(await login());
      const res = await request(app)
        .get('/api/admin/not-built-yet')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('blocks cross-origin preflights for cookie endpoints from unknown origins', async () => {
      const preflight = (origin: string) =>
        request(app)
          .options('/api/auth/refresh')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'x-requested-with');

      expect((await preflight(TEST_ORIGIN)).headers['access-control-allow-origin']).toBe(
        TEST_ORIGIN,
      );
      expect(
        (await preflight('https://evil.example')).headers['access-control-allow-origin'],
      ).toBeUndefined();
    });
  });
});

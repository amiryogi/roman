import { Router, type Request, type Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

import { changePasswordInputSchema, loginInputSchema, type AuthResponseDto } from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import { isRecord } from '../../lib/guards.js';
import { sendData, sendNoContent } from '../../lib/respond.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { createRequireAuth, currentAdmin } from '../../middleware/requireAuth.js';
import type { AuthConfig } from './config.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  requireCsrfHeader,
  setRefreshCookie,
} from './cookies.js';
import { toAdminDto } from './mapper.js';
import { changePassword, login, logout, refreshSession, type IssuedSession } from './service.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function emailOf(body: unknown): string {
  return isRecord(body) && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
}

function clientIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? 'unknown');
}

function respondWithSession(res: Response, session: IssuedSession, config: AuthConfig): void {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt, config);
  const body: AuthResponseDto = {
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    admin: session.admin,
  };
  sendData(res, body);
}

/** `/api/auth/*` (plan §10.3). */
export function createAuthRouter(config: AuthConfig): Router {
  const router = Router();
  const requireAuth = createRequireAuth(config);

  // Only failed attempts count, so a legitimate admin is never locked out by their own logins.
  const loginPerAccount = createRateLimiter({
    windowMs: FIFTEEN_MINUTES,
    limit: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${clientIp(req)}:${emailOf(req.body)}`,
    message: 'Too many sign-in attempts. Please try again in 15 minutes.',
  });
  const loginPerIp = createRateLimiter({
    windowMs: ONE_HOUR,
    limit: 20,
    skipSuccessfulRequests: true,
    message: 'Too many sign-in attempts. Please try again later.',
  });
  const passwordChange = createRateLimiter({
    windowMs: ONE_HOUR,
    limit: 10,
    message: 'Too many attempts. Please try again later.',
  });

  router.post('/login', loginPerIp, loginPerAccount, async (req, res) => {
    const input = loginInputSchema.parse(req.body);
    const session = await login(input, config, req.get('user-agent'));
    respondWithSession(res, session, config);
  });

  router.post('/refresh', requireCsrfHeader, async (req, res) => {
    const token = readRefreshCookie(req);
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
    try {
      respondWithSession(res, await refreshSession(token, config, req.get('user-agent')), config);
    } catch (error) {
      clearRefreshCookie(res, config);
      throw error;
    }
  });

  router.post('/logout', requireCsrfHeader, async (req, res) => {
    const token = readRefreshCookie(req);
    if (token) await logout(token);
    clearRefreshCookie(res, config);
    sendNoContent(res);
  });

  router.get('/me', requireAuth, (req, res) => {
    sendData(res, toAdminDto(currentAdmin(req)));
  });

  router.put('/password', passwordChange, requireAuth, async (req, res) => {
    const input = changePasswordInputSchema.parse(req.body);
    await changePassword(currentAdmin(req), input, readRefreshCookie(req));
    sendNoContent(res);
  });

  return router;
}

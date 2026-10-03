import type { Express } from 'express';
import request, { type Response } from 'supertest';

import { apiSuccessSchema, authResponseDtoSchema, type AuthResponseDto } from '@roman/shared';

import { hashPassword } from '../src/lib/password.js';
import { AdminModel } from '../src/modules/auth/admin.model.js';
import { REFRESH_COOKIE_NAME } from '../src/modules/auth/config.js';

export const ADMIN_EMAIL = 'owner@example.com';
export const ADMIN_PASSWORD = 'a long test password';

const authResponseSchema = apiSuccessSchema(authResponseDtoSchema);

export async function createAdminUser(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  return AdminModel.create({
    email,
    name: 'Site Owner',
    passwordHash: await hashPassword(password),
  });
}

export function parseAuthResponse(res: Response): AuthResponseDto {
  return authResponseSchema.parse(res.body).data;
}

/** The refresh cookie as set by the response, e.g. "rb_refresh=abc; Path=/api/auth; HttpOnly…". */
export function refreshSetCookie(res: Response): string | undefined {
  return res.get('Set-Cookie')?.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`));
}

export function refreshTokenFrom(res: Response): string {
  const value = refreshSetCookie(res)
    ?.split(';')[0]
    ?.slice(REFRESH_COOKIE_NAME.length + 1);
  if (!value) throw new Error('Response did not set a refresh cookie');
  return value;
}

export function refreshCookieHeader(token: string): string {
  return `${REFRESH_COOKIE_NAME}=${token}`;
}

/** Creates the admin and signs in; returns an access token for `Authorization: Bearer`. */
export async function adminAccessToken(app: Express): Promise<string> {
  await createAdminUser();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return parseAuthResponse(res).accessToken;
}

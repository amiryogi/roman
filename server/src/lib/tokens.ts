import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { objectIdSchema } from '@roman/shared';

import type { AuthConfig } from '../modules/auth/config.js';
import { AppError } from './AppError.js';

const accessClaimsSchema = z.object({
  sub: objectIdSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

/** Short-lived HS256 access token. Contains only the admin id. */
export function signAccessToken(
  adminId: string,
  config: AuthConfig,
  ttlSeconds = config.accessTtlSeconds,
): string {
  return jwt.sign({}, config.accessSecret, {
    algorithm: 'HS256',
    subject: adminId,
    expiresIn: ttlSeconds,
    issuer: config.issuer,
    audience: config.audience,
  });
}

/** Verifies signature, algorithm, issuer, audience and expiry. Throws a 401 AppError otherwise. */
export function verifyAccessToken(token: string, config: AuthConfig): AccessClaims {
  let payload: unknown;
  try {
    payload = jwt.verify(token, config.accessSecret, {
      algorithms: ['HS256'],
      issuer: config.issuer,
      audience: config.audience,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired.');
    }
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
  }

  const claims = accessClaimsSchema.safeParse(payload);
  if (!claims.success) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
  return claims.data;
}

/** Opaque 256-bit refresh token. Only its hash is stored. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

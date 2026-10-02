import type { CookieOptions, Request, RequestHandler, Response } from 'express';

import { AppError } from '../../lib/AppError.js';
import {
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  type AuthConfig,
} from './config.js';

function cookieOptions(config: AuthConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  expires: Date,
  config: AuthConfig,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...cookieOptions(config), expires });
}

export function clearRefreshCookie(res: Response, config: AuthConfig): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(config));
}

/** Reads the refresh cookie from the raw header (one cookie doesn't justify a parser dependency). */
export function readRefreshCookie(req: Request): string | undefined {
  const header = req.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === REFRESH_COOKIE_NAME) {
      const value = part.slice(separator + 1).trim();
      return value === '' ? undefined : value;
    }
  }
  return undefined;
}

/**
 * Cookie-authenticated endpoints require a custom header. Cross-site forms can't send one, and
 * cross-origin scripts trigger a CORS preflight that fails for unknown origins (plan §11.2).
 */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    throw new AppError(403, 'FORBIDDEN', 'This request is missing a required header.');
  }
  next();
};

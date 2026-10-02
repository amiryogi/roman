/** Authentication settings, derived from the environment (plan §11, §21.2). */
export interface AuthConfig {
  accessSecret: string;
  issuer: string;
  audience: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  /** `Secure` flag on the refresh cookie. On in production. */
  secureCookies: boolean;
}

export const REFRESH_COOKIE_NAME = 'rb_refresh';
/** The refresh cookie is only ever sent to the auth endpoints. */
export const REFRESH_COOKIE_PATH = '/api/auth';
/** Header required on cookie-authenticated endpoints; it forces a CORS preflight (CSRF defence). */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'fetch';
/**
 * A rotated refresh token presented again within this window is treated as a race between
 * browser tabs (both sent the old cookie), not theft. It is refused but nothing is revoked.
 */
export const ROTATION_GRACE_MS = 15_000;

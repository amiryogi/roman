import { createHmac, timingSafeEqual } from 'node:crypto';

/** People need a few seconds to fill in the form; most bots post at once (plan §15). */
export const MIN_FILL_MS = 3000;
/** A form left open longer than this must be reloaded. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type FormTokenCheck = 'ok' | 'invalid' | 'too-fast' | 'expired';

function sign(secret: string, issuedAt: string): string {
  return createHmac('sha256', secret).update(`inquiry-form:${issuedAt}`).digest('base64url');
}

/** "<issued-at ms>.<signature>": proves when the form was shown, without storing anything. */
export function issueFormToken(secret: string, now = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(secret, issuedAt)}`;
}

export function checkFormToken(token: string, secret: string, now = Date.now()): FormTokenCheck {
  const [issuedAt = '', signature = ''] = token.split('.');
  if (!/^\d{13}$/.test(issuedAt)) return 'invalid';
  const expected = Buffer.from(sign(secret, issuedAt));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid';
  const age = now - Number(issuedAt);
  if (age < MIN_FILL_MS) return 'too-fast';
  if (age > MAX_AGE_MS) return 'expired';
  return 'ok';
}

/** Keyed hash of the client IP: lets abuse be spotted without storing addresses (plan §15). */
export function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(`ip:${ip}`).digest('hex');
}

import { z } from 'zod';

export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

/** Trimmed, required text with length bounds. */
export function text(max: number, min = 1) {
  return z.string().trim().min(min).max(max);
}

/**
 * Optional text where an empty string means "no value" (form-friendly).
 * Output: string | undefined. Used where the whole object is replaced (PUT, nested lists).
 */
export function optionalText(max: number) {
  return z
    .union([z.literal(''), text(max)])
    .transform((value) => (value === '' ? undefined : value))
    .optional();
}

/**
 * Optional text for PATCH-able resources: undefined = leave unchanged, '' or null = clear.
 * Output: string | null | undefined.
 */
export function clearableText(max: number) {
  return z
    .union([z.literal(''), z.null(), text(max)])
    .transform((value) => (value === '' ? null : value))
    .optional();
}

export const httpsUrlSchema = z
  .url({ protocol: /^https$/, error: 'Must be an https:// URL' })
  .max(2048);

export const optionalHttpsUrl = z
  .union([z.literal(''), httpsUrlSchema])
  .transform((value) => (value === '' ? undefined : value))
  .optional();

export const clearableHttpsUrl = z
  .union([z.literal(''), z.null(), httpsUrlSchema])
  .transform((value) => (value === '' ? null : value))
  .optional();

/** Calendar date without time, e.g. "2026-10-02". */
export const isoDateSchema = z.iso.date();

export const clearableIsoDate = z
  .union([z.literal(''), z.null(), isoDateSchema])
  .transform((value) => (value === '' ? null : value))
  .optional();

/** Instant with timezone, e.g. "2026-10-02T18:30:00+05:45" or "...Z". */
export const isoDateTimeSchema = z.iso.datetime({ offset: true, error: 'Enter a date and time' });

export const clearableIsoDateTime = z
  .union([z.literal(''), z.null(), isoDateTimeSchema])
  .transform((value) => (value === '' ? null : value))
  .optional();

export const emailSchema = z.email('Enter a valid email address').trim().max(254);

export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Invalid hex colour');

/** Query-string boolean: "true" | "false". */
export const queryBooleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z.string().trim().refine(isValidTimeZone, 'Unknown time zone');

export const DEFAULT_TIME_ZONE = 'Asia/Kathmandu';

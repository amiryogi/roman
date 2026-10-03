import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableText, emailSchema, isoDateSchema, optionalText, text } from '../common.js';
import { bookingEventTypeSchema, inquiryStatusSchema, inquiryTypeSchema } from '../enums.js';
import { PHONE_PATTERN } from './profile.js';

/** Today's date (UTC) minus `days`, as YYYY-MM-DD. One day of slack covers time zones. */
function isoDateDaysAgo(days: number, now: Date): string {
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/** Public contact/booking form (`POST /api/inquiries`). */
export const inquiryCreateInputSchema = z
  .strictObject({
    name: text(100, 2),
    email: emailSchema,
    phone: z
      .union([z.literal(''), z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number')])
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
    inquiryType: inquiryTypeSchema,
    eventType: bookingEventTypeSchema.optional(),
    preferredDate: z
      .union([z.literal(''), isoDateSchema])
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
    eventLocation: optionalText(200),
    message: text(5000, 10),
    /** Honeypot: hidden from people; bots fill it. Never stored. */
    website: z.string().max(200).optional(),
    /** Signed time the form was shown (GET /api/inquiries/form-token), for the minimum fill time. */
    formToken: z.string().min(1, 'Reload the page and try again').max(200),
  })
  .refine((value) => value.inquiryType !== 'booking' || value.eventType !== undefined, {
    path: ['eventType'],
    error: 'Choose the type of event',
  })
  .refine(
    (value) =>
      value.preferredDate === undefined || value.preferredDate >= isoDateDaysAgo(1, new Date()),
    { path: ['preferredDate'], error: 'Choose a date in the future' },
  );
export type InquiryCreateInput = z.input<typeof inquiryCreateInputSchema>;

/** GET /api/inquiries/form-token: a signed timestamp, sent back with the form. */
export const inquiryFormTokenDtoSchema = z.strictObject({ token: z.string() });
export type InquiryFormTokenDto = z.infer<typeof inquiryFormTokenDtoSchema>;

export const inquiryUpdateInputSchema = z.strictObject({
  status: inquiryStatusSchema.optional(),
  adminNotes: clearableText(5000),
});
export type InquiryUpdateInput = z.input<typeof inquiryUpdateInputSchema>;

export const inquiryDtoSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  inquiryType: inquiryTypeSchema,
  eventType: bookingEventTypeSchema.optional(),
  preferredDate: z.iso.date().optional(),
  eventLocation: z.string().optional(),
  message: z.string(),
  status: inquiryStatusSchema,
  adminNotes: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type InquiryDto = z.infer<typeof inquiryDtoSchema>;

export const inquiryReceiptDtoSchema = z.strictObject({
  id: z.string(),
  receivedAt: z.iso.datetime(),
});
export type InquiryReceiptDto = z.infer<typeof inquiryReceiptDtoSchema>;

export const inquiryAdminListQuerySchema = paginationQuerySchema(20).extend({
  status: inquiryStatusSchema.optional(),
  inquiryType: inquiryTypeSchema.optional(),
});

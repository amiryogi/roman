import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import {
  clearableHttpsUrl,
  clearableIsoDateTime,
  clearableText,
  isoDateTimeSchema,
  optionalText,
  text,
  timeZoneSchema,
} from '../common.js';
import { eventStatusSchema, eventTimeframeSchema, publicationStatusSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema } from '../media.js';
import { slugSchema } from '../slug.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

export const venueSchema = z.strictObject({
  name: text(150),
  address: optionalText(200),
  city: text(100),
  country: text(100),
});
export type Venue = z.infer<typeof venueSchema>;

const eventBaseInputSchema = publishingFieldsSchema.extend({
  title: text(150),
  slug: slugSchema.optional(),
  description: clearableText(3000),
  startsAt: isoDateTimeSchema,
  endsAt: clearableIsoDateTime,
  timezone: timeZoneSchema.optional(),
  venue: venueSchema,
  eventStatus: eventStatusSchema.optional(),
  ticketUrl: clearableHttpsUrl,
  infoUrl: clearableHttpsUrl,
  image: imageInputSchema.nullable().optional(),
});

function endsAfterStart(value: { startsAt?: string; endsAt?: string | null }): boolean {
  if (!value.startsAt || !value.endsAt) return true;
  return Date.parse(value.endsAt) > Date.parse(value.startsAt);
}

const ENDS_AFTER_START = { path: ['endsAt'], error: 'The end must be after the start' };

export const eventCreateInputSchema = eventBaseInputSchema.refine(endsAfterStart, ENDS_AFTER_START);
export type EventCreateInput = z.input<typeof eventCreateInputSchema>;

/** PATCH body. When only one of startsAt/endsAt is sent, the server checks the merged result. */
export const eventUpdateInputSchema = eventBaseInputSchema
  .partial()
  .refine(endsAfterStart, ENDS_AFTER_START);
export type EventUpdateInput = z.input<typeof eventUpdateInputSchema>;

export const eventDtoSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional(),
  timezone: z.string(),
  venue: venueSchema,
  eventStatus: eventStatusSchema,
  ticketUrl: z.string().optional(),
  infoUrl: z.string().optional(),
  image: imageDtoSchema.optional(),
  status: publicationStatusSchema,
  featured: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type EventDto = z.infer<typeof eventDtoSchema>;

export const eventsPublicQuerySchema = paginationQuerySchema(10).extend({
  when: eventTimeframeSchema,
});

export const eventAdminListQuerySchema = adminListQuerySchema(20).extend({
  when: eventTimeframeSchema.optional(),
});

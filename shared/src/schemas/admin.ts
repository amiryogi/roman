import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { objectIdSchema, text } from '../common.js';
import { publicationStatusSchema } from '../enums.js';

/** Fields every publishable content type accepts from the admin. */
export const publishingFieldsSchema = z.strictObject({
  status: publicationStatusSchema.optional(),
  featured: z.boolean().optional(),
});

/** `GET /api/admin/<resource>`: all statuses, optional title search. */
export function adminListQuerySchema(defaultLimit: number) {
  return paginationQuerySchema(defaultLimit).extend({
    status: publicationStatusSchema.optional(),
    q: text(100).optional(),
  });
}

/** `PATCH /api/admin/<resource>/order`: sortOrder is set from the array index. */
export const reorderInputSchema = z.strictObject({
  ids: z.array(objectIdSchema).min(1).max(200),
});
export type ReorderInput = z.infer<typeof reorderInputSchema>;

export const adminStatsDtoSchema = z.strictObject({
  inquiriesNew: z.number().int().min(0),
  tracks: z.number().int().min(0),
  videos: z.number().int().min(0),
  images: z.number().int().min(0),
  upcomingEvents: z.number().int().min(0),
  drafts: z.number().int().min(0),
});
export type AdminStatsDto = z.infer<typeof adminStatsDtoSchema>;

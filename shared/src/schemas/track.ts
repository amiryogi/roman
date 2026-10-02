import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableText, objectIdSchema, queryBooleanSchema, text } from '../common.js';
import { publicationStatusSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema, mediaAssetSchema, mediaRefSchema } from '../media.js';
import { slugSchema } from '../slug.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

export const DEFAULT_ARTIST_CREDIT = 'Roman Budhathoki';

export const trackCreateInputSchema = publishingFieldsSchema.extend({
  title: text(150),
  slug: slugSchema.optional(),
  albumId: objectIdSchema.nullable().optional(),
  trackNumber: z.number().int().min(1).max(999).nullable().optional(),
  artistCredit: text(150).optional(),
  credits: clearableText(500),
  description: clearableText(2000),
  audio: mediaRefSchema.refine((ref) => ref.resourceType === 'video', {
    error: 'Audio must be uploaded as a Cloudinary video resource',
  }),
  cover: imageInputSchema.nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  tags: z.array(text(30).toLowerCase()).max(10).optional(),
});
export type TrackCreateInput = z.input<typeof trackCreateInputSchema>;

export const trackUpdateInputSchema = trackCreateInputSchema.partial();
export type TrackUpdateInput = z.input<typeof trackUpdateInputSchema>;

export const trackAlbumRefSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
});

export const trackDtoSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  album: trackAlbumRefSchema.optional(),
  trackNumber: z.number().int().optional(),
  artistCredit: z.string(),
  credits: z.string().optional(),
  description: z.string().optional(),
  audio: mediaAssetSchema,
  duration: z.number().nonnegative(),
  cover: imageDtoSchema.optional(),
  year: z.number().int().optional(),
  tags: z.array(z.string()),
  status: publicationStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type TrackDto = z.infer<typeof trackDtoSchema>;

export const tracksPublicQuerySchema = paginationQuerySchema(20).extend({
  featured: queryBooleanSchema,
  album: slugSchema.optional(),
});

export const trackAdminListQuerySchema = adminListQuerySchema(20).extend({
  albumId: objectIdSchema.optional(),
});

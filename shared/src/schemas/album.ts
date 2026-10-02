import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableIsoDate, clearableText, httpsUrlSchema, text } from '../common.js';
import { publicationStatusSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema } from '../media.js';
import { slugSchema } from '../slug.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

export const externalLinkSchema = z.strictObject({
  label: text(60),
  url: httpsUrlSchema,
});
export type ExternalLink = z.infer<typeof externalLinkSchema>;

export const albumCreateInputSchema = publishingFieldsSchema.extend({
  title: text(150),
  slug: slugSchema.optional(),
  description: clearableText(2000),
  releaseDate: clearableIsoDate,
  cover: imageInputSchema.nullable().optional(),
  externalLinks: z.array(externalLinkSchema).max(10).optional(),
});
export type AlbumCreateInput = z.input<typeof albumCreateInputSchema>;

export const albumUpdateInputSchema = albumCreateInputSchema.partial();
export type AlbumUpdateInput = z.input<typeof albumUpdateInputSchema>;

export const albumDtoSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  releaseDate: z.iso.date().optional(),
  cover: imageDtoSchema.optional(),
  externalLinks: z.array(externalLinkSchema),
  status: publicationStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number(),
  trackCount: z.number().int().min(0).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AlbumDto = z.infer<typeof albumDtoSchema>;

export const albumAdminListQuerySchema = adminListQuerySchema(20);

export const albumDeleteQuerySchema = z.object({
  detachTracks: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const albumsPublicQuerySchema = paginationQuerySchema(20);

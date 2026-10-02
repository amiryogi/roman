import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableIsoDate, clearableText, objectIdSchema } from '../common.js';
import { galleryCategorySchema, publicationStatusSchema } from '../enums.js';
import { altTextSchema, mediaAssetSchema, mediaRefSchema } from '../media.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

export const galleryImageCreateInputSchema = publishingFieldsSchema.extend({
  image: mediaRefSchema.refine((ref) => ref.resourceType === 'image', {
    error: 'Gallery items must be images',
  }),
  alt: altTextSchema,
  caption: clearableText(300),
  category: galleryCategorySchema,
  eventId: objectIdSchema.nullable().optional(),
  takenAt: clearableIsoDate,
  photographerCredit: clearableText(120),
});
export type GalleryImageCreateInput = z.input<typeof galleryImageCreateInputSchema>;

export const galleryImageUpdateInputSchema = galleryImageCreateInputSchema.partial();
export type GalleryImageUpdateInput = z.input<typeof galleryImageUpdateInputSchema>;

export const galleryImageDtoSchema = z.strictObject({
  id: z.string(),
  image: mediaAssetSchema,
  alt: z.string(),
  caption: z.string().optional(),
  category: galleryCategorySchema,
  eventId: z.string().optional(),
  takenAt: z.iso.date().optional(),
  photographerCredit: z.string().optional(),
  status: publicationStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type GalleryImageDto = z.infer<typeof galleryImageDtoSchema>;

export const galleryPublicQuerySchema = paginationQuerySchema(24).extend({
  category: galleryCategorySchema.optional(),
});

export const galleryAdminListQuerySchema = adminListQuerySchema(24).extend({
  category: galleryCategorySchema.optional(),
});

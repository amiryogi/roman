import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableHttpsUrl, clearableText, text } from '../common.js';
import { publicationStatusSchema, sheetMusicLevelSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema } from '../media.js';
import { slugSchema } from '../slug.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

/*
 * Sheet music (2026-10 revamp): a catalogue of scores Roman can send. Visitors request a score
 * through the contact form (enquiry type "sheet-music"); scores aren't hosted as files.
 */

export const sheetMusicCreateInputSchema = publishingFieldsSchema.extend({
  title: text(150),
  slug: slugSchema.optional(),
  /** Who wrote or made the song famous, e.g. "Bobby Helms". */
  artist: clearableText(120),
  description: clearableText(1000),
  level: sheetMusicLevelSchema.nullable().optional(),
  /** An image of the score's first lines. */
  preview: imageInputSchema.nullable().optional(),
  /** Where the score can be bought, if Roman sells it elsewhere. */
  externalUrl: clearableHttpsUrl,
});
export type SheetMusicCreateInput = z.input<typeof sheetMusicCreateInputSchema>;

export const sheetMusicUpdateInputSchema = sheetMusicCreateInputSchema.partial();
export type SheetMusicUpdateInput = z.input<typeof sheetMusicUpdateInputSchema>;

export const sheetMusicDtoSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  artist: z.string().optional(),
  description: z.string().optional(),
  level: sheetMusicLevelSchema.optional(),
  preview: imageDtoSchema.optional(),
  externalUrl: z.string().optional(),
  status: publicationStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SheetMusicDto = z.infer<typeof sheetMusicDtoSchema>;

export const sheetMusicPublicQuerySchema = paginationQuerySchema(24);

export const sheetMusicAdminListQuerySchema = adminListQuerySchema(24);

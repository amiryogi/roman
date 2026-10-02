import { z } from 'zod';

import { paginationQuerySchema } from '../api.js';
import { clearableIsoDate, clearableText, text } from '../common.js';
import { publicationStatusSchema, videoCategorySchema, videoSourceSchema } from '../enums.js';
import { imageDtoSchema, imageInputSchema, mediaAssetSchema, mediaRefSchema } from '../media.js';
import { slugSchema } from '../slug.js';
import { adminListQuerySchema, publishingFieldsSchema } from './admin.js';

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
// watch?v=, embed/, shorts/, live/, youtu.be/ and youtube-nocookie embeds, on known hosts only.
const YOUTUBE_URL_PATTERN =
  /^(?:https?:\/\/)?(?:(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|(?:www\.)?youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;

/** Accepts a bare 11-character ID or a common YouTube URL; returns the ID or null. */
export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID_PATTERN.test(value)) return value;
  return YOUTUBE_URL_PATTERN.exec(value)?.[1] ?? null;
}

export const youtubeInputSchema = z
  .string()
  .trim()
  .refine((value) => extractYouTubeId(value) !== null, 'Enter a valid YouTube URL or video ID')
  .transform((value) => extractYouTubeId(value) ?? value);

const videoCommonInputSchema = publishingFieldsSchema.extend({
  title: text(150),
  slug: slugSchema.optional(),
  description: clearableText(2000),
  poster: imageInputSchema.nullable().optional(),
  category: videoCategorySchema,
  recordedAt: clearableIsoDate,
  venue: clearableText(200),
});

export const videoCreateInputSchema = z.discriminatedUnion('source', [
  videoCommonInputSchema.extend({
    source: z.literal('cloudinary'),
    mediaRef: mediaRefSchema.refine((ref) => ref.resourceType === 'video', {
      error: 'Video must be a Cloudinary video resource',
    }),
  }),
  videoCommonInputSchema.extend({
    source: z.literal('youtube'),
    youtube: youtubeInputSchema,
  }),
]);
export type VideoCreateInput = z.input<typeof videoCreateInputSchema>;

/**
 * PATCH body. Switching `source` requires the matching `mediaRef` or `youtube` field;
 * the server validates the merged result.
 */
export const videoUpdateInputSchema = videoCommonInputSchema.partial().extend({
  source: videoSourceSchema.optional(),
  mediaRef: mediaRefSchema.optional(),
  youtube: youtubeInputSchema.optional(),
});
export type VideoUpdateInput = z.input<typeof videoUpdateInputSchema>;

const videoCommonDtoFields = {
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  poster: imageDtoSchema.optional(),
  category: videoCategorySchema,
  recordedAt: z.iso.date().optional(),
  venue: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  status: publicationStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const videoDtoSchema = z.discriminatedUnion('source', [
  z.strictObject({
    ...videoCommonDtoFields,
    source: z.literal('cloudinary'),
    media: mediaAssetSchema,
  }),
  z.strictObject({
    ...videoCommonDtoFields,
    source: z.literal('youtube'),
    youtubeId: z.string().regex(YOUTUBE_ID_PATTERN),
  }),
]);
export type VideoDto = z.infer<typeof videoDtoSchema>;

export const videosPublicQuerySchema = paginationQuerySchema(12).extend({
  category: videoCategorySchema.optional(),
});

export const videoAdminListQuerySchema = adminListQuerySchema(20).extend({
  category: videoCategorySchema.optional(),
});

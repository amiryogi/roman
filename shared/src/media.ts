import { z } from 'zod';

import { hexColorSchema, text } from './common.js';
import { mediaResourceTypeSchema } from './enums.js';

/**
 * Cloudinary asset reference as stored in MongoDB and returned by the API (plan §8.2).
 * Delivery URLs are derived on the client from publicId + version; they are never stored.
 * Audio is stored by Cloudinary with resourceType "video".
 */
export const mediaAssetSchema = z.strictObject({
  publicId: z.string().min(1).max(255),
  resourceType: mediaResourceTypeSchema,
  version: z.number().int().nonnegative(),
  format: z.string().min(1).max(10),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  dominantColor: hexColorSchema.optional(),
  originalFilename: z.string().max(255).optional(),
});
export type MediaAssetDto = z.infer<typeof mediaAssetSchema>;

/**
 * What the admin client sends after a direct Cloudinary upload. The server re-reads all
 * metadata from Cloudinary; nothing else from the client is trusted.
 */
export const mediaRefSchema = z.strictObject({
  publicId: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[\w\-/]+$/, 'Invalid media id'),
  resourceType: mediaResourceTypeSchema,
});
export type MediaRef = z.infer<typeof mediaRefSchema>;

export const altTextSchema = text(250, 5);

export const imageDtoSchema = z.strictObject({
  asset: mediaAssetSchema,
  alt: z.string(),
});
export type ImageDto = z.infer<typeof imageDtoSchema>;

/**
 * An image slot in a form. Omit `mediaRef` to keep the current image and only change its alt text.
 * Send `null` for the whole slot to remove the image.
 */
export const imageInputSchema = z.strictObject({
  mediaRef: mediaRefSchema.optional(),
  alt: altTextSchema,
});
export type ImageInput = z.infer<typeof imageInputSchema>;

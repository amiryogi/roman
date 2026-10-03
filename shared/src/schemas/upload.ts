import { z } from 'zod';

import { uploadKindSchema, type MediaResourceType, type UploadKind } from '../enums.js';
import { mediaAssetSchema, mediaRefSchema } from '../media.js';

/** What a file is, as opposed to how Cloudinary stores it (audio is a "video" resource). */
export const MEDIA_KINDS = ['image', 'audio', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Accepted file formats (plan §9.2). Enforced by the browser, by Cloudinary and on verification. */
export const MEDIA_FORMATS: Record<MediaKind, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'],
  video: ['mp4', 'mov', 'webm'],
};

export interface UploadKindRule {
  mediaKind: MediaKind;
  resourceType: MediaResourceType;
  /** Folder below the environment's root folder (plan §9.1). */
  folder: string;
}

/** Fixed per-kind upload rules. The client only names the kind; it can't choose any of these. */
export const UPLOAD_KIND_RULES: Record<UploadKind, UploadKindRule> = {
  profile: { mediaKind: 'image', resourceType: 'image', folder: 'profile' },
  gallery: { mediaKind: 'image', resourceType: 'image', folder: 'gallery' },
  'track-audio': { mediaKind: 'audio', resourceType: 'video', folder: 'music/audio' },
  'track-cover': { mediaKind: 'image', resourceType: 'image', folder: 'music/covers' },
  'album-cover': { mediaKind: 'image', resourceType: 'image', folder: 'music/covers' },
  video: { mediaKind: 'video', resourceType: 'video', folder: 'videos/media' },
  'video-poster': { mediaKind: 'image', resourceType: 'image', folder: 'videos/posters' },
  event: { mediaKind: 'image', resourceType: 'image', folder: 'events' },
};

/** Lower-case extension of a file name, without the dot ("" if there is none). */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// --- POST /api/admin/uploads/signature ---------------------------------------------------------

export const uploadSignatureInputSchema = z.strictObject({ kind: uploadKindSchema });
export type UploadSignatureInput = z.infer<typeof uploadSignatureInputSchema>;

/**
 * Everything the browser needs for a signed direct upload. The browser posts `params`, `api_key`,
 * `timestamp`, `signature` and the file to `uploadUrl`. `params` are signed: changing any of them
 * makes Cloudinary reject the upload.
 */
export const uploadSignatureDtoSchema = z.strictObject({
  kind: uploadKindSchema,
  cloudName: z.string().min(1),
  apiKey: z.string().min(1),
  timestamp: z.number().int().positive(),
  signature: z.string().min(1),
  uploadUrl: z.url({ protocol: /^https$/ }),
  params: z.record(z.string(), z.string()),
  constraints: z.strictObject({
    resourceType: z.enum(['image', 'video']),
    allowedFormats: z.array(z.string()),
    maxBytes: z.number().int().positive(),
  }),
});
export type UploadSignatureDto = z.infer<typeof uploadSignatureDtoSchema>;

// --- POST /api/admin/uploads/verify ------------------------------------------------------------

/** Checks an upload right away, so the admin learns about a problem before saving a form. */
export const uploadVerifyInputSchema = z.strictObject({
  kind: uploadKindSchema,
  mediaRef: mediaRefSchema,
});
export type UploadVerifyInput = z.infer<typeof uploadVerifyInputSchema>;

export const uploadVerifyDtoSchema = z.strictObject({ asset: mediaAssetSchema });
export type UploadVerifyDto = z.infer<typeof uploadVerifyDtoSchema>;

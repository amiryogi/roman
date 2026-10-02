import {
  MEDIA_DELIVERY_TYPE,
  MEDIA_FORMATS,
  UPLOAD_KIND_RULES,
  type MediaRef,
  type UploadKind,
  type UploadKindRule,
} from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import type { MediaAssetDoc } from '../../lib/mongo.js';
import {
  isUnderFolder,
  uploadFolder,
  type AssetRef,
  type MediaLimits,
  type MediaService,
  type ProviderResource,
} from './MediaService.js';

const MEGABYTE = 1024 * 1024;

/** Why an uploaded asset is unacceptable for a kind, or undefined if it is fine. */
export function findUploadProblem(
  resource: ProviderResource,
  rule: UploadKindRule,
  limits: MediaLimits,
): string | undefined {
  if (resource.resourceType !== rule.resourceType || resource.type !== MEDIA_DELIVERY_TYPE) {
    return 'This file was not uploaded as the expected type of media.';
  }
  const formats = MEDIA_FORMATS[rule.mediaKind];
  if (!formats.includes(resource.format.toLowerCase())) {
    return `This file type is not allowed here. Use one of: ${formats.join(', ')}.`;
  }
  const maxBytes = limits.maxBytes[rule.mediaKind];
  if (resource.bytes > maxBytes) {
    return `This file is larger than the ${String(Math.round(maxBytes / MEGABYTE))} MB limit.`;
  }
  const hasSize = Boolean(resource.width && resource.height);
  const hasDuration = resource.duration !== undefined && resource.duration > 0;
  switch (rule.mediaKind) {
    case 'image':
      return hasSize ? undefined : 'The image dimensions could not be read.';
    case 'audio':
      return hasDuration ? undefined : 'The audio length could not be read.';
    case 'video':
      return hasSize && hasDuration ? undefined : 'The video could not be read.';
  }
}

/** Builds the stored reference from the provider's metadata only, never from client input. */
export function toMediaAssetDoc(resource: ProviderResource, rule: UploadKindRule): MediaAssetDoc {
  const asset: MediaAssetDoc = {
    publicId: resource.publicId,
    resourceType: resource.resourceType,
    version: resource.version,
    format: resource.format.toLowerCase(),
    bytes: resource.bytes,
  };
  if (rule.mediaKind !== 'audio') {
    asset.width = resource.width;
    asset.height = resource.height;
  }
  if (rule.mediaKind !== 'image' && resource.duration !== undefined) {
    asset.duration = Math.round(resource.duration * 100) / 100;
  }
  if (rule.mediaKind === 'image' && resource.dominantColor) {
    asset.dominantColor = resource.dominantColor;
  }
  if (resource.originalFilename) {
    asset.originalFilename = resource.originalFilename.slice(0, 255);
  }
  return asset;
}

/**
 * Verifies a direct upload before it is stored (plan §9.2 step 5): the asset must exist, sit in
 * the folder for its kind, and have an allowed format, size and readable dimensions/duration.
 *
 * An asset that is in the right folder but fails the checks is destroyed. An asset in any other
 * folder is only rejected: it may belong to other content, so it is never deleted from here.
 */
export async function verifyUpload(
  media: MediaService,
  kind: UploadKind,
  ref: MediaRef,
  logger: Logger,
): Promise<MediaAssetDoc> {
  const rule = UPLOAD_KIND_RULES[kind];
  const folder = uploadFolder(media.rootFolder, rule.folder);
  if (ref.resourceType !== rule.resourceType || !isUnderFolder(ref.publicId, folder)) {
    throw AppError.mediaInvalid(
      'This file was not uploaded for this field. Please upload it again.',
    );
  }

  const resource = await media.getResource(ref);
  if (!resource) {
    throw AppError.mediaInvalid('The upload could not be found. Please upload it again.');
  }

  const problem = findUploadProblem(resource, rule, media.limits);
  if (problem) {
    await destroyQuietly(media, ref, logger);
    throw AppError.mediaInvalid(problem);
  }
  return toMediaAssetDoc(resource, rule);
}

/**
 * Deletes an asset that is no longer needed. Failures are logged, not thrown: the content change
 * has already succeeded, and `npm run cleanup:media` removes anything left behind (plan §9.2).
 */
export async function destroyQuietly(
  media: MediaService,
  ref: AssetRef,
  logger: Logger,
): Promise<void> {
  try {
    await media.destroy(ref);
  } catch (error) {
    logger.warn({ err: error, publicId: ref.publicId }, 'Could not delete media asset');
  }
}

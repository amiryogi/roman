import type { ImageInput, MediaRef, UploadKind } from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import type { ImageDoc, MediaAssetDoc } from '../../lib/mongo.js';
import type { AssetRef, MediaService } from './MediaService.js';
import { destroyQuietly, verifyUpload } from './verify.js';

/** A plain copy, so it stays valid after the document field is replaced. */
function assetRef(asset: MediaAssetDoc): AssetRef {
  return { publicId: asset.publicId, resourceType: asset.resourceType };
}

/** The value to store, plus assets to delete once the database write has succeeded. */
export interface SlotChange<T> {
  value: T;
  obsolete: AssetRef[];
}

/**
 * A required media field (e.g. a track's audio). Re-sending the current asset keeps it without
 * asking Cloudinary again; a new asset is verified and the old one becomes obsolete.
 */
export async function resolveMediaRef(
  media: MediaService,
  kind: UploadKind,
  ref: MediaRef,
  current: MediaAssetDoc | undefined,
  logger: Logger,
): Promise<SlotChange<MediaAssetDoc>> {
  if (current?.publicId === ref.publicId && current.resourceType === ref.resourceType) {
    return { value: current, obsolete: [] };
  }
  const value = await verifyUpload(media, kind, ref, logger);
  return { value, obsolete: current ? [assetRef(current)] : [] };
}

/**
 * An optional image with alt text (cover, poster, portrait…), as sent by admin forms:
 * `undefined` keeps it, `null` removes it, `{ alt }` changes only the alt text, and
 * `{ mediaRef, alt }` sets a new image.
 */
export async function resolveImageSlot(
  media: MediaService,
  kind: UploadKind,
  input: ImageInput | null | undefined,
  current: ImageDoc | undefined,
  logger: Logger,
  field: string,
): Promise<SlotChange<ImageDoc | undefined>> {
  if (input === undefined) return { value: current, obsolete: [] };
  if (input === null)
    return { value: undefined, obsolete: current ? [assetRef(current.asset)] : [] };
  if (!input.mediaRef) {
    if (!current) {
      throw AppError.validation('Upload an image first.', [
        { path: `${field}.mediaRef`, message: 'Upload an image first' },
      ]);
    }
    return { value: { asset: current.asset, alt: input.alt }, obsolete: [] };
  }
  const asset = await resolveMediaRef(media, kind, input.mediaRef, current?.asset, logger);
  return { value: { asset: asset.value, alt: input.alt }, obsolete: asset.obsolete };
}

/** Deletes assets that are no longer referenced. Failures are logged (plan §9.2 step 6). */
export async function destroyAll(
  media: MediaService,
  assets: readonly AssetRef[],
  logger: Logger,
): Promise<void> {
  for (const asset of assets) await destroyQuietly(media, asset, logger);
}

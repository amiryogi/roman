import type { MediaKind, MediaResourceType, UploadKind, UploadSignatureDto } from '@roman/shared';

import { AppError } from '../../lib/AppError.js';

/**
 * The one intentional abstraction over Cloudinary (plan ADR-14), so tests and E2E runs work
 * without an account or network. Verification rules live in `verify.ts` and apply to every driver.
 */
export interface MediaService {
  readonly driver: 'cloudinary' | 'fake';
  /** e.g. "roman-budhathoki/production". Every asset this site manages lives below it. */
  readonly rootFolder: string;
  readonly limits: MediaLimits;

  /** Signed parameters for one direct browser upload of the given kind (plan §9.2). */
  createUploadSignature(kind: UploadKind): Promise<UploadSignatureDto>;
  /** The provider's metadata for an asset, or null if it doesn't exist. */
  getResource(ref: AssetRef): Promise<ProviderResource | null>;
  /** Deletes an asset. Refuses anything outside the root folder. Missing assets are not an error. */
  destroy(ref: AssetRef): Promise<void>;
  /** Every asset of one resource type below the root folder (orphan cleanup). */
  listResources(resourceType: MediaResourceType): Promise<ProviderResource[]>;
  /**
   * Server-side upload of a local file, for seed scripts only. `name` becomes the last segment of
   * the public ID, so re-running a seed finds the same asset. Existing assets are not overwritten.
   */
  uploadFile(kind: UploadKind, filePath: string, name: string): Promise<AssetRef>;
}

export interface MediaLimits {
  maxBytes: Record<MediaKind, number>;
}

export interface AssetRef {
  publicId: string;
  resourceType: MediaResourceType;
}

/** Asset metadata as reported by the provider: the only metadata the server trusts. */
export interface ProviderResource extends AssetRef {
  /** Delivery type; this site uses MEDIA_DELIVERY_TYPE ("private"). */
  type: string;
  version: number;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  /** Most prominent colour, lower-case "#rrggbb". */
  dominantColor?: string;
  originalFilename?: string;
  createdAt: Date;
}

/** The media provider failed or is unreachable (plan §10.5: 502). */
export class MediaProviderError extends AppError {
  constructor(options?: { cause?: unknown }) {
    super(
      502,
      'MEDIA_PROVIDER_ERROR',
      'The media service is unavailable. Please try again shortly.',
    );
    if (options && 'cause' in options) this.cause = options.cause;
  }
}

/** Folder for one upload kind, e.g. "roman-budhathoki/production/music/audio". */
export function uploadFolder(rootFolder: string, folder: string): string {
  return `${rootFolder}/${folder}`;
}

export function isUnderFolder(publicId: string, folder: string): boolean {
  return publicId.startsWith(`${folder}/`) && !publicId.includes('..');
}

export function assertUnderRoot(publicId: string, rootFolder: string): void {
  if (!isUnderFolder(publicId, rootFolder)) {
    throw new Error(`Refusing to touch "${publicId}": it is outside ${rootFolder}/`);
  }
}

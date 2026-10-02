import { Schema, type Types } from 'mongoose';

import {
  MEDIA_RESOURCE_TYPES,
  PUBLICATION_STATUSES,
  type ImageDto,
  type MediaAssetDto,
  type MediaResourceType,
  type PublicationStatus,
} from '@roman/shared';

/** A lean document as returned by `.lean()`. */
export type WithId<T> = T & { _id: Types.ObjectId };

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishingFields {
  status: PublicationStatus;
  featured: boolean;
  sortOrder: number;
}

const DEFAULT_STATUS: PublicationStatus = 'draft';

/** Shared schema paths for publishable content. New items sort last by default. */
export const publishingPaths = {
  status: {
    type: String,
    enum: [...PUBLICATION_STATUSES],
    default: DEFAULT_STATUS,
    required: true,
  },
  featured: { type: Boolean, default: false, required: true },
  sortOrder: { type: Number, default: () => Date.now(), required: true },
};

// --- Media (plan §8.2) -------------------------------------------------------------------------

export interface MediaAssetDoc {
  publicId: string;
  resourceType: MediaResourceType;
  version: number;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  dominantColor?: string;
  originalFilename?: string;
}

export interface ImageDoc {
  asset: MediaAssetDoc;
  alt: string;
}

export const mediaAssetSchema = new Schema<MediaAssetDoc>(
  {
    publicId: { type: String, required: true, maxlength: 255 },
    resourceType: { type: String, enum: [...MEDIA_RESOURCE_TYPES], required: true },
    version: { type: Number, required: true, min: 0 },
    format: { type: String, required: true, maxlength: 10 },
    bytes: { type: Number, required: true, min: 0 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    duration: { type: Number, min: 0 },
    dominantColor: { type: String, match: /^#[0-9a-f]{6}$/i },
    originalFilename: { type: String, maxlength: 255 },
  },
  { _id: false },
);

export const imageSchema = new Schema<ImageDoc>(
  {
    asset: { type: mediaAssetSchema, required: true },
    alt: { type: String, required: true, trim: true, maxlength: 250 },
  },
  { _id: false },
);

export function toMediaAssetDto(doc: MediaAssetDoc): MediaAssetDto {
  return {
    publicId: doc.publicId,
    resourceType: doc.resourceType,
    version: doc.version,
    format: doc.format,
    bytes: doc.bytes,
    width: doc.width,
    height: doc.height,
    duration: doc.duration,
    dominantColor: doc.dominantColor,
    originalFilename: doc.originalFilename,
  };
}

export function toImageDto(doc: ImageDoc | undefined): ImageDto | undefined {
  return doc ? { asset: toMediaAssetDto(doc.asset), alt: doc.alt } : undefined;
}

export function toPublishingDto(doc: PublishingFields): PublishingFields {
  return { status: doc.status, featured: doc.featured, sortOrder: doc.sortOrder };
}

export function toTimestampsDto(doc: Timestamps): { createdAt: string; updatedAt: string } {
  return { createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}

import { model, Schema, type Types } from 'mongoose';

import { GALLERY_CATEGORIES, type GalleryCategory } from '@roman/shared';

import {
  mediaAssetSchema,
  publishingPaths,
  type MediaAssetDoc,
  type PublishingFields,
  type Timestamps,
} from '../../lib/mongo.js';

export interface GalleryImageDoc extends PublishingFields, Timestamps {
  image: MediaAssetDoc;
  alt: string;
  caption?: string;
  category: GalleryCategory;
  event?: Types.ObjectId;
  takenAt?: Date;
  photographerCredit?: string;
}

const galleryImageSchema = new Schema<GalleryImageDoc>(
  {
    image: { type: mediaAssetSchema, required: true },
    alt: { type: String, required: true, trim: true, minlength: 5, maxlength: 250 },
    caption: { type: String, maxlength: 300 },
    category: { type: String, enum: [...GALLERY_CATEGORIES], required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event' },
    takenAt: Date,
    photographerCredit: { type: String, maxlength: 120 },
    ...publishingPaths,
  },
  { timestamps: true },
);

galleryImageSchema.index({ status: 1, sortOrder: 1 });
galleryImageSchema.index({ status: 1, category: 1, sortOrder: 1 });
galleryImageSchema.index({ status: 1, featured: 1, sortOrder: 1 });

export const GalleryImageModel = model<GalleryImageDoc>('GalleryImage', galleryImageSchema);

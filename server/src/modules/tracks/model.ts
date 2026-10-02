import { model, Schema, type Types } from 'mongoose';

import { DEFAULT_ARTIST_CREDIT } from '@roman/shared';

import {
  imageSchema,
  mediaAssetSchema,
  publishingPaths,
  type ImageDoc,
  type MediaAssetDoc,
  type PublishingFields,
  type Timestamps,
} from '../../lib/mongo.js';

export interface TrackDoc extends PublishingFields, Timestamps {
  title: string;
  slug: string;
  album?: Types.ObjectId;
  trackNumber?: number;
  artistCredit: string;
  credits?: string;
  description?: string;
  /** Cloudinary resource type "video"; duration comes from Cloudinary. */
  audio: MediaAssetDoc;
  cover?: ImageDoc;
  year?: number;
  tags: string[];
}

const trackSchema = new Schema<TrackDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    album: { type: Schema.Types.ObjectId, ref: 'Album' },
    trackNumber: { type: Number, min: 1, max: 999 },
    artistCredit: { type: String, required: true, default: DEFAULT_ARTIST_CREDIT, maxlength: 150 },
    credits: { type: String, maxlength: 500 },
    description: { type: String, maxlength: 2000 },
    audio: { type: mediaAssetSchema, required: true },
    cover: imageSchema,
    year: { type: Number, min: 1900, max: 2100 },
    tags: { type: [String], default: [] },
    ...publishingPaths,
  },
  { timestamps: true },
);

// Public list: published, featured first, then manual order. Also serves featured-only queries.
trackSchema.index({ status: 1, featured: -1, sortOrder: 1 });
trackSchema.index({ album: 1, trackNumber: 1 });

export const TrackModel = model<TrackDoc>('Track', trackSchema);

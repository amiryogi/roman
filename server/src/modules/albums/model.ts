import { model, Schema } from 'mongoose';

import {
  imageSchema,
  publishingPaths,
  type ImageDoc,
  type PublishingFields,
  type Timestamps,
} from '../../lib/mongo.js';

export interface AlbumDoc extends PublishingFields, Timestamps {
  title: string;
  slug: string;
  description?: string;
  releaseDate?: Date;
  cover?: ImageDoc;
  externalLinks: { label: string; url: string }[];
}

const albumSchema = new Schema<AlbumDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    description: { type: String, maxlength: 2000 },
    releaseDate: Date,
    cover: imageSchema,
    externalLinks: [
      new Schema(
        { label: { type: String, required: true }, url: { type: String, required: true } },
        { _id: false },
      ),
    ],
    ...publishingPaths,
  },
  { timestamps: true },
);

albumSchema.index({ status: 1, sortOrder: 1 });

export const AlbumModel = model<AlbumDoc>('Album', albumSchema);

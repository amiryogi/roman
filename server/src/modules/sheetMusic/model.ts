import { model, Schema } from 'mongoose';

import { SHEET_MUSIC_LEVELS, type SheetMusicLevel } from '@roman/shared';

import {
  imageSchema,
  publishingPaths,
  type ImageDoc,
  type PublishingFields,
  type Timestamps,
} from '../../lib/mongo.js';

/** A score Roman can send (2026-10 revamp). Requested through the contact form, not downloaded. */
export interface SheetMusicDoc extends PublishingFields, Timestamps {
  title: string;
  slug: string;
  artist?: string;
  description?: string;
  level?: SheetMusicLevel;
  preview?: ImageDoc;
  externalUrl?: string;
}

const sheetMusicSchema = new Schema<SheetMusicDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    artist: { type: String, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    level: { type: String, enum: [...SHEET_MUSIC_LEVELS] },
    preview: imageSchema,
    externalUrl: { type: String, maxlength: 2048 },
    ...publishingPaths,
  },
  { timestamps: true },
);

sheetMusicSchema.index({ status: 1, sortOrder: 1 });

export const SheetMusicModel = model<SheetMusicDoc>('SheetMusic', sheetMusicSchema, 'sheetmusic');

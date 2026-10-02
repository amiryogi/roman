import { model, Schema } from 'mongoose';

import {
  VIDEO_CATEGORIES,
  VIDEO_SOURCES,
  type VideoCategory,
  type VideoSource,
} from '@roman/shared';

import {
  imageSchema,
  mediaAssetSchema,
  publishingPaths,
  type ImageDoc,
  type MediaAssetDoc,
  type PublishingFields,
  type Timestamps,
} from '../../lib/mongo.js';

export interface VideoDoc extends PublishingFields, Timestamps {
  title: string;
  slug: string;
  description?: string;
  source: VideoSource;
  /** Required when source = "cloudinary". */
  media?: MediaAssetDoc;
  /** Required when source = "youtube". */
  youtubeId?: string;
  poster?: ImageDoc;
  duration?: number;
  category: VideoCategory;
  recordedAt?: Date;
  venue?: string;
}

const videoSchema = new Schema<VideoDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    description: { type: String, maxlength: 2000 },
    source: { type: String, enum: [...VIDEO_SOURCES], required: true },
    media: mediaAssetSchema,
    youtubeId: { type: String, match: /^[A-Za-z0-9_-]{11}$/ },
    poster: imageSchema,
    duration: { type: Number, min: 0 },
    category: { type: String, enum: [...VIDEO_CATEGORIES], required: true },
    recordedAt: Date,
    venue: { type: String, maxlength: 200 },
    ...publishingPaths,
  },
  { timestamps: true },
);

// Keep source and its media field consistent at the database layer too.
videoSchema.pre('validate', function () {
  if (this.source === 'cloudinary') {
    if (!this.media) this.invalidate('media', 'Cloudinary videos need an uploaded video');
    if (this.youtubeId) this.invalidate('youtubeId', 'Cloudinary videos cannot have a YouTube id');
  } else {
    if (!this.youtubeId) this.invalidate('youtubeId', 'YouTube videos need a video id');
    if (this.media) this.invalidate('media', 'YouTube videos cannot have an uploaded video');
  }
});

videoSchema.index({ status: 1, sortOrder: 1 });
videoSchema.index({ status: 1, category: 1, sortOrder: 1 });
videoSchema.index({ status: 1, featured: 1, sortOrder: 1 });

export const VideoModel = model<VideoDoc>('Video', videoSchema);

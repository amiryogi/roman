import type { VideoDto } from '@roman/shared';

import { optionalIsoDate } from '../../lib/dates.js';
import {
  toImageDto,
  toMediaAssetDto,
  toPublishingDto,
  toTimestampsDto,
  type WithId,
} from '../../lib/mongo.js';
import type { VideoDoc } from './model.js';

export function toVideoDto(doc: WithId<VideoDoc>): VideoDto {
  const common = {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    poster: toImageDto(doc.poster),
    category: doc.category,
    recordedAt: optionalIsoDate(doc.recordedAt),
    venue: doc.venue,
    duration: doc.duration,
    ...toPublishingDto(doc),
    ...toTimestampsDto(doc),
  };

  if (doc.source === 'cloudinary' && doc.media) {
    return { ...common, source: 'cloudinary', media: toMediaAssetDto(doc.media) };
  }
  if (doc.source === 'youtube' && doc.youtubeId) {
    return { ...common, source: 'youtube', youtubeId: doc.youtubeId };
  }
  // The schema's pre-validate hook prevents this; reaching it means corrupted data.
  throw new Error(`Video ${common.id} has source "${doc.source}" without matching media`);
}

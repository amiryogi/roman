import type { TrackAlbumRef, TrackDto } from '@roman/shared';

import {
  toImageDto,
  toMediaAssetDto,
  toPublishingDto,
  toTimestampsDto,
  type WithId,
} from '../../lib/mongo.js';
import type { TrackDoc } from './model.js';

export type { TrackAlbumRef };

export function toTrackDto(doc: WithId<TrackDoc>, album?: TrackAlbumRef): TrackDto {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    album,
    trackNumber: doc.trackNumber,
    artistCredit: doc.artistCredit,
    credits: doc.credits,
    description: doc.description,
    audio: toMediaAssetDto(doc.audio),
    duration: doc.audio.duration ?? 0,
    cover: toImageDto(doc.cover),
    year: doc.year,
    tags: [...doc.tags],
    ...toPublishingDto(doc),
    ...toTimestampsDto(doc),
  };
}

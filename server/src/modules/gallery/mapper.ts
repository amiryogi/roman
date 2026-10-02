import type { GalleryImageDto } from '@roman/shared';

import { optionalIsoDate } from '../../lib/dates.js';
import { toMediaAssetDto, toPublishingDto, toTimestampsDto, type WithId } from '../../lib/mongo.js';
import type { GalleryImageDoc } from './model.js';

export function toGalleryImageDto(doc: WithId<GalleryImageDoc>): GalleryImageDto {
  return {
    id: doc._id.toHexString(),
    image: toMediaAssetDto(doc.image),
    alt: doc.alt,
    caption: doc.caption,
    category: doc.category,
    eventId: doc.event?.toHexString(),
    takenAt: optionalIsoDate(doc.takenAt),
    photographerCredit: doc.photographerCredit,
    ...toPublishingDto(doc),
    ...toTimestampsDto(doc),
  };
}

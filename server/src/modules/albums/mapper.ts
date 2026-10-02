import type { AlbumDto } from '@roman/shared';

import { optionalIsoDate } from '../../lib/dates.js';
import { toImageDto, toPublishingDto, toTimestampsDto, type WithId } from '../../lib/mongo.js';
import type { AlbumDoc } from './model.js';

export function toAlbumDto(doc: WithId<AlbumDoc>, trackCount?: number): AlbumDto {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    releaseDate: optionalIsoDate(doc.releaseDate),
    cover: toImageDto(doc.cover),
    externalLinks: doc.externalLinks.map((link) => ({ label: link.label, url: link.url })),
    ...toPublishingDto(doc),
    trackCount,
    ...toTimestampsDto(doc),
  };
}

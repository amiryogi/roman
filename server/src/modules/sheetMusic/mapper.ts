import type { SheetMusicDto } from '@roman/shared';

import { toImageDto, toPublishingDto, toTimestampsDto, type WithId } from '../../lib/mongo.js';
import type { SheetMusicDoc } from './model.js';

export function toSheetMusicDto(doc: WithId<SheetMusicDoc>): SheetMusicDto {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    artist: doc.artist,
    description: doc.description,
    level: doc.level,
    preview: toImageDto(doc.preview),
    externalUrl: doc.externalUrl,
    ...toPublishingDto(doc),
    ...toTimestampsDto(doc),
  };
}

import { AlbumModel } from '../../modules/albums/model.js';
import { EventModel } from '../../modules/events/model.js';
import { GalleryImageModel } from '../../modules/gallery/model.js';
import { ProfileModel } from '../../modules/profile/model.js';
import { TrackModel } from '../../modules/tracks/model.js';
import { VideoModel } from '../../modules/videos/model.js';
import type { ProviderResource } from './MediaService.js';

/**
 * Every document path that holds a Cloudinary public ID. A new media field must be added here,
 * or `cleanup:media` would treat its assets as orphans. `references.test.ts` guards this list.
 */
interface MediaFields {
  model: string;
  distinct: (path: string) => Promise<unknown[]>;
  paths: string[];
}

const MEDIA_FIELDS: MediaFields[] = [
  {
    model: 'Profile',
    distinct: (path) => ProfileModel.distinct(path).exec(),
    paths: [
      'portrait.asset.publicId',
      'heroDesktop.asset.publicId',
      'heroMobile.asset.publicId',
      'ogImage.asset.publicId',
    ],
  },
  {
    model: 'Album',
    distinct: (path) => AlbumModel.distinct(path).exec(),
    paths: ['cover.asset.publicId'],
  },
  {
    model: 'Track',
    distinct: (path) => TrackModel.distinct(path).exec(),
    paths: ['audio.publicId', 'cover.asset.publicId'],
  },
  {
    model: 'Video',
    distinct: (path) => VideoModel.distinct(path).exec(),
    paths: ['media.publicId', 'poster.asset.publicId'],
  },
  {
    model: 'GalleryImage',
    distinct: (path) => GalleryImageModel.distinct(path).exec(),
    paths: ['image.publicId'],
  },
  {
    model: 'Event',
    distinct: (path) => EventModel.distinct(path).exec(),
    paths: ['image.asset.publicId'],
  },
];

/** "Model.path" for every media reference, e.g. "Track.audio.publicId". */
export function mediaReferencePaths(): string[] {
  return MEDIA_FIELDS.flatMap(({ model, paths }) => paths.map((path) => `${model}.${path}`));
}

export async function collectReferencedPublicIds(): Promise<Set<string>> {
  const referenced = new Set<string>();
  for (const { distinct, paths } of MEDIA_FIELDS) {
    for (const path of paths) {
      const values = await distinct(path);
      for (const value of values) {
        if (typeof value === 'string') referenced.add(value);
      }
    }
  }
  return referenced;
}

/**
 * Assets nobody references. Recent uploads are skipped: they may belong to a form the admin
 * hasn't saved yet.
 */
export function findOrphans(
  resources: readonly ProviderResource[],
  referenced: ReadonlySet<string>,
  options: { now: Date; minAgeMs: number },
): ProviderResource[] {
  const cutoff = options.now.getTime() - options.minAgeMs;
  return resources.filter(
    (resource) => !referenced.has(resource.publicId) && resource.createdAt.getTime() <= cutoff,
  );
}

import { Schema } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { useTestDb } from '../../../test/db.js';
import {
  audioAsset,
  createAlbum,
  createEvent,
  createGalleryImage,
  createProfile,
  createTrack,
  createVideo,
  imageAsset,
} from '../../../test/factories.js';
import { ALL_MODELS } from '../../models.js';
import type { ProviderResource } from './MediaService.js';
import { collectReferencedPublicIds, findOrphans, mediaReferencePaths } from './references.js';

useTestDb();

/** Every path in a schema (including nested subdocuments) that ends in "publicId". */
function publicIdPaths(schema: Schema, prefix = ''): string[] {
  const found: string[] = [];
  schema.eachPath((path, type) => {
    const fullPath = `${prefix}${path}`;
    if (path === 'publicId' || path.endsWith('.publicId')) found.push(fullPath);
    if ('schema' in type && type.schema instanceof Schema) {
      found.push(...publicIdPaths(type.schema, `${fullPath}.`));
    }
  });
  return found;
}

describe('media references', () => {
  it('covers every media field declared in the models', () => {
    const declared = ALL_MODELS.flatMap((model) =>
      publicIdPaths(model.schema).map((path) => `${model.modelName}.${path}`),
    );

    expect(declared.length).toBeGreaterThan(0);
    expect([...mediaReferencePaths()].sort()).toEqual([...declared].sort());
  });

  it('collects public IDs from every content type', async () => {
    const image = (name: string) => imageAsset({ publicId: `root/${name}` });
    await createProfile({
      portrait: { asset: image('portrait'), alt: 'Portrait' },
      heroDesktop: { asset: image('hero-desktop'), alt: 'Hero' },
      heroMobile: { asset: image('hero-mobile'), alt: 'Hero' },
      ogImage: { asset: image('og'), alt: 'Share image' },
    });
    await createAlbum({ cover: { asset: image('album-cover'), alt: 'Cover' } });
    await createTrack({
      audio: audioAsset({ publicId: 'root/audio' }),
      cover: { asset: image('track-cover'), alt: 'Cover' },
    });
    await createVideo({
      source: 'cloudinary',
      youtubeId: undefined,
      media: { ...audioAsset({ publicId: 'root/video' }), format: 'mp4' },
      poster: { asset: image('poster'), alt: 'Poster' },
    });
    await createGalleryImage({ image: image('gallery') });
    await createEvent({ image: { asset: image('event'), alt: 'Event' } });

    expect([...(await collectReferencedPublicIds())].sort()).toEqual(
      [
        'portrait',
        'hero-desktop',
        'hero-mobile',
        'og',
        'album-cover',
        'audio',
        'track-cover',
        'video',
        'poster',
        'gallery',
        'event',
      ]
        .map((name) => `root/${name}`)
        .sort(),
    );
  });
});

describe('findOrphans', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const resource = (publicId: string, hoursOld: number): ProviderResource => ({
    publicId,
    resourceType: 'image',
    type: 'upload',
    version: 1,
    format: 'jpg',
    bytes: 1,
    createdAt: new Date(now.getTime() - hoursOld * 3_600_000),
  });

  it('returns unreferenced assets older than the grace period', () => {
    const orphans = findOrphans(
      [resource('root/used', 48), resource('root/old', 48), resource('root/fresh', 1)],
      new Set(['root/used']),
      { now, minAgeMs: 24 * 3_600_000 },
    );

    expect(orphans.map((orphan) => orphan.publicId)).toEqual(['root/old']);
  });
});

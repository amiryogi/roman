import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestMedia } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import { silentLogger } from '../../config/logger.js';
import { GalleryImageModel } from '../../modules/gallery/model.js';
import { ProfileModel } from '../../modules/profile/model.js';
import { TrackModel } from '../../modules/tracks/model.js';
import { stripJpegMetadata } from './jpeg.js';
import { PENDING_TRACK_TITLE, seedContent, SOURCE_FILES } from './seedContent.js';

useTestDb();

let sourceDir: string;

beforeAll(async () => {
  // Stand-ins for the source files; the fake media driver doesn't read them.
  sourceDir = await mkdtemp(path.join(tmpdir(), 'seed-test-'));
  await mkdir(path.join(sourceDir, 'images'));
  for (const [index, file] of Object.values(SOURCE_FILES).entries()) {
    await writeFile(path.join(sourceDir, file), `file ${String(index)}`);
  }
});

afterAll(async () => {
  await rm(sourceDir, { recursive: true, force: true });
});

describe('seedContent', () => {
  it('creates the CV profile, draft gallery images and a draft track, idempotently', async () => {
    const media = createTestMedia();
    const options = { sourceDir, media, logger: silentLogger };

    const first = await seedContent(options);
    expect(first).toEqual({
      uploaded: 9,
      reused: 0,
      profile: 'created',
      galleryCreated: 5,
      trackCreated: true,
    });

    const profile = await ProfileModel.findOne().orFail();
    expect(profile.displayName).toBe('Roman Budhathoki');
    expect(profile.achievements).toEqual([]);
    expect(profile.philosophy).toBeUndefined();
    expect(profile.contact.showPhone).toBe(false);
    expect(profile.contact.phone).toBeUndefined();
    expect(profile.heroDesktop?.asset.publicId).not.toBe(profile.heroMobile?.asset.publicId);

    const gallery = await GalleryImageModel.find().lean();
    expect(gallery).toHaveLength(5);
    expect(gallery.every((image) => image.status === 'draft')).toBe(true);

    const track = await TrackModel.findOne().orFail();
    expect(track.title).toBe(PENDING_TRACK_TITLE);
    expect(track.status).toBe('draft');
    expect(track.audio.duration).toBeGreaterThan(0);

    const second = await seedContent(options);
    expect(second).toEqual({
      uploaded: 0,
      reused: 6,
      profile: 'kept',
      galleryCreated: 0,
      trackCreated: false,
    });
    expect(await GalleryImageModel.countDocuments()).toBe(5);
    expect(await TrackModel.countDocuments()).toBe(1);
  });

  it('never overwrites an existing profile', async () => {
    const media = createTestMedia();
    await seedContent({ sourceDir, media, logger: silentLogger });
    await ProfileModel.updateOne({}, { $set: { tagline: 'Edited by the owner' } });

    await seedContent({ sourceDir, media, logger: silentLogger });

    expect((await ProfileModel.findOne().orFail()).tagline).toBe('Edited by the owner');
  });
});

describe('stripJpegMetadata', () => {
  const segment = (marker: number, payload: string) => {
    const body = Buffer.from(payload);
    const header = Buffer.from([0xff, marker, 0, 0]);
    header.writeUInt16BE(body.length + 2, 2);
    return Buffer.concat([header, body]);
  };
  const soi = Buffer.from([0xff, 0xd8]);
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);

  it('removes Exif segments and keeps the rest', () => {
    const jfif = segment(0xe0, 'JFIF');
    const exif = segment(0xe1, 'Exif GPS 27.7N 85.3E');
    const icc = segment(0xe2, 'ICC_PROFILE');
    const stripped = stripJpegMetadata(Buffer.concat([soi, jfif, exif, icc, scan]));

    expect(stripped).toEqual(Buffer.concat([soi, jfif, icc, scan]));
    expect(stripped.toString('latin1')).not.toContain('GPS');
  });

  it('leaves other data untouched', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegMetadata(png)).toBe(png);
  });
});

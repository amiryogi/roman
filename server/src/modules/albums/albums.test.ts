import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  albumDetailDtoSchema,
  albumDtoSchema,
  apiErrorBodySchema,
  apiSuccessSchema,
} from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createAlbum, createTrack } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';
import { TrackModel } from '../tracks/model.js';
import { AlbumModel } from './model.js';

useTestDb();

const albumResponse = apiSuccessSchema(albumDtoSchema);
const albumListResponse = apiSuccessSchema(z.array(albumDtoSchema));
const albumDetailResponse = apiSuccessSchema(albumDetailDtoSchema);

describe('albums', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

  it('creates an album with a cover, release date and links', async () => {
    const { publicId } = media.simulateUpload('album-cover');
    const res = await auth(request(app).post('/api/admin/albums')).send({
      title: 'Strings of the Valley',
      releaseDate: '2025-04-14',
      cover: { mediaRef: { publicId, resourceType: 'image' }, alt: 'Album cover artwork' },
      externalLinks: [{ label: 'Spotify', url: 'https://open.spotify.com/album/x' }],
    });

    expect(res.status).toBe(201);
    expect(albumResponse.parse(res.body).data).toMatchObject({
      slug: 'strings-of-the-valley',
      releaseDate: '2025-04-14',
      status: 'draft',
      trackCount: 0,
      externalLinks: [{ label: 'Spotify', url: 'https://open.spotify.com/album/x' }],
    });
  });

  it('rejects links that are not https', async () => {
    const res = await auth(request(app).post('/api/admin/albums')).send({
      title: 'Insecure',
      externalLinks: [{ label: 'Site', url: 'http://example.com' }],
    });
    expect(res.status).toBe(422);
  });

  it('updates, clears the release date and replaces the cover', async () => {
    const first = media.simulateUpload('album-cover');
    const created = albumResponse.parse(
      (
        await auth(request(app).post('/api/admin/albums')).send({
          title: 'Draft album',
          releaseDate: '2025-01-01',
          cover: {
            mediaRef: { publicId: first.publicId, resourceType: 'image' },
            alt: 'Cover one',
          },
        })
      ).body,
    ).data;
    const second = media.simulateUpload('album-cover');

    const res = await auth(request(app).patch(`/api/admin/albums/${created.id}`)).send({
      releaseDate: '',
      status: 'published',
      cover: { mediaRef: { publicId: second.publicId, resourceType: 'image' }, alt: 'Cover two' },
    });

    const album = albumResponse.parse(res.body).data;
    expect(album.releaseDate).toBeUndefined();
    expect(album.status).toBe('published');
    expect(album.cover?.asset.publicId).toBe(second.publicId);
    expect(media.destroyed).toEqual([first.publicId]);
  });

  it('refuses to delete an album with tracks unless they are detached', async () => {
    const album = await createAlbum();
    await createTrack({ album: album._id, trackNumber: 1 });
    const path = `/api/admin/albums/${album._id.toHexString()}`;

    const blocked = await auth(request(app).delete(path));
    expect(blocked.status).toBe(409);
    expect(apiErrorBodySchema.parse(blocked.body).error.code).toBe('ALBUM_NOT_EMPTY');

    expect((await auth(request(app).delete(`${path}?detachTracks=true`))).status).toBe(204);
    expect(await AlbumModel.countDocuments()).toBe(0);
    const track = await TrackModel.findOne().orFail();
    expect(track.album).toBeUndefined();
    expect(track.trackNumber).toBeUndefined();
  });

  it('lists all albums for the admin with total track counts, and reorders them', async () => {
    const a = await createAlbum({ title: 'A', sortOrder: 1 });
    const b = await createAlbum({ title: 'B', sortOrder: 2, status: 'published' });
    await createTrack({ album: a._id });
    await createTrack({ album: a._id, status: 'published' });

    const list = albumListResponse.parse((await auth(request(app).get('/api/admin/albums'))).body);
    expect(list.data.map((x) => [x.title, x.trackCount])).toEqual([
      ['A', 2],
      ['B', 0],
    ]);

    await auth(request(app).patch('/api/admin/albums/order')).send({
      ids: [b._id.toHexString(), a._id.toHexString()],
    });
    const reordered = albumListResponse.parse(
      (await auth(request(app).get('/api/admin/albums'))).body,
    );
    expect(reordered.data.map((x) => x.title)).toEqual(['B', 'A']);
  });

  describe('public', () => {
    it('lists published albums with their published track counts', async () => {
      const live = await createAlbum({ title: 'Live', status: 'published' });
      await createAlbum({ title: 'Draft', status: 'draft' });
      await createTrack({ album: live._id, status: 'published' });
      await createTrack({ album: live._id, status: 'draft' });

      const res = await request(app).get('/api/albums');
      expect(res.headers['cache-control']).toMatch(/^public/);
      expect(albumListResponse.parse(res.body).data.map((x) => [x.title, x.trackCount])).toEqual([
        ['Live', 1],
      ]);
    });

    it('returns a published album with its published tracks in order', async () => {
      const live = await createAlbum({ title: 'Live', slug: 'live', status: 'published' });
      await createTrack({ title: 'Two', album: live._id, trackNumber: 2, status: 'published' });
      await createTrack({ title: 'One', album: live._id, trackNumber: 1, status: 'published' });
      await createTrack({ title: 'Unreleased', album: live._id, trackNumber: 3, status: 'draft' });

      const detail = albumDetailResponse.parse(
        (await request(app).get('/api/albums/live')).body,
      ).data;
      expect(detail.tracks.map((t) => t.title)).toEqual(['One', 'Two']);
      expect(detail.trackCount).toBe(2);
    });

    it('hides draft albums and answers 404 for odd slugs', async () => {
      await createAlbum({ slug: 'hidden', status: 'draft' });

      expect((await request(app).get('/api/albums/hidden')).status).toBe(404);
      expect((await request(app).get('/api/albums/NOT%20A%20SLUG')).status).toBe(404);
    });
  });
});

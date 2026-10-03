import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  homeDtoSchema,
  trackDtoSchema,
  type MediaRef,
} from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createAlbum, createProfile, createTrack } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';
import { TrackModel } from './model.js';

useTestDb();

const trackResponse = apiSuccessSchema(trackDtoSchema);
const trackListResponse = apiSuccessSchema(z.array(trackDtoSchema));

function errorOf(res: request.Response) {
  return apiErrorBodySchema.parse(res.body).error;
}

describe('tracks', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const admin = {
    get: (path: string) =>
      request(app).get(`/api/admin/tracks${path}`).set('Authorization', `Bearer ${token}`),
    post: (body: object) =>
      request(app).post('/api/admin/tracks').set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) =>
      request(app)
        .patch(`/api/admin/tracks${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    delete: (path: string) =>
      request(app).delete(`/api/admin/tracks${path}`).set('Authorization', `Bearer ${token}`),
  };

  function uploadedAudio(): MediaRef {
    const { publicId } = media.simulateUpload('track-audio', { duration: 185.5 });
    return { publicId, resourceType: 'video' };
  }

  function uploadedCover(): MediaRef {
    const { publicId } = media.simulateUpload('track-cover');
    return { publicId, resourceType: 'image' };
  }

  describe('admin create', () => {
    it('creates a draft from verified media, with a generated slug', async () => {
      const res = await admin.post({
        title: 'Resham Firiri (Arrangement)',
        audio: uploadedAudio(),
        cover: { mediaRef: uploadedCover(), alt: 'Album artwork' },
        credits: 'Traditional, arranged for violin',
        tags: ['Folk', 'nepali'],
      });

      expect(res.status).toBe(201);
      const track = trackResponse.parse(res.body).data;
      expect(track).toMatchObject({
        title: 'Resham Firiri (Arrangement)',
        slug: 'resham-firiri-arrangement',
        status: 'draft',
        featured: false,
        artistCredit: 'Roman Budhathoki',
        duration: 185.5,
        tags: ['folk', 'nepali'],
      });
      expect(track.cover?.alt).toBe('Album artwork');
    });

    it('suffixes the slug when the title is taken', async () => {
      await admin.post({ title: 'Prelude', audio: uploadedAudio() });
      const second = trackResponse.parse(
        (await admin.post({ title: 'Prelude', audio: uploadedAudio() })).body,
      );

      expect(second.data.slug).toBe('prelude-2');
    });

    it('rejects an explicit slug that is already used', async () => {
      await createTrack({ slug: 'taken' });
      const res = await admin.post({ title: 'New', slug: 'taken', audio: uploadedAudio() });

      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('CONFLICT');
    });

    it('requires audio uploaded for tracks', async () => {
      const missing = await admin.post({ title: 'No audio' });
      expect(missing.status).toBe(422);
      expect(errorOf(missing).details?.map((d) => d.path)).toContain('audio');

      const wrongKind = await admin.post({ title: 'Cover as audio', audio: uploadedCover() });
      expect(wrongKind.status).toBe(422);
    });

    it('rejects audio from another upload kind and an unknown album', async () => {
      const { publicId } = media.simulateUpload('video');
      const asVideo = await admin.post({
        title: 'Wrong folder',
        audio: { publicId, resourceType: 'video' },
      });
      expect(asVideo.status).toBe(422);
      expect(errorOf(asVideo).code).toBe('MEDIA_INVALID');

      const noAlbum = await admin.post({
        title: 'Lost',
        audio: uploadedAudio(),
        albumId: '64b7f0c2a1b2c3d4e5f60718',
      });
      expect(noAlbum.status).toBe(422);
      expect(errorOf(noAlbum).details?.[0]?.path).toBe('albumId');
    });

    it('rejects unknown fields', async () => {
      const res = await admin.post({ title: 'X', audio: uploadedAudio(), duration: 9999 });
      expect(res.status).toBe(422);
    });
  });

  describe('admin update and delete', () => {
    it('updates fields, clears optional ones and keeps unchanged media without re-checking', async () => {
      const created = trackResponse.parse(
        (await admin.post({ title: 'Air', audio: uploadedAudio(), credits: 'Old credits' })).body,
      ).data;
      media.failNextCall(); // proves the unchanged audio isn't verified again

      const res = await admin.patch(`/${created.id}`, {
        title: 'Air on the G String',
        credits: '',
        status: 'published',
        featured: true,
        audio: { publicId: created.audio.publicId, resourceType: 'video' },
      });

      expect(res.status).toBe(200);
      const track = trackResponse.parse(res.body).data;
      expect(track).toMatchObject({
        title: 'Air on the G String',
        status: 'published',
        featured: true,
      });
      expect(track.credits).toBeUndefined();
      expect(track.slug).toBe('air'); // slugs never change by themselves
    });

    it('replaces audio and deletes the old file after saving', async () => {
      const created = trackResponse.parse(
        (await admin.post({ title: 'Air', audio: uploadedAudio() })).body,
      ).data;
      const replacement = uploadedAudio();

      const res = await admin.patch(`/${created.id}`, { audio: replacement });

      expect(trackResponse.parse(res.body).data.audio.publicId).toBe(replacement.publicId);
      expect(media.destroyed).toEqual([created.audio.publicId]);
    });

    it('removes a cover, or changes only its alt text', async () => {
      const created = trackResponse.parse(
        (
          await admin.post({
            title: 'Air',
            audio: uploadedAudio(),
            cover: { mediaRef: uploadedCover(), alt: 'First alt text' },
          })
        ).body,
      ).data;

      const altOnly = await admin.patch(`/${created.id}`, { cover: { alt: 'Better alt text' } });
      expect(trackResponse.parse(altOnly.body).data.cover).toMatchObject({
        alt: 'Better alt text',
        asset: { publicId: created.cover?.asset.publicId },
      });
      expect(media.destroyed).toEqual([]);

      const removed = await admin.patch(`/${created.id}`, { cover: null });
      expect(trackResponse.parse(removed.body).data.cover).toBeUndefined();
      expect(media.destroyed).toEqual([created.cover?.asset.publicId]);
    });

    it('needs an upload before alt text can be set on a track without a cover', async () => {
      const created = trackResponse.parse(
        (await admin.post({ title: 'Air', audio: uploadedAudio() })).body,
      ).data;
      const res = await admin.patch(`/${created.id}`, { cover: { alt: 'Alt text only' } });

      expect(res.status).toBe(422);
      expect(errorOf(res).details?.[0]?.path).toBe('cover.mediaRef');
    });

    it('deletes the track and its media', async () => {
      const created = trackResponse.parse(
        (
          await admin.post({
            title: 'Air',
            audio: uploadedAudio(),
            cover: { mediaRef: uploadedCover(), alt: 'Cover image' },
          })
        ).body,
      ).data;

      expect((await admin.delete(`/${created.id}`)).status).toBe(204);
      expect(await TrackModel.countDocuments()).toBe(0);
      expect(media.destroyed.sort()).toEqual(
        [created.audio.publicId, created.cover?.asset.publicId].sort(),
      );
      expect((await admin.delete(`/${created.id}`)).status).toBe(404);
    });

    it('answers 404 for unknown and malformed ids', async () => {
      expect((await admin.get('/64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
      expect((await admin.get('/not-an-id')).status).toBe(404);
      expect((await admin.patch('/not-an-id', { title: 'X' })).status).toBe(404);
    });
  });

  describe('admin list and reorder', () => {
    it('lists every status, filters and searches titles safely', async () => {
      await createTrack({ title: 'Morning Raga', status: 'published' });
      await createTrack({ title: 'Evening (draft)', status: 'draft' });

      const all = trackListResponse.parse((await admin.get('/')).body);
      expect(all.data).toHaveLength(2);
      expect(all.meta?.total).toBe(2);

      const drafts = trackListResponse.parse((await admin.get('/?status=draft')).body);
      expect(drafts.data.map((t) => t.title)).toEqual(['Evening (draft)']);

      const search = trackListResponse.parse((await admin.get('/?q=(draft')).body);
      expect(search.data.map((t) => t.title)).toEqual(['Evening (draft)']);
    });

    it('reorders tracks within their existing positions', async () => {
      const a = await createTrack({ title: 'A', sortOrder: 10 });
      const b = await createTrack({ title: 'B', sortOrder: 20 });
      const c = await createTrack({ title: 'C', sortOrder: 30 });

      const res = await admin.patch('/order', {
        ids: [c._id.toHexString(), a._id.toHexString(), b._id.toHexString()],
      });

      expect(res.status).toBe(204);
      const order = trackListResponse.parse((await admin.get('/')).body).data.map((t) => t.title);
      expect(order).toEqual(['C', 'A', 'B']);
      expect((await TrackModel.findById(c._id).orFail()).sortOrder).toBe(10);
    });

    it('rejects reordering unknown or repeated ids', async () => {
      const a = await createTrack();
      const unknown = await admin.patch('/order', {
        ids: [a._id.toHexString(), '64b7f0c2a1b2c3d4e5f60718'],
      });
      expect(unknown.status).toBe(422);

      const repeated = await admin.patch('/order', {
        ids: [a._id.toHexString(), a._id.toHexString()],
      });
      expect(repeated.status).toBe(422);
    });
  });

  describe('public', () => {
    it('lists only published tracks, featured first, with a public cache', async () => {
      await createTrack({ title: 'Plain', status: 'published', sortOrder: 1 });
      await createTrack({ title: 'Star', status: 'published', featured: true, sortOrder: 2 });
      await createTrack({ title: 'Hidden', status: 'draft', featured: true });

      const res = await request(app).get('/api/tracks');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toMatch(/^public/);
      const list = trackListResponse.parse(res.body);
      expect(list.data.map((t) => t.title)).toEqual(['Star', 'Plain']);
      expect(list.meta).toMatchObject({ page: 1, total: 2 });
    });

    it('filters featured tracks and paginates', async () => {
      for (let i = 0; i < 3; i++) await createTrack({ status: 'published', featured: i === 0 });

      expect(
        trackListResponse.parse((await request(app).get('/api/tracks?featured=true')).body).data,
      ).toHaveLength(1);
      const page2 = trackListResponse.parse(
        (await request(app).get('/api/tracks?limit=2&page=2')).body,
      );
      expect(page2.data).toHaveLength(1);
      expect(page2.meta?.totalPages).toBe(2);
      expect((await request(app).get('/api/tracks?limit=500')).status).toBe(422);
    });

    it('names only published albums, and filters by album slug in track order', async () => {
      const live = await createAlbum({ title: 'Live', slug: 'live', status: 'published' });
      const draft = await createAlbum({ title: 'Secret', slug: 'secret', status: 'draft' });
      await createTrack({ title: 'Second', album: live._id, trackNumber: 2, status: 'published' });
      await createTrack({ title: 'First', album: live._id, trackNumber: 1, status: 'published' });
      await createTrack({ title: 'Loose', album: draft._id, status: 'published' });

      const all = trackListResponse.parse((await request(app).get('/api/tracks')).body).data;
      expect(all.find((t) => t.title === 'Loose')?.album).toBeUndefined();
      expect(JSON.stringify(all)).not.toContain('Secret');

      const album = trackListResponse.parse(
        (await request(app).get('/api/tracks?album=live')).body,
      );
      expect(album.data.map((t) => t.title)).toEqual(['First', 'Second']);
      expect(album.data[0]?.album).toMatchObject({ title: 'Live', slug: 'live' });

      const hidden = trackListResponse.parse(
        (await request(app).get('/api/tracks?album=secret')).body,
      );
      expect(hidden.data).toEqual([]);
    });

    it('feeds published featured tracks to the home page', async () => {
      await createProfile();
      await createTrack({ title: 'Featured', status: 'published', featured: true });
      await createTrack({ title: 'Draft feature', status: 'draft', featured: true });
      await createTrack({ title: 'Ordinary', status: 'published' });

      const home = apiSuccessSchema(homeDtoSchema).parse(
        (await request(app).get('/api/home')).body,
      );
      expect(home.data.featuredTracks.map((t) => t.title)).toEqual(['Featured']);
    });
  });
});

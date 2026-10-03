import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  homeDtoSchema,
  videoDtoSchema,
  type MediaRef,
} from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createProfile, createVideo } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';

useTestDb();

const videoResponse = apiSuccessSchema(videoDtoSchema);
const videoListResponse = apiSuccessSchema(z.array(videoDtoSchema));

function errorOf(res: request.Response) {
  return apiErrorBodySchema.parse(res.body).error;
}

describe('videos', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const post = (body: object) =>
    request(app).post('/api/admin/videos').set('Authorization', `Bearer ${token}`).send(body);
  const patch = (id: string, body: object) =>
    request(app)
      .patch(`/api/admin/videos/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  function uploadedVideo(): MediaRef {
    const { publicId } = media.simulateUpload('video', { duration: 312.4 });
    return { publicId, resourceType: 'video' };
  }

  it('creates an uploaded video with its duration from Cloudinary', async () => {
    const res = await post({
      title: 'Wedding medley',
      source: 'cloudinary',
      mediaRef: uploadedVideo(),
      category: 'wedding-event',
      recordedAt: '2025-11-20',
    });

    expect(res.status).toBe(201);
    const video = videoResponse.parse(res.body).data;
    expect(video).toMatchObject({
      source: 'cloudinary',
      slug: 'wedding-medley',
      duration: 312.4,
      recordedAt: '2025-11-20',
      status: 'draft',
    });
  });

  it('accepts a YouTube link and stores only the video id', async () => {
    const res = await post({
      title: 'Concert excerpt',
      source: 'youtube',
      youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
      category: 'performance',
    });

    expect(res.status).toBe(201);
    const video = videoResponse.parse(res.body).data;
    expect(video.source === 'youtube' && video.youtubeId).toBe('dQw4w9WgXcQ');
  });

  it('enforces the source rules', async () => {
    const noFile = await post({ title: 'X', source: 'cloudinary', category: 'other' });
    expect(noFile.status).toBe(422);

    const badLink = await post({
      title: 'X',
      source: 'youtube',
      youtube: 'https://example.com/watch?v=dQw4w9WgXcQ',
      category: 'other',
    });
    expect(badLink.status).toBe(422);

    const both = await post({
      title: 'X',
      source: 'youtube',
      youtube: 'dQw4w9WgXcQ',
      mediaRef: uploadedVideo(),
      category: 'other',
    });
    expect(both.status).toBe(422);

    const { publicId } = media.simulateUpload('track-audio');
    const audioAsVideo = await post({
      title: 'X',
      source: 'cloudinary',
      mediaRef: { publicId, resourceType: 'video' },
      category: 'other',
    });
    expect(errorOf(audioAsVideo).code).toBe('MEDIA_INVALID');
  });

  it('switches from an upload to YouTube and deletes the old file', async () => {
    const ref = uploadedVideo();
    const created = videoResponse.parse(
      (await post({ title: 'Clip', source: 'cloudinary', mediaRef: ref, category: 'studio' })).body,
    ).data;

    const needsLink = await patch(created.id, { source: 'youtube' });
    expect(needsLink.status).toBe(422);
    expect(errorOf(needsLink).details?.[0]?.path).toBe('youtube');

    const res = await patch(created.id, {
      source: 'youtube',
      youtube: 'https://youtu.be/dQw4w9WgXcQ',
    });
    const video = videoResponse.parse(res.body).data;
    expect(video.source).toBe('youtube');
    expect(video.duration).toBeUndefined();
    expect(media.destroyed).toEqual([ref.publicId]);
  });

  it('switches from YouTube to an upload', async () => {
    const created = videoResponse.parse(
      (await post({ title: 'Clip', source: 'youtube', youtube: 'dQw4w9WgXcQ', category: 'studio' }))
        .body,
    ).data;

    const wrongField = await patch(created.id, { mediaRef: uploadedVideo() });
    expect(wrongField.status).toBe(422);

    const res = await patch(created.id, { source: 'cloudinary', mediaRef: uploadedVideo() });
    expect(videoResponse.parse(res.body).data).toMatchObject({
      source: 'cloudinary',
      duration: 312.4,
    });
  });

  it('adds and removes a custom poster', async () => {
    const created = videoResponse.parse(
      (await post({ title: 'Clip', source: 'youtube', youtube: 'dQw4w9WgXcQ', category: 'studio' }))
        .body,
    ).data;
    const { publicId } = media.simulateUpload('video-poster');

    const withPoster = await patch(created.id, {
      poster: { mediaRef: { publicId, resourceType: 'image' }, alt: 'Violinist on stage' },
    });
    expect(videoResponse.parse(withPoster.body).data.poster?.asset.publicId).toBe(publicId);

    await patch(created.id, { poster: null });
    expect(media.destroyed).toEqual([publicId]);
  });

  it('deletes the video and its files', async () => {
    const ref = uploadedVideo();
    const created = videoResponse.parse(
      (await post({ title: 'Clip', source: 'cloudinary', mediaRef: ref, category: 'studio' })).body,
    ).data;

    const res = await request(app)
      .delete(`/api/admin/videos/${created.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(media.destroyed).toEqual([ref.publicId]);
  });

  it('filters by category for the admin', async () => {
    await createVideo({ title: 'Studio take', category: 'studio' });
    await createVideo({ title: 'Lesson', category: 'teaching' });

    const res = await request(app)
      .get('/api/admin/videos?category=teaching')
      .set('Authorization', `Bearer ${token}`);
    expect(videoListResponse.parse(res.body).data.map((v) => v.title)).toEqual(['Lesson']);
  });

  describe('public', () => {
    it('lists published videos by category, in order', async () => {
      await createVideo({ title: 'B', category: 'performance', status: 'published', sortOrder: 2 });
      await createVideo({ title: 'A', category: 'performance', status: 'published', sortOrder: 1 });
      await createVideo({ title: 'Hidden', category: 'performance', status: 'draft' });
      await createVideo({ title: 'Other', category: 'studio', status: 'published' });

      const res = await request(app).get('/api/videos?category=performance');
      expect(res.headers['cache-control']).toMatch(/^public/);
      expect(videoListResponse.parse(res.body).data.map((v) => v.title)).toEqual(['A', 'B']);
      expect((await request(app).get('/api/videos?category=nonsense')).status).toBe(422);
    });

    it('feeds published featured videos to the home page', async () => {
      await createProfile();
      await createVideo({ title: 'Featured', status: 'published', featured: true });
      await createVideo({ title: 'Draft', status: 'draft', featured: true });

      const home = apiSuccessSchema(homeDtoSchema).parse(
        (await request(app).get('/api/home')).body,
      );
      expect(home.data.featuredVideos.map((v) => v.title)).toEqual(['Featured']);
    });
  });
});

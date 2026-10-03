import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  galleryImageDtoSchema,
  homeDtoSchema,
  type MediaRef,
} from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createEvent, createGalleryImage, createProfile } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';

useTestDb();

const imageResponse = apiSuccessSchema(galleryImageDtoSchema);
const imageListResponse = apiSuccessSchema(z.array(galleryImageDtoSchema));

describe('gallery', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const post = (body: object) =>
    request(app).post('/api/admin/gallery').set('Authorization', `Bearer ${token}`).send(body);
  const admin = (path: string) =>
    request(app).get(`/api/admin/gallery${path}`).set('Authorization', `Bearer ${token}`);

  function uploadedPhoto(): MediaRef {
    const { publicId } = media.simulateUpload('gallery', { width: 3000, height: 2000 });
    return { publicId, resourceType: 'image' };
  }

  it('creates a photo with dimensions from Cloudinary', async () => {
    const event = await createEvent();
    const res = await post({
      image: uploadedPhoto(),
      alt: 'Violinist on a candle-lit stage',
      category: 'performance',
      caption: 'Evening concert',
      eventId: event._id.toHexString(),
      takenAt: '2025-05-01',
      photographerCredit: 'A. Photographer',
    });

    expect(res.status).toBe(201);
    expect(imageResponse.parse(res.body).data).toMatchObject({
      image: { width: 3000, height: 2000 },
      eventId: event._id.toHexString(),
      takenAt: '2025-05-01',
      status: 'draft',
    });
  });

  it('cannot be saved, or published, without meaningful alt text', async () => {
    const missing = await post({
      image: uploadedPhoto(),
      category: 'portrait',
      status: 'published',
    });
    expect(missing.status).toBe(422);
    expect(apiErrorBodySchema.parse(missing.body).error.details?.map((d) => d.path)).toContain(
      'alt',
    );

    const tooShort = await post({ image: uploadedPhoto(), alt: 'img', category: 'portrait' });
    expect(tooShort.status).toBe(422);

    const created = imageResponse.parse(
      (await post({ image: uploadedPhoto(), alt: 'Portrait with violin', category: 'portrait' }))
        .body,
    ).data;
    const cleared = await request(app)
      .patch(`/api/admin/gallery/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alt: '', status: 'published' });
    expect(cleared.status).toBe(422);
  });

  it('rejects an unknown event and a video posing as a photo', async () => {
    const noEvent = await post({
      image: uploadedPhoto(),
      alt: 'Portrait with violin',
      category: 'portrait',
      eventId: '64b7f0c2a1b2c3d4e5f60718',
    });
    expect(apiErrorBodySchema.parse(noEvent.body).error.details?.[0]?.path).toBe('eventId');

    const { publicId } = media.simulateUpload('video');
    const video = await post({
      image: { publicId, resourceType: 'video' },
      alt: 'Portrait with violin',
      category: 'portrait',
    });
    expect(video.status).toBe(422);
  });

  it('replaces the image file and deletes the old one', async () => {
    const first = uploadedPhoto();
    const created = imageResponse.parse(
      (await post({ image: first, alt: 'Portrait with violin', category: 'portrait' })).body,
    ).data;
    const second = uploadedPhoto();

    await request(app)
      .patch(`/api/admin/gallery/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ image: second });

    expect(media.destroyed).toEqual([first.publicId]);
  });

  it('searches alt text and captions safely for the admin', async () => {
    await createGalleryImage({ alt: 'Rehearsal in the hall', caption: 'Before the show' });
    await createGalleryImage({ alt: 'Portrait outdoors', caption: 'Spring (2024)' });

    const byAlt = imageListResponse.parse((await admin('?q=rehearsal')).body).data;
    expect(byAlt.map((i) => i.alt)).toEqual(['Rehearsal in the hall']);
    const byCaption = imageListResponse.parse((await admin('?q=(2024')).body).data;
    expect(byCaption.map((i) => i.alt)).toEqual(['Portrait outdoors']);
  });

  describe('public', () => {
    it('pages published photos by category', async () => {
      for (let i = 0; i < 3; i++) {
        await createGalleryImage({ category: 'portrait', status: 'published', sortOrder: i });
      }
      await createGalleryImage({ category: 'portrait', status: 'draft' });
      await createGalleryImage({ category: 'event', status: 'published' });

      const res = await request(app).get('/api/gallery?category=portrait&limit=2');
      const list = imageListResponse.parse(res.body);
      expect(list.data).toHaveLength(2);
      expect(list.meta).toMatchObject({ total: 3, totalPages: 2 });
      expect(res.headers['cache-control']).toMatch(/^public/);
    });

    it('feeds published featured photos to the home page', async () => {
      await createProfile();
      await createGalleryImage({ alt: 'Featured photo', status: 'published', featured: true });
      await createGalleryImage({ alt: 'Draft photo', status: 'draft', featured: true });

      const home = apiSuccessSchema(homeDtoSchema).parse(
        (await request(app).get('/api/home')).body,
      );
      expect(home.data.featuredImages.map((i) => i.alt)).toEqual(['Featured photo']);
    });
  });
});

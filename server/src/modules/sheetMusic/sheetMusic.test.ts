import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiSuccessSchema, homeDtoSchema, sheetMusicDtoSchema } from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import { createProfile, createSheetMusic } from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';
import { SheetMusicModel } from './model.js';

useTestDb();

const scoreResponse = apiSuccessSchema(sheetMusicDtoSchema);
const scoreListResponse = apiSuccessSchema(z.array(sheetMusicDtoSchema));

// Neutral test data, not facts about Roman.
describe('sheet music', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

  function preview() {
    const { publicId } = media.simulateUpload('sheet-music');
    return { mediaRef: { publicId, resourceType: 'image' as const }, alt: 'The opening bars' };
  }

  async function create(body: object) {
    const res = await auth(request(app).post('/api/admin/sheet-music')).send(body);
    return scoreResponse.parse(res.body).data;
  }

  it('creates a score with a preview, level and store link', async () => {
    const res = await auth(request(app).post('/api/admin/sheet-music')).send({
      title: 'Test Waltz',
      artist: 'A Composer',
      level: 'intermediate',
      preview: preview(),
      externalUrl: 'https://store.example/test-waltz',
    });

    expect(res.status).toBe(201);
    expect(scoreResponse.parse(res.body).data).toMatchObject({
      slug: 'test-waltz',
      artist: 'A Composer',
      level: 'intermediate',
      status: 'draft',
      externalUrl: 'https://store.example/test-waltz',
    });
  });

  it('rejects a store link that is not https and an unknown level', async () => {
    const insecure = await auth(request(app).post('/api/admin/sheet-music')).send({
      title: 'Insecure',
      externalUrl: 'http://store.example',
    });
    const badLevel = await auth(request(app).post('/api/admin/sheet-music')).send({
      title: 'Odd level',
      level: 'expert',
    });

    expect(insecure.status).toBe(422);
    expect(badLevel.status).toBe(422);
  });

  it('updates, clears optional fields, replaces the preview and deletes the old file', async () => {
    const created = await create({
      title: 'Score',
      artist: 'Someone',
      level: 'beginner',
      preview: preview(),
    });
    const oldPreview = created.preview?.asset.publicId;

    const res = await auth(request(app).patch(`/api/admin/sheet-music/${created.id}`)).send({
      artist: '',
      level: null,
      preview: preview(),
      status: 'published',
    });

    const updated = scoreResponse.parse(res.body).data;
    expect(updated.artist).toBeUndefined();
    expect(updated.level).toBeUndefined();
    expect(updated.status).toBe('published');
    expect(updated.preview?.asset.publicId).not.toBe(oldPreview);
    expect(media.destroyed).toContain(oldPreview);
  });

  it('deletes a score and its preview', async () => {
    const created = await create({ title: 'Gone', preview: preview() });

    const res = await auth(request(app).delete(`/api/admin/sheet-music/${created.id}`));

    expect(res.status).toBe(204);
    expect(await SheetMusicModel.countDocuments()).toBe(0);
    expect(media.destroyed).toContain(created.preview?.asset.publicId);
    const again = await auth(request(app).delete(`/api/admin/sheet-music/${created.id}`));
    expect(again.status).toBe(404);
  });

  it('lists every status for the admin, searches titles and reorders', async () => {
    const alpha = await createSheetMusic({ title: 'Alpha', status: 'published' });
    const beta = await createSheetMusic({ title: 'Beta', status: 'draft' });
    const list = async (query = '') =>
      scoreListResponse
        .parse((await auth(request(app).get(`/api/admin/sheet-music${query}`))).body)
        .data.map((score) => score.title);

    expect(await list()).toEqual(['Alpha', 'Beta']);
    expect(await list('?q=bet')).toEqual(['Beta']);

    await auth(request(app).patch('/api/admin/sheet-music/order')).send({
      ids: [beta._id.toHexString(), alpha._id.toHexString()],
    });
    expect(await list()).toEqual(['Beta', 'Alpha']);
  });

  describe('public', () => {
    it('lists only published scores, with a short public cache', async () => {
      await createSheetMusic({ title: 'Published', status: 'published' });
      await createSheetMusic({ title: 'Draft', status: 'draft' });

      const res = await request(app).get('/api/sheet-music');

      expect(res.headers['cache-control']).toMatch(/^public/);
      expect(scoreListResponse.parse(res.body).data.map((score) => score.title)).toEqual([
        'Published',
      ]);
    });

    it('tells the home page how many published scores there are', async () => {
      await createProfile();
      await createSheetMusic({ status: 'published' });
      await createSheetMusic({ status: 'draft' });

      const res = await request(app).get('/api/home');

      expect(apiSuccessSchema(homeDtoSchema).parse(res.body).data.sheetMusicCount).toBe(1);
    });
  });
});

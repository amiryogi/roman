import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  MEDIA_FORMATS,
  UPLOAD_KINDS,
  uploadSignatureDtoSchema,
  uploadVerifyDtoSchema,
} from '@roman/shared';

import { createAdminUser, parseAuthResponse } from '../../../test/auth.js';
import { createTestApp, createTestMedia, TEST_MEDIA_ROOT } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';

useTestDb();

const signatureResponse = apiSuccessSchema(uploadSignatureDtoSchema);
const verifyResponse = apiSuccessSchema(uploadVerifyDtoSchema);

function errorOf(res: request.Response) {
  return apiErrorBodySchema.parse(res.body).error;
}

describe('uploads', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    await createAdminUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'a long test password' });
    token = parseAuthResponse(login).accessToken;
  });

  function post(path: string, body: object) {
    return request(app)
      .post(`/api/admin/uploads${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  describe('POST /signature', () => {
    it.each(UPLOAD_KINDS)('signs server-chosen parameters for %s', async (kind) => {
      const res = await post('/signature', { kind });

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      const data = signatureResponse.parse(res.body).data;
      expect(data.kind).toBe(kind);
      expect(data.signature).toBeTruthy();
      expect(data.uploadUrl).toBe(
        `https://api.cloudinary.com/v1_1/${data.cloudName}/${data.constraints.resourceType}/upload`,
      );
      expect(data.params.asset_folder?.startsWith(`${TEST_MEDIA_ROOT}/`)).toBe(true);
      expect(data.params.allowed_formats?.split(',')).toEqual(data.constraints.allowedFormats);
      // Originals need a signed URL, so their metadata (e.g. GPS) is never public.
      expect(data.params.type).toBe('private');
      // Originals need a signed URL, so their metadata (e.g. GPS) is never public.
      expect(data.params.type).toBe('private');
      // Secrets never leave the server.
      expect(JSON.stringify(res.body)).not.toMatch(/secret/i);
    });

    it('maps each kind to its folder, resource type and transformations', async () => {
      const audio = signatureResponse.parse(
        (await post('/signature', { kind: 'track-audio' })).body,
      ).data;
      expect(audio.constraints.resourceType).toBe('video');
      expect(audio.params.asset_folder).toBe(`${TEST_MEDIA_ROOT}/music/audio`);
      expect(audio.params.eager).toBe('ac_mp3,br_160k/mp3');
      expect(audio.constraints.allowedFormats).toEqual([...MEDIA_FORMATS.audio]);

      const gallery = signatureResponse.parse(
        (await post('/signature', { kind: 'gallery' })).body,
      ).data;
      expect(gallery.constraints.resourceType).toBe('image');
      expect(gallery.params.asset_folder).toBe(`${TEST_MEDIA_ROOT}/gallery`);
      expect(gallery.params.colors).toBe('true');
      expect(gallery.constraints.maxBytes).toBe(20 * 1024 * 1024);

      const video = signatureResponse.parse(
        (await post('/signature', { kind: 'video' })).body,
      ).data;
      expect(video.params.eager).toBe('c_limit,w_1280,q_auto,vc_auto/mp4');
      expect(video.params.eager_async).toBe('true');
    });

    it('rejects unknown kinds and extra fields, so the client cannot pick parameters', async () => {
      expect((await post('/signature', { kind: 'anything' })).status).toBe(422);
      const extra = await post('/signature', { kind: 'gallery', folder: 'elsewhere' });
      expect(extra.status).toBe(422);
      expect(errorOf(extra).code).toBe('VALIDATION_ERROR');
    });

    it('answers 502 when the media provider fails', async () => {
      media.failNextCall();
      const res = await post('/signature', { kind: 'gallery' });

      expect(res.status).toBe(502);
      expect(errorOf(res).code).toBe('MEDIA_PROVIDER_ERROR');
    });
  });

  describe('POST /verify', () => {
    function verify(kind: string, publicId: string, resourceType = 'image') {
      return post('/verify', { kind, mediaRef: { publicId, resourceType } });
    }

    it('returns metadata from the provider, not from the client', async () => {
      const uploaded = media.simulateUpload('gallery', {
        width: 3480,
        height: 1952,
        bytes: 706_459,
        format: 'JPG',
        dominantColor: '#4a5a3b',
        originalFilename: 'roman3',
      });
      const res = await verify('gallery', uploaded.publicId);

      expect(res.status).toBe(200);
      expect(verifyResponse.parse(res.body).data.asset).toEqual({
        publicId: uploaded.publicId,
        resourceType: 'image',
        version: uploaded.version,
        format: 'jpg',
        bytes: 706_459,
        width: 3480,
        height: 1952,
        dominantColor: '#4a5a3b',
        originalFilename: 'roman3',
      });
    });

    it('stores duration but no dimensions for audio', async () => {
      const uploaded = media.simulateUpload('track-audio', { duration: 85.9412, width: 0 });
      const res = await verify('track-audio', uploaded.publicId, 'video');
      const { asset } = verifyResponse.parse(res.body).data;

      expect(asset.duration).toBe(85.94);
      expect(asset.width).toBeUndefined();
    });

    it('rejects an asset from another folder without deleting it', async () => {
      const gallery = media.simulateUpload('gallery');
      const res = await verify('track-cover', gallery.publicId);

      expect(res.status).toBe(422);
      expect(errorOf(res).code).toBe('MEDIA_INVALID');
      expect(media.destroyed).toEqual([]);
    });

    it('rejects assets outside the site folder without deleting them', async () => {
      media.putResource({
        ...media.simulateUpload('gallery'),
        publicId: 'someone-else/gallery/photo',
      });
      const res = await verify('gallery', 'someone-else/gallery/photo');

      expect(res.status).toBe(422);
      expect(media.destroyed).toEqual([]);
    });

    it('rejects an asset whose original is publicly delivered', async () => {
      const uploaded = media.simulateUpload('gallery', { type: 'upload' });
      const res = await verify('gallery', uploaded.publicId);

      expect(res.status).toBe(422);
      expect(media.destroyed).toEqual([uploaded.publicId]);
    });

    it('rejects a resource type that does not match the kind', async () => {
      const uploaded = media.simulateUpload('track-audio');
      expect((await verify('track-audio', uploaded.publicId, 'image')).status).toBe(422);
    });

    it('destroys an upload with a disallowed format', async () => {
      const uploaded = media.simulateUpload('gallery', { format: 'gif' });
      const res = await verify('gallery', uploaded.publicId);

      expect(res.status).toBe(422);
      expect(errorOf(res).message).toMatch(/not allowed/);
      expect(media.destroyed).toEqual([uploaded.publicId]);
    });

    it('destroys an upload over the size limit', async () => {
      const uploaded = media.simulateUpload('gallery', { bytes: 21 * 1024 * 1024 });
      const res = await verify('gallery', uploaded.publicId);

      expect(res.status).toBe(422);
      expect(errorOf(res).message).toMatch(/20 MB/);
      expect(media.destroyed).toEqual([uploaded.publicId]);
    });

    it('destroys audio whose duration cannot be read', async () => {
      const uploaded = media.simulateUpload('track-audio', { duration: undefined });
      const res = await verify('track-audio', uploaded.publicId, 'video');

      expect(res.status).toBe(422);
      expect(media.destroyed).toEqual([uploaded.publicId]);
    });

    it('reports a missing upload', async () => {
      const res = await verify('gallery', `${TEST_MEDIA_ROOT}/gallery/does-not-exist`);

      expect(res.status).toBe(422);
      expect(errorOf(res).message).toMatch(/could not be found/);
    });

    it('rejects malformed media ids', async () => {
      expect((await verify('gallery', '../../etc/passwd')).status).toBe(422);
      expect((await verify('gallery', `${TEST_MEDIA_ROOT}/gallery/a b`)).status).toBe(422);
      const injection = await post('/verify', {
        kind: 'gallery',
        mediaRef: { publicId: { $gt: '' }, resourceType: 'image' },
      });
      expect(injection.status).toBe(422);
    });

    it('answers 502 when the media provider fails', async () => {
      const uploaded = media.simulateUpload('gallery');
      media.failNextCall();
      const res = await verify('gallery', uploaded.publicId);

      expect(res.status).toBe(502);
      expect(errorOf(res).code).toBe('MEDIA_PROVIDER_ERROR');
    });
  });
});

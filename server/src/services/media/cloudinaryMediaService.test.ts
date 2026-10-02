import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createCloudinaryApi, type CloudinaryApi } from './cloudinaryApi.js';
import { createCloudinaryMediaService } from './cloudinaryMediaService.js';
import { MediaProviderError } from './MediaService.js';

const ROOT = 'roman-budhathoki/development';
const LIMITS = { maxBytes: { image: 20, audio: 100, video: 100 } };
const CREDENTIALS = { cloudName: 'demo-cloud', apiKey: '1234', apiSecret: 'shh-secret' };

function stubApi(overrides: Partial<CloudinaryApi> = {}): CloudinaryApi {
  return {
    signRequest: vi.fn(() => 'signed'),
    getConfig: vi.fn(() => Promise.resolve({ settings: { folder_mode: 'dynamic' } })),
    getResource: vi.fn(() => Promise.reject(new Error('not stubbed'))),
    listResources: vi.fn(() => Promise.resolve({ resources: [] })),
    destroy: vi.fn(() => Promise.resolve({ result: 'ok' })),
    upload: vi.fn(() => Promise.reject(new Error('not stubbed'))),
    ...overrides,
  };
}

function service(api: CloudinaryApi, folderMode: 'auto' | 'dynamic' | 'fixed' = 'auto') {
  return createCloudinaryMediaService(
    { rootFolder: ROOT, limits: LIMITS, cloudinary: { ...CREDENTIALS, folderMode } },
    api,
  );
}

// Trimmed from a real Admin API response for an image requested with colors=true.
const IMAGE_RESOURCE = {
  asset_id: 'b5e6d2b39ba3e0869d67141ba7dba6cf',
  public_id: `${ROOT}/gallery/x7k2p9`,
  format: 'jpg',
  version: 1_727_870_000,
  resource_type: 'image',
  type: 'private',
  created_at: '2026-10-02T08:20:11Z',
  bytes: 706_459,
  width: 3480,
  height: 1952,
  asset_folder: `${ROOT}/gallery`,
  url: 'http://res.cloudinary.com/demo-cloud/image/upload/v1727870000/x.jpg',
  colors: [
    ['#4A5A3B', 23.1],
    ['#E3D2B4', 12.4],
  ],
  predominant: { google: [['green', 40]] },
};

describe('cloudinaryMediaService', () => {
  describe('createUploadSignature', () => {
    it('detects dynamic folders once and signs asset_folder with a public ID prefix', async () => {
      const api = stubApi();
      const media = service(api);

      const first = await media.createUploadSignature('gallery');
      await media.createUploadSignature('track-audio');

      expect(api.getConfig).toHaveBeenCalledTimes(1);
      expect(first.params).toEqual({
        asset_folder: `${ROOT}/gallery`,
        use_asset_folder_as_public_id_prefix: 'true',
        type: 'private',
        allowed_formats: 'jpg,jpeg,png,webp,heic',
        colors: 'true',
      });
      expect(api.signRequest).toHaveBeenCalledWith({ ...first.params, timestamp: first.timestamp });
      expect(first).toMatchObject({
        cloudName: 'demo-cloud',
        apiKey: '1234',
        signature: 'signed',
        uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
      });
      expect(JSON.stringify(first)).not.toContain('shh-secret');
    });

    it('uses `folder` on fixed-folder accounts', async () => {
      const api = stubApi({
        getConfig: vi.fn(() => Promise.resolve({ settings: { folder_mode: 'fixed' } })),
      });
      const { params } = await service(api).createUploadSignature('video');

      expect(params.folder).toBe(`${ROOT}/videos/media`);
      expect(params.asset_folder).toBeUndefined();
    });

    it('skips detection when the folder mode is configured', async () => {
      const api = stubApi();
      await service(api, 'fixed').createUploadSignature('event');

      expect(api.getConfig).not.toHaveBeenCalled();
    });

    it('retries detection after a failure and reports it as a provider error', async () => {
      const getConfig = vi
        .fn<CloudinaryApi['getConfig']>()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValue({ settings: { folder_mode: 'dynamic' } });
      const media = service(stubApi({ getConfig }));

      await expect(media.createUploadSignature('gallery')).rejects.toBeInstanceOf(
        MediaProviderError,
      );
      await expect(media.createUploadSignature('gallery')).resolves.toBeDefined();
    });
  });

  describe('getResource', () => {
    it('parses the Admin API response into trusted metadata', async () => {
      const api = stubApi({ getResource: vi.fn(() => Promise.resolve(IMAGE_RESOURCE)) });
      const resource = await service(api).getResource({
        publicId: IMAGE_RESOURCE.public_id,
        resourceType: 'image',
      });

      expect(api.getResource).toHaveBeenCalledWith(IMAGE_RESOURCE.public_id, {
        resourceType: 'image',
        colors: true,
      });
      expect(resource).toEqual({
        publicId: IMAGE_RESOURCE.public_id,
        resourceType: 'image',
        type: 'private',
        version: 1_727_870_000,
        format: 'jpg',
        bytes: 706_459,
        width: 3480,
        height: 1952,
        duration: undefined,
        dominantColor: '#4a5a3b',
        originalFilename: undefined,
        createdAt: new Date('2026-10-02T08:20:11Z'),
      });
    });

    it('returns null for a missing asset', async () => {
      const api = stubApi({
        // The SDK rejects with plain objects, not Errors.
        getResource: vi
          .fn<CloudinaryApi['getResource']>()
          .mockRejectedValue({ error: { message: 'Resource not found', http_code: 404 } }),
      });

      await expect(
        service(api).getResource({ publicId: `${ROOT}/gallery/x`, resourceType: 'image' }),
      ).resolves.toBeNull();
    });

    it('wraps other failures and unexpected payloads as provider errors', async () => {
      const failing = stubApi({
        getResource: vi
          .fn<CloudinaryApi['getResource']>()
          .mockRejectedValue({ error: { message: 'Boom', http_code: 500 } }),
      });
      const garbage = stubApi({ getResource: vi.fn(() => Promise.resolve({ nope: true })) });
      const ref = { publicId: `${ROOT}/gallery/x`, resourceType: 'image' as const };

      await expect(service(failing).getResource(ref)).rejects.toBeInstanceOf(MediaProviderError);
      await expect(service(garbage).getResource(ref)).rejects.toBeInstanceOf(MediaProviderError);
    });
  });

  it('never carries credentials from SDK errors into what gets logged', async () => {
    // Shape of a real SDK rejection: it includes the request options with basic auth.
    const sdkError = {
      error: {
        message: 'unknown api_key',
        http_code: 401,
        request_options: { auth: `${CREDENTIALS.apiKey}:${CREDENTIALS.apiSecret}` },
      },
    };
    const getConfig = vi.fn<CloudinaryApi['getConfig']>().mockRejectedValue(sdkError);
    const error: unknown = await service(stubApi({ getConfig }))
      .createUploadSignature('gallery')
      .catch((rejection: unknown) => rejection);

    expect(error).toBeInstanceOf(MediaProviderError);
    const cause = error instanceof MediaProviderError ? error.cause : undefined;
    expect(cause).toEqual(new Error('Cloudinary: unknown api_key (HTTP 401)'));
    expect(JSON.stringify(cause, Object.getOwnPropertyNames(cause))).not.toContain(
      CREDENTIALS.apiSecret,
    );
  });

  describe('destroy', () => {
    it('deletes assets below the root folder', async () => {
      const api = stubApi();
      await service(api).destroy({ publicId: `${ROOT}/gallery/x`, resourceType: 'image' });

      expect(api.destroy).toHaveBeenCalledWith(`${ROOT}/gallery/x`, 'image');
    });

    it('refuses to delete anything outside the root folder', async () => {
      const api = stubApi();
      const media = service(api);

      for (const publicId of ['other/gallery/x', `${ROOT}-copy/x`, `${ROOT}/../production/x`]) {
        await expect(media.destroy({ publicId, resourceType: 'image' })).rejects.toThrow(/outside/);
      }
      expect(api.destroy).not.toHaveBeenCalled();
    });
  });

  it('follows pagination when listing resources', async () => {
    const listResources = vi
      .fn<CloudinaryApi['listResources']>()
      .mockResolvedValueOnce({ resources: [IMAGE_RESOURCE], next_cursor: 'page-2' })
      .mockResolvedValueOnce({ resources: [{ ...IMAGE_RESOURCE, public_id: `${ROOT}/x/2` }] });
    const resources = await service(stubApi({ listResources })).listResources('image');

    expect(resources.map((resource) => resource.publicId)).toEqual([
      IMAGE_RESOURCE.public_id,
      `${ROOT}/x/2`,
    ]);
    expect(listResources).toHaveBeenLastCalledWith({
      resourceType: 'image',
      prefix: `${ROOT}/`,
      nextCursor: 'page-2',
    });
  });
});

describe('createCloudinaryApi', () => {
  it('signs requests the way Cloudinary verifies them', () => {
    // Cloudinary: SHA-1 of the sorted "key=value" pairs joined with "&", followed by the secret.
    const params = { timestamp: 1_727_870_000, asset_folder: 'a/b', allowed_formats: 'jpg,png' };
    const expected = createHash('sha1')
      .update('allowed_formats=jpg,png&asset_folder=a/b&timestamp=1727870000shh-secret')
      .digest('hex');

    expect(createCloudinaryApi(CREDENTIALS).signRequest(params)).toBe(expected);
  });
});

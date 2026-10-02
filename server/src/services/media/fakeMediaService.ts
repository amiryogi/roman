import { createHash, randomBytes } from 'node:crypto';

import {
  MEDIA_DELIVERY_TYPE,
  MEDIA_FORMATS,
  UPLOAD_KIND_RULES,
  type MediaResourceType,
  type UploadKind,
} from '@roman/shared';

import {
  assertUnderRoot,
  MediaProviderError,
  uploadFolder,
  type AssetRef,
  type MediaLimits,
  type MediaService,
  type ProviderResource,
} from './MediaService.js';
import { uploadParamsFor } from './uploadParams.js';

export const FAKE_CLOUD_NAME = 'fake-cloud';

/** In-memory media driver for tests and E2E runs (MEDIA_DRIVER=fake). Never used in production. */
export interface FakeMediaService extends MediaService {
  readonly driver: 'fake';
  /** Public IDs passed to destroy(), in order. */
  readonly destroyed: string[];
  /** Pretends the browser uploaded a file of this kind; returns what Cloudinary would store. */
  simulateUpload(kind: UploadKind, overrides?: Partial<ProviderResource>): ProviderResource;
  /** Stores an arbitrary resource, e.g. one in an unexpected folder. */
  putResource(resource: ProviderResource): void;
  /** Makes the next provider call fail, as if Cloudinary were down. */
  failNextCall(): void;
}

const SAMPLE: Record<'image' | 'audio' | 'video', Partial<ProviderResource>> = {
  image: { format: 'jpg', bytes: 480_000, width: 2048, height: 1365, dominantColor: '#2b2118' },
  audio: { format: 'mp3', bytes: 1_375_424, duration: 85.94 },
  video: { format: 'mp4', bytes: 9_800_000, width: 1920, height: 1080, duration: 42.5 },
};

export function createFakeMediaService(config: {
  rootFolder: string;
  limits: MediaLimits;
}): FakeMediaService {
  const resources = new Map<string, ProviderResource>();
  const destroyed: string[] = [];
  let failNext = false;

  const key = (ref: AssetRef) => `${ref.resourceType}:${ref.publicId}`;

  function maybeFail(): void {
    if (failNext) {
      failNext = false;
      throw new MediaProviderError({ cause: new Error('Simulated provider failure') });
    }
  }

  function simulateUpload(
    kind: UploadKind,
    overrides: Partial<ProviderResource> = {},
  ): ProviderResource {
    const rule = UPLOAD_KIND_RULES[kind];
    const resource: ProviderResource = {
      publicId: `${uploadFolder(config.rootFolder, rule.folder)}/${randomBytes(8).toString('hex')}`,
      resourceType: rule.resourceType,
      type: MEDIA_DELIVERY_TYPE,
      version: Math.floor(Date.now() / 1000),
      format: 'jpg',
      bytes: 1,
      createdAt: new Date(),
      ...SAMPLE[rule.mediaKind],
      ...overrides,
    };
    resources.set(key(resource), resource);
    return resource;
  }

  return {
    driver: 'fake',
    rootFolder: config.rootFolder,
    limits: config.limits,
    destroyed,
    simulateUpload,

    putResource(resource) {
      resources.set(key(resource), resource);
    },

    failNextCall() {
      failNext = true;
    },

    createUploadSignature(kind) {
      maybeFail();
      const rule = UPLOAD_KIND_RULES[kind];
      const params = uploadParamsFor(kind, config.rootFolder, 'dynamic');
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash('sha1')
        .update(JSON.stringify({ params, timestamp }))
        .digest('hex');
      return Promise.resolve({
        kind,
        cloudName: FAKE_CLOUD_NAME,
        apiKey: 'fake-api-key',
        timestamp,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${FAKE_CLOUD_NAME}/${rule.resourceType}/upload`,
        params,
        constraints: {
          resourceType: rule.resourceType,
          allowedFormats: [...MEDIA_FORMATS[rule.mediaKind]],
          maxBytes: config.limits.maxBytes[rule.mediaKind],
        },
      });
    },

    getResource(ref) {
      maybeFail();
      return Promise.resolve(resources.get(key(ref)) ?? null);
    },

    destroy(ref) {
      maybeFail();
      assertUnderRoot(ref.publicId, config.rootFolder);
      resources.delete(key(ref));
      destroyed.push(ref.publicId);
      return Promise.resolve();
    },

    listResources(resourceType: MediaResourceType) {
      maybeFail();
      return Promise.resolve(
        [...resources.values()].filter(
          (resource) =>
            resource.resourceType === resourceType &&
            resource.publicId.startsWith(`${config.rootFolder}/`),
        ),
      );
    },

    uploadFile(kind, _filePath, name) {
      maybeFail();
      const rule = UPLOAD_KIND_RULES[kind];
      const publicId = `${uploadFolder(config.rootFolder, rule.folder)}/${name}`;
      const existing = resources.get(key({ publicId, resourceType: rule.resourceType }));
      const resource = existing ?? simulateUpload(kind, { publicId });
      return Promise.resolve({ publicId: resource.publicId, resourceType: resource.resourceType });
    },
  };
}

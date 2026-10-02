import { z } from 'zod';

import { MEDIA_FORMATS, UPLOAD_KIND_RULES, type MediaResourceType } from '@roman/shared';

import { isRecord } from '../../lib/guards.js';
import type { CloudinaryApi, CloudinaryCredentials } from './cloudinaryApi.js';
import {
  assertUnderRoot,
  MediaProviderError,
  uploadFolder,
  type MediaLimits,
  type MediaService,
  type ProviderResource,
} from './MediaService.js';
import { uploadParamsFor, type FolderMode } from './uploadParams.js';

export interface CloudinaryMediaConfig {
  rootFolder: string;
  limits: MediaLimits;
  cloudinary: CloudinaryCredentials & { folderMode: FolderMode | 'auto' };
}

// Cloudinary's responses are parsed, never trusted or cast (plan §14).
const configResponseSchema = z.object({
  settings: z.object({ folder_mode: z.enum(['dynamic', 'fixed']) }).optional(),
});

const resourceSchema = z.object({
  public_id: z.string().min(1),
  resource_type: z.enum(['image', 'video']),
  type: z.string(),
  version: z.number().int().nonnegative(),
  format: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  // [["#E3D2B4", 22.4], ...], most prominent first.
  colors: z.array(z.tuple([z.string(), z.number()])).optional(),
  original_filename: z.string().optional(),
  created_at: z.iso.datetime({ offset: true }),
});

const resourceListSchema = z.object({
  resources: z.array(resourceSchema),
  next_cursor: z.string().optional(),
});

const uploadResultSchema = z.object({
  public_id: z.string().min(1),
  resource_type: z.enum(['image', 'video']),
});

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function positive(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 ? value : undefined;
}

function toProviderResource(raw: z.output<typeof resourceSchema>): ProviderResource {
  const color = raw.colors?.[0]?.[0];
  return {
    publicId: raw.public_id,
    resourceType: raw.resource_type,
    type: raw.type,
    version: raw.version,
    format: raw.format,
    bytes: raw.bytes,
    width: positive(raw.width),
    height: positive(raw.height),
    duration: positive(raw.duration),
    dominantColor: color && HEX_COLOR.test(color) ? color.toLowerCase() : undefined,
    originalFilename: raw.original_filename,
    createdAt: new Date(raw.created_at),
  };
}

/** The SDK rejects with `{ error: { http_code } }` for API errors. */
function httpCodeOf(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const inner = isRecord(error.error) ? error.error : error;
  return typeof inner.http_code === 'number' ? inner.http_code : undefined;
}

/**
 * SDK errors carry the request options, including basic auth "api_key:api_secret", so they must
 * never be logged as they are. Only the message and HTTP status are kept.
 */
export function toSafeProviderError(error: unknown): MediaProviderError {
  const inner = isRecord(error) && isRecord(error.error) ? error.error : error;
  const message =
    inner instanceof Error
      ? inner.message
      : isRecord(inner) && typeof inner.message === 'string'
        ? inner.message
        : 'Unknown error';
  const status = httpCodeOf(error);
  const summary = `Cloudinary: ${message}${status === undefined ? '' : ` (HTTP ${String(status)})`}`;
  return new MediaProviderError({ cause: new Error(summary) });
}

async function call<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toSafeProviderError(error);
  }
}

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new MediaProviderError({ cause: result.error });
  return result.data;
}

export function createCloudinaryMediaService(
  config: CloudinaryMediaConfig,
  api: CloudinaryApi,
): MediaService {
  const { cloudName, apiKey } = config.cloudinary;
  let folderMode: Promise<FolderMode> | undefined;

  /** Asks Cloudinary once per process. A failed lookup is retried on the next upload. */
  function resolveFolderMode(): Promise<FolderMode> {
    const configured = config.cloudinary.folderMode;
    if (configured !== 'auto') return Promise.resolve(configured);
    folderMode ??= call(() => api.getConfig())
      .then((response) => parse(configResponseSchema, response).settings?.folder_mode ?? 'fixed')
      .catch((error: unknown) => {
        folderMode = undefined;
        throw error;
      });
    return folderMode;
  }

  return {
    driver: 'cloudinary',
    rootFolder: config.rootFolder,
    limits: config.limits,

    async createUploadSignature(kind) {
      const rule = UPLOAD_KIND_RULES[kind];
      const params = uploadParamsFor(kind, config.rootFolder, await resolveFolderMode());
      // Cloudinary accepts a signed request for one hour after `timestamp`.
      const timestamp = Math.floor(Date.now() / 1000);
      return {
        kind,
        cloudName,
        apiKey,
        timestamp,
        signature: api.signRequest({ ...params, timestamp }),
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${rule.resourceType}/upload`,
        params,
        constraints: {
          resourceType: rule.resourceType,
          allowedFormats: [...MEDIA_FORMATS[rule.mediaKind]],
          maxBytes: config.limits.maxBytes[rule.mediaKind],
        },
      };
    },

    async getResource(ref) {
      try {
        const raw = await api.getResource(ref.publicId, {
          resourceType: ref.resourceType,
          colors: ref.resourceType === 'image',
        });
        return toProviderResource(parse(resourceSchema, raw));
      } catch (error) {
        if (httpCodeOf(error) === 404) return null;
        if (error instanceof MediaProviderError) throw error;
        throw toSafeProviderError(error);
      }
    },

    async destroy(ref) {
      assertUnderRoot(ref.publicId, config.rootFolder);
      // Answers { result: "ok" } or { result: "not found" }; both mean the asset is gone.
      await call(() => api.destroy(ref.publicId, ref.resourceType));
    },

    async listResources(resourceType: MediaResourceType) {
      const resources: ProviderResource[] = [];
      let nextCursor: string | undefined;
      do {
        const cursor = nextCursor;
        const page = parse(
          resourceListSchema,
          await call(() =>
            api.listResources({
              resourceType,
              prefix: `${config.rootFolder}/`,
              nextCursor: cursor,
            }),
          ),
        );
        resources.push(...page.resources.map(toProviderResource));
        nextCursor = page.next_cursor;
      } while (nextCursor);
      return resources;
    },

    async uploadFile(kind, filePath, name) {
      const rule = UPLOAD_KIND_RULES[kind];
      const params = {
        ...uploadParamsFor(kind, config.rootFolder, await resolveFolderMode()),
        public_id: name,
        overwrite: 'false',
      };
      const result = parse(
        uploadResultSchema,
        await call(() => api.upload(filePath, rule.resourceType, params)),
      );
      assertUnderRoot(result.public_id, uploadFolder(config.rootFolder, rule.folder));
      return { publicId: result.public_id, resourceType: result.resource_type };
    },
  };
}

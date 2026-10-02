import { v2 as cloudinary } from 'cloudinary';

import { MEDIA_DELIVERY_TYPE, type MediaResourceType } from '@roman/shared';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

type Params = Record<string, string>;

/**
 * The few Cloudinary SDK calls the site uses. This is the only module that imports the SDK.
 * Its responses are weakly typed, so every method returns `unknown` for the caller to parse.
 * Credentials are passed per call instead of through the SDK's global configuration.
 */
export interface CloudinaryApi {
  signRequest(params: Record<string, string | number>): string;
  getConfig(): Promise<unknown>;
  getResource(
    publicId: string,
    options: { resourceType: MediaResourceType; colors: boolean },
  ): Promise<unknown>;
  listResources(options: {
    resourceType: MediaResourceType;
    prefix: string;
    nextCursor?: string;
  }): Promise<unknown>;
  destroy(publicId: string, resourceType: MediaResourceType): Promise<unknown>;
  upload(filePath: string, resourceType: MediaResourceType, params: Params): Promise<unknown>;
}

export function createCloudinaryApi(credentials: CloudinaryCredentials): CloudinaryApi {
  const auth = {
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
  };

  return {
    signRequest: (params) => cloudinary.utils.api_sign_request(params, credentials.apiSecret),

    getConfig: () => cloudinary.api.config({ ...auth, settings: true }),

    getResource: async (publicId, { resourceType, colors }) => {
      const result: unknown = await cloudinary.api.resource(publicId, {
        ...auth,
        resource_type: resourceType,
        type: MEDIA_DELIVERY_TYPE,
        colors,
        // Without it the Admin API omits duration and original_filename.
        media_metadata: true,
      });
      return result;
    },

    listResources: async ({ resourceType, prefix, nextCursor }) => {
      const result: unknown = await cloudinary.api.resources({
        ...auth,
        resource_type: resourceType,
        type: MEDIA_DELIVERY_TYPE,
        prefix,
        max_results: 500,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });
      return result;
    },

    destroy: async (publicId, resourceType) => {
      const result: unknown = await cloudinary.uploader.destroy(publicId, {
        ...auth,
        resource_type: resourceType,
        type: MEDIA_DELIVERY_TYPE,
        invalidate: true,
      });
      return result;
    },

    upload: async (filePath, resourceType, params) => {
      const result: unknown = await cloudinary.uploader.upload(filePath, {
        ...auth,
        ...params,
        resource_type: resourceType,
      });
      return result;
    },
  };
}

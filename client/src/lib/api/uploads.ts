import {
  uploadSignatureDtoSchema,
  uploadVerifyDtoSchema,
  type MediaAssetDto,
  type MediaRef,
  type UploadKind,
  type UploadSignatureDto,
} from '@roman/shared';

import { apiRequest } from './client';

/** Signed parameters for one direct upload to Cloudinary (plan §9.2). */
export function getUploadSignature(kind: UploadKind): Promise<UploadSignatureDto> {
  return apiRequest('/admin/uploads/signature', uploadSignatureDtoSchema, {
    method: 'POST',
    body: { kind },
    auth: true,
  });
}

/** Asks the server to check an upload; resolves to the metadata it will store. */
export async function verifyUpload(kind: UploadKind, mediaRef: MediaRef): Promise<MediaAssetDto> {
  const { asset } = await apiRequest('/admin/uploads/verify', uploadVerifyDtoSchema, {
    method: 'POST',
    body: { kind, mediaRef },
    auth: true,
  });
  return asset;
}

import {
  AUDIO_STREAM_FORMAT,
  AUDIO_STREAM_TRANSFORMATION,
  MEDIA_DELIVERY_TYPE,
  MEDIA_FORMATS,
  UPLOAD_KIND_RULES,
  VIDEO_STANDARD_FORMAT,
  VIDEO_STANDARD_TRANSFORMATION,
  type UploadKind,
} from '@roman/shared';

import { uploadFolder } from './MediaService.js';

export type FolderMode = 'dynamic' | 'fixed';

/**
 * Where an asset goes. Dynamic-folder accounts (most created since 2023) separate the folder from
 * the public ID, so the folder is also applied as a public ID prefix. Fixed-folder accounts use
 * `folder`, which does both. Either way the public ID starts with the folder path (plan §9.1).
 */
export function folderParams(mode: FolderMode, folder: string): Record<string, string> {
  return mode === 'dynamic'
    ? { asset_folder: folder, use_asset_folder_as_public_id_prefix: 'true' }
    : { folder };
}

/**
 * The upload parameters for a kind, chosen by the server only (plan §9.2). All of them are signed,
 * so the browser can't change the folder, formats or transformations. Values are strings because
 * they are posted as form fields exactly as signed.
 */
export function uploadParamsFor(
  kind: UploadKind,
  rootFolder: string,
  mode: FolderMode,
): Record<string, string> {
  const rule = UPLOAD_KIND_RULES[kind];
  const params: Record<string, string> = {
    ...folderParams(mode, uploadFolder(rootFolder, rule.folder)),
    // Originals need a signed URL; transformed versions are public (plan §9, owner decision).
    type: MEDIA_DELIVERY_TYPE,
    allowed_formats: MEDIA_FORMATS[rule.mediaKind].join(','),
  };

  switch (rule.mediaKind) {
    case 'image':
      // Predominant colours give the placeholder background (plan §9.3).
      params.colors = 'true';
      break;
    case 'audio':
      params.eager = `${AUDIO_STREAM_TRANSFORMATION}/${AUDIO_STREAM_FORMAT}`;
      params.eager_async = 'true';
      break;
    case 'video':
      params.eager = `${VIDEO_STANDARD_TRANSFORMATION}/${VIDEO_STANDARD_FORMAT}`;
      params.eager_async = 'true';
      break;
  }
  return params;
}

import { z } from 'zod';

import {
  fileExtension,
  MEDIA_FORMATS,
  UPLOAD_KIND_RULES,
  type MediaRef,
  type UploadKind,
  type UploadSignatureDto,
} from '@roman/shared';

/** A failed direct upload, with a message written for the admin. */
export class UploadError extends Error {
  override readonly name = 'UploadError';
}

const MEGABYTE = 1024 * 1024;

/** The `accept` attribute for a kind's file input, e.g. ".jpg,.jpeg,.png". */
export function acceptFor(kind: UploadKind): string {
  return MEDIA_FORMATS[UPLOAD_KIND_RULES[kind].mediaKind].map((format) => `.${format}`).join(',');
}

/** Checked before anything is uploaded; Cloudinary and the server check again. */
export function checkFileType(file: File, kind: UploadKind): string | undefined {
  const formats = MEDIA_FORMATS[UPLOAD_KIND_RULES[kind].mediaKind];
  return formats.includes(fileExtension(file.name))
    ? undefined
    : `This file type can't be used here. Choose a ${formats.join(', ')} file.`;
}

export function checkFileSize(file: File, maxBytes: number): string | undefined {
  if (file.size === 0) return 'This file is empty.';
  return file.size > maxBytes
    ? `This file is ${(file.size / MEGABYTE).toFixed(1)} MB. The limit is ${String(Math.round(maxBytes / MEGABYTE))} MB.`
    : undefined;
}

// Cloudinary's upload response; only what the uploader needs.
const uploadResponseSchema = z.object({
  public_id: z.string().min(1),
  resource_type: z.enum(['image', 'video']),
});
const errorResponseSchema = z.object({ error: z.object({ message: z.string() }) });

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

/** Turns Cloudinary's error into something the admin can act on (plan §22). */
export function describeCloudinaryError(status: number, body: unknown): string {
  const parsed = errorResponseSchema.safeParse(body);
  const message = parsed.success ? parsed.data.error.message : '';
  if (/not allowed/i.test(message)) return "This file type isn't allowed here.";
  if (/too large/i.test(message)) return 'This file is too large for the media service.';
  if (/signature|timestamp|stale/i.test(message) || status === 401) {
    return 'The upload permission expired. Please try again.';
  }
  return message ? `The upload was rejected: ${message}` : 'The upload failed. Please try again.';
}

export interface UploadProgressOptions {
  /** Called with a fraction from 0 to 1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Posts a file straight to Cloudinary with the server's signature (plan §9.2 step 3).
 * XMLHttpRequest rather than fetch, because fetch can't report upload progress.
 * Rejects with UploadError, or with an AbortError DOMException when cancelled.
 */
export function uploadToCloudinary(
  file: File,
  signature: UploadSignatureDto,
  { onProgress, signal }: UploadProgressOptions = {},
): Promise<MediaRef> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(signature.params)) form.append(key, value);
    form.append('api_key', signature.apiKey);
    form.append('timestamp', String(signature.timestamp));
    form.append('signature', signature.signature);
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    const abort = () => {
      xhr.abort();
    };
    signal?.addEventListener('abort', abort, { once: true });
    const done = () => {
      signal?.removeEventListener('abort', abort);
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      done();
      const body = parseJson(xhr.responseText);
      const result = uploadResponseSchema.safeParse(body);
      if (xhr.status >= 200 && xhr.status < 300 && result.success) {
        resolve({ publicId: result.data.public_id, resourceType: result.data.resource_type });
      } else {
        reject(new UploadError(describeCloudinaryError(xhr.status, body)));
      }
    });
    xhr.addEventListener('error', () => {
      done();
      reject(new UploadError('The upload failed. Check your connection and try again.'));
    });
    xhr.addEventListener('abort', () => {
      done();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });

    xhr.open('POST', signature.uploadUrl);
    xhr.send(form);
  });
}

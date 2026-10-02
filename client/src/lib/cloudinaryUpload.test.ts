import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UploadSignatureDto } from '@roman/shared';

import {
  acceptFor,
  checkFileSize,
  checkFileType,
  describeCloudinaryError,
  uploadToCloudinary,
  UploadError,
} from './cloudinaryUpload';

const SIGNATURE: UploadSignatureDto = {
  kind: 'gallery',
  cloudName: 'demo-cloud',
  apiKey: '1234',
  timestamp: 1727870000,
  signature: 'abc',
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
  params: { asset_folder: 'root/gallery', allowed_formats: 'jpg,png' },
  constraints: { resourceType: 'image', allowedFormats: ['jpg', 'png'], maxBytes: 1000 },
};

/** Minimal stand-in for XMLHttpRequest; the test drives its events. */
class FakeXhr {
  static last: FakeXhr | undefined;
  readonly upload = new EventTarget();
  readonly events = new EventTarget();
  status = 0;
  responseText = '';
  method = '';
  url = '';
  body: FormData | undefined;

  constructor() {
    FakeXhr.last = this;
  }
  addEventListener(type: string, listener: () => void) {
    this.events.addEventListener(type, listener);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.events.dispatchEvent(new Event('abort'));
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.events.dispatchEvent(new Event('load'));
  }
  progress(loaded: number, total: number) {
    this.upload.dispatchEvent(
      new ProgressEvent('progress', { lengthComputable: true, loaded, total }),
    );
  }
}

function currentXhr(): FakeXhr {
  if (!FakeXhr.last) throw new Error('No request was made');
  return FakeXhr.last;
}

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

beforeEach(() => {
  FakeXhr.last = undefined;
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('file checks', () => {
  it('accepts only the formats for the kind', () => {
    expect(acceptFor('track-audio')).toBe('.mp3,.wav,.m4a,.aac,.flac,.ogg');
    expect(checkFileType(file('Photo.JPG'), 'gallery')).toBeUndefined();
    expect(checkFileType(file('clip.mp4'), 'gallery')).toMatch(/can't be used/);
    expect(checkFileType(file('noextension'), 'track-audio')).toMatch(/mp3/);
  });

  it('enforces the size limit from the server', () => {
    expect(checkFileSize(file('a.jpg', 10), 1000)).toBeUndefined();
    expect(checkFileSize(file('a.jpg', 0), 1000)).toMatch(/empty/);
    expect(checkFileSize(file('a.jpg', 3 * 1024 * 1024), 2 * 1024 * 1024)).toBe(
      'This file is 3.0 MB. The limit is 2 MB.',
    );
  });
});

describe('uploadToCloudinary', () => {
  it('posts the signed fields and the file, reports progress and returns the reference', async () => {
    const onProgress = vi.fn();
    const promise = uploadToCloudinary(file('photo.jpg'), SIGNATURE, { onProgress });
    const xhr = currentXhr();

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe(SIGNATURE.uploadUrl);
    expect(
      Object.fromEntries([...(xhr.body?.entries() ?? [])].filter(([, v]) => typeof v === 'string')),
    ).toEqual({
      asset_folder: 'root/gallery',
      allowed_formats: 'jpg,png',
      api_key: '1234',
      timestamp: '1727870000',
      signature: 'abc',
    });
    expect(xhr.body?.get('file')).toBeInstanceOf(File);

    xhr.progress(5, 10);
    expect(onProgress).toHaveBeenCalledWith(0.5);

    xhr.respond(200, { public_id: 'root/gallery/abc', resource_type: 'image', version: 1 });
    await expect(promise).resolves.toEqual({ publicId: 'root/gallery/abc', resourceType: 'image' });
  });

  it("explains Cloudinary's errors", async () => {
    const promise = uploadToCloudinary(file('photo.jpg'), SIGNATURE);
    currentXhr().respond(400, { error: { message: 'Image file format gif not allowed' } });

    await expect(promise).rejects.toEqual(new UploadError("This file type isn't allowed here."));
  });

  it('rejects with an AbortError when cancelled', async () => {
    const controller = new AbortController();
    const promise = uploadToCloudinary(file('photo.jpg'), SIGNATURE, { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('describeCloudinaryError', () => {
  it('maps known failures and falls back to the message', () => {
    expect(
      describeCloudinaryError(400, { error: { message: 'File size too large. Got 1.' } }),
    ).toMatch(/too large/);
    expect(describeCloudinaryError(401, { error: { message: 'Invalid Signature abc' } })).toMatch(
      /expired/,
    );
    expect(describeCloudinaryError(500, { error: { message: 'Something odd' } })).toBe(
      'The upload was rejected: Something odd',
    );
    expect(describeCloudinaryError(502, undefined)).toBe('The upload failed. Please try again.');
  });
});

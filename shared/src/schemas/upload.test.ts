import { describe, expect, it } from 'vitest';

import { UPLOAD_KINDS } from '../enums.js';
import {
  fileExtension,
  MEDIA_FORMATS,
  UPLOAD_KIND_RULES,
  uploadSignatureInputSchema,
  uploadVerifyInputSchema,
} from './upload.js';

describe('upload rules', () => {
  it('stores audio as a Cloudinary video resource and everything else by its kind', () => {
    for (const kind of UPLOAD_KINDS) {
      const rule = UPLOAD_KIND_RULES[kind];
      expect(rule.resourceType).toBe(rule.mediaKind === 'image' ? 'image' : 'video');
      expect(rule.folder).toMatch(/^[a-z]+(?:\/[a-z]+)?$/);
    }
    expect(UPLOAD_KIND_RULES['track-audio']).toEqual({
      mediaKind: 'audio',
      resourceType: 'video',
      folder: 'music/audio',
    });
  });

  it('keeps the plan §9.2 format lists', () => {
    expect(MEDIA_FORMATS.image).toEqual(['jpg', 'jpeg', 'png', 'webp', 'heic']);
    expect(MEDIA_FORMATS.video).toEqual(['mp4', 'mov', 'webm']);
  });

  it('reads file extensions case-insensitively', () => {
    expect(fileExtension('roman4.JPG')).toBe('jpg');
    expect(fileExtension('music for the website.mp3')).toBe('mp3');
    expect(fileExtension('README')).toBe('');
  });
});

describe('upload input schemas', () => {
  it('accepts only a known kind, so the client cannot choose upload parameters', () => {
    expect(uploadSignatureInputSchema.safeParse({ kind: 'gallery' }).success).toBe(true);
    expect(uploadSignatureInputSchema.safeParse({ kind: 'secret-folder' }).success).toBe(false);
    expect(uploadSignatureInputSchema.safeParse({ kind: 'gallery', folder: 'x' }).success).toBe(
      false,
    );
  });

  it('validates the media reference', () => {
    const valid = {
      kind: 'gallery',
      mediaRef: { publicId: 'root/gallery/a1', resourceType: 'image' },
    };
    expect(uploadVerifyInputSchema.safeParse(valid).success).toBe(true);
    expect(
      uploadVerifyInputSchema.safeParse({
        ...valid,
        mediaRef: { publicId: 'root/../x', resourceType: 'image' },
      }).success,
    ).toBe(false);
  });
});

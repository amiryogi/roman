import { describe, expect, it } from 'vitest';

import {
  createMediaUrls,
  imageTransformation,
  responsiveWidths,
  youtubeThumbnailUrl,
} from './cloudinary';

const urls = createMediaUrls('demo-cloud');
const BASE = 'https://res.cloudinary.com/demo-cloud';

const photo = {
  publicId: 'roman-budhathoki/production/gallery/abc123',
  version: 1727870000,
  width: 3480,
  height: 1952,
};
const audio = { publicId: 'roman-budhathoki/production/music/audio/xyz', version: 17 };

describe('imageTransformation', () => {
  it('builds fill crops with gravity and both dimensions', () => {
    expect(imageTransformation({ crop: 'fill', width: 160, height: 160 })).toBe(
      'c_fill,g_auto,w_160,h_160,f_auto,q_auto',
    );
    expect(
      imageTransformation({
        crop: 'fill',
        width: 400,
        height: 300.4,
        gravity: 'face',
        quality: 'auto:eco',
      }),
    ).toBe('c_fill,g_face,w_400,h_300,f_auto,q_auto:eco');
  });

  it('builds limit crops without gravity', () => {
    expect(imageTransformation({ crop: 'limit', width: 1280 })).toBe(
      'c_limit,w_1280,f_auto,q_auto',
    );
  });
});

describe('createMediaUrls', () => {
  it('builds image URLs from publicId and version', () => {
    expect(urls.imageUrl(photo, { crop: 'limit', width: 640 })).toBe(
      `${BASE}/image/private/c_limit,w_640,f_auto,q_auto/v1727870000/roman-budhathoki/production/gallery/abc123`,
    );
  });

  it('builds a srcset capped at the original width', () => {
    const small = { ...photo, width: 1000, height: 600 };
    const entries = urls.imageSrcSet(small).split(', ');

    expect(entries.map((entry) => entry.split(' ')[1])).toEqual([
      '320w',
      '480w',
      '640w',
      '768w',
      '1000w',
    ]);
    expect(entries[0]).toBe(
      `${BASE}/image/private/c_limit,w_320,f_auto,q_auto/v1727870000/roman-budhathoki/production/gallery/abc123 320w`,
    );
  });

  it('crops srcset candidates to an aspect ratio', () => {
    const entries = urls.imageSrcSet(photo, { aspect: 1, widths: [320, 2400] }).split(', ');

    // A square crop of a 3480×1952 photo is at most 1952 wide.
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain('c_fill,g_auto,w_320,h_320,f_auto,q_auto');
    expect(entries[1]).toContain('c_fill,g_auto,w_1952,h_1952');
    expect(entries[1]).toMatch(/ 1952w$/);
  });

  it('builds placeholder and Open Graph URLs', () => {
    expect(urls.lqipUrl(photo)).toContain(
      '/image/private/w_32,e_blur:1000,q_1,f_auto/v1727870000/',
    );
    expect(urls.ogImageUrl(photo)).toContain('/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/');
  });

  it('streams audio as 160 kbps MP3 from the video resource type', () => {
    expect(urls.audioUrl(audio)).toBe(
      `${BASE}/video/private/ac_mp3,br_160k/v17/roman-budhathoki/production/music/audio/xyz.mp3`,
    );
  });

  it('delivers the video rendition created at upload, or a smaller one', () => {
    const video = { publicId: 'root/videos/media/v1', version: 3 };

    expect(urls.videoUrl(video)).toBe(
      `${BASE}/video/private/c_limit,w_1280,q_auto,vc_auto/v3/root/videos/media/v1.mp4`,
    );
    expect(urls.videoUrl(video, { width: 720 })).toContain('/c_limit,w_720,q_auto,vc_auto/');
    expect(urls.videoPosterUrl(video, { width: 640 })).toBe(
      `${BASE}/video/private/so_auto,c_limit,w_640,f_auto,q_auto/v3/root/videos/media/v1.jpg`,
    );
    expect(urls.videoPosterUrl(video, { offset: 2 })).toContain('/so_2,');
  });

  it('encodes unusual characters in public IDs', () => {
    expect(urls.imageUrl({ publicId: 'a/b c', version: 1 }, { crop: 'limit' })).toMatch(
      /\/v1\/a\/b%20c$/,
    );
  });
});

describe('responsiveWidths', () => {
  it('keeps candidates up to the original and adds the original width', () => {
    expect(responsiveWidths(700, [320, 640, 1024])).toEqual([320, 640, 700]);
    expect(responsiveWidths(200, [320, 640])).toEqual([200]);
    expect(responsiveWidths(5000, [320, 640])).toEqual([320, 640]);
    expect(responsiveWidths(undefined, [320, 640])).toEqual([320, 640]);
  });
});

it('builds YouTube thumbnail URLs', () => {
  expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  );
});

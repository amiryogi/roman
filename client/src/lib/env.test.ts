import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('client env', () => {
  it('applies defaults and trims trailing slashes', () => {
    expect(
      parseEnv({ VITE_SITE_URL: 'https://example.test/', VITE_API_BASE_URL: '/api/' }, false),
    ).toEqual({
      apiBaseUrl: '/api',
      siteUrl: 'https://example.test',
      cloudinaryCloudName: undefined,
    });
    expect(parseEnv({}, false).siteUrl).toBe('http://localhost:5173');
  });

  it('requires a valid cloud name in production and a valid site URL', () => {
    expect(() => parseEnv({}, true)).toThrow('VITE_CLOUDINARY_CLOUD_NAME is required');
    expect(() => parseEnv({ VITE_CLOUDINARY_CLOUD_NAME: 'bad name!' }, false)).toThrow(
      'not a valid cloud name',
    );
    expect(() => parseEnv({ VITE_SITE_URL: 'example.test' }, false)).toThrow('absolute URL');
    expect(parseEnv({ VITE_CLOUDINARY_CLOUD_NAME: 'demo-cloud' }, true).cloudinaryCloudName).toBe(
      'demo-cloud',
    );
  });
});

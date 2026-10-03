import { describe, expect, it } from 'vitest';

import { EnvError, loadEnv } from './env.js';

const MINIMAL = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  CLOUDINARY_CLOUD_NAME: 'demo-cloud',
  CLOUDINARY_API_KEY: '1234',
  CLOUDINARY_API_SECRET: 'cloudinary-secret',
};

/** A copy of an environment without one variable. */
function without(source: Record<string, string>, name: string): Record<string, string> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => key !== name));
}

const PRODUCTION = {
  ...MINIMAL,
  NODE_ENV: 'production',
  CLIENT_ORIGINS: 'https://example.com',
  CLOUDINARY_ROOT_FOLDER: 'roman-budhathoki/production',
  IP_HASH_SALT: 'a-production-salt-value',
};

describe('loadEnv', () => {
  it('applies development defaults', () => {
    const env = loadEnv(MINIMAL);

    expect(env).toMatchObject({
      nodeEnv: 'development',
      isProduction: false,
      port: 4000,
      clientOrigins: ['http://localhost:5173'],
      trustProxy: 0,
      version: 'dev',
    });
  });

  it('fails with a clear message when MONGODB_URI is missing', () => {
    expect(() => loadEnv({})).toThrow(EnvError);
    expect(() => loadEnv({})).toThrow(/MONGODB_URI/);
  });

  it('requires a long JWT secret and defaults token lifetimes', () => {
    expect(() => loadEnv({ ...MINIMAL, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() =>
      loadEnv({
        ...MINIMAL,
        JWT_ACCESS_SECRET: 'replace-with-a-long-random-secret-of-at-least-32-chars',
      }),
    ).toThrow(/example value/);
    expect(loadEnv(MINIMAL).auth).toMatchObject({
      accessTtlSeconds: 900,
      refreshTtlDays: 7,
      secureCookies: false,
    });
  });

  it('rejects a connection string that is not MongoDB', () => {
    expect(() => loadEnv({ ...MINIMAL, MONGODB_URI: 'postgres://localhost/db' })).toThrow(
      /mongodb/,
    );
  });

  it('requires CLIENT_ORIGINS in production', () => {
    expect(() => loadEnv(without(PRODUCTION, 'CLIENT_ORIGINS'))).toThrow(/CLIENT_ORIGINS/);
  });

  it('parses a comma-separated origin list and rejects invalid entries', () => {
    const env = loadEnv({
      ...MINIMAL,
      CLIENT_ORIGINS: 'https://example.com, https://www.example.com',
    });
    expect(env.clientOrigins).toEqual(['https://example.com', 'https://www.example.com']);

    expect(() => loadEnv({ ...MINIMAL, CLIENT_ORIGINS: 'not a url' })).toThrow(
      /not a valid origin/,
    );
  });

  it('derives the version from the Render commit when APP_VERSION is unset', () => {
    expect(loadEnv({ ...MINIMAL, RENDER_GIT_COMMIT: 'abcdef1234567' }).version).toBe('abcdef1');
    expect(loadEnv({ ...MINIMAL, APP_VERSION: '1.2.3' }).version).toBe('1.2.3');
  });

  it('requires the inquiry salt in production only', () => {
    expect(() => loadEnv(without(PRODUCTION, 'IP_HASH_SALT'))).toThrow(/IP_HASH_SALT/);
    expect(loadEnv(MINIMAL).inquiries.secret.length).toBeGreaterThanOrEqual(16);
    expect(() => loadEnv({ ...MINIMAL, IP_HASH_SALT: 'short' })).toThrow(/IP_HASH_SALT/);
  });

  describe('media', () => {
    it('defaults to Cloudinary with a per-environment root folder and plan limits', () => {
      expect(loadEnv(MINIMAL).media).toEqual({
        driver: 'cloudinary',
        rootFolder: 'roman-budhathoki/development',
        limits: {
          maxBytes: { image: 20 * 1024 ** 2, audio: 100 * 1024 ** 2, video: 100 * 1024 ** 2 },
        },
        cloudinary: {
          cloudName: 'demo-cloud',
          apiKey: '1234',
          apiSecret: 'cloudinary-secret',
          folderMode: 'auto',
        },
      });
    });

    it('requires Cloudinary credentials unless the fake driver is chosen', () => {
      const withoutSecret = without(MINIMAL, 'CLOUDINARY_API_SECRET');

      expect(() => loadEnv(withoutSecret)).toThrow(/CLOUDINARY_API_SECRET/);
      expect(loadEnv({ ...withoutSecret, MEDIA_DRIVER: 'fake' }).media.driver).toBe('fake');
    });

    it('requires an explicit root folder and a real driver in production', () => {
      const withoutRoot = without(PRODUCTION, 'CLOUDINARY_ROOT_FOLDER');

      expect(loadEnv(PRODUCTION).media.rootFolder).toBe('roman-budhathoki/production');
      expect(() => loadEnv(withoutRoot)).toThrow(/CLOUDINARY_ROOT_FOLDER/);
      expect(() => loadEnv({ ...PRODUCTION, MEDIA_DRIVER: 'fake' })).toThrow(/MEDIA_DRIVER/);
    });

    it('validates the root folder and size limits', () => {
      expect(() => loadEnv({ ...MINIMAL, CLOUDINARY_ROOT_FOLDER: '/abs/path/' })).toThrow(
        /CLOUDINARY_ROOT_FOLDER/,
      );
      expect(loadEnv({ ...MINIMAL, MEDIA_MAX_VIDEO_MB: '250' }).media.limits.maxBytes.video).toBe(
        250 * 1024 ** 2,
      );
    });
  });
});

import { describe, expect, it } from 'vitest';

import { EnvError, loadEnv } from './env.js';

const MINIMAL = { MONGODB_URI: 'mongodb://127.0.0.1:27017/test' };

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

  it('rejects a connection string that is not MongoDB', () => {
    expect(() => loadEnv({ MONGODB_URI: 'postgres://localhost/db' })).toThrow(/mongodb/);
  });

  it('requires CLIENT_ORIGINS in production', () => {
    expect(() => loadEnv({ ...MINIMAL, NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGINS/);
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
});

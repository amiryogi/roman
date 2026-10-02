import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// mongodb-memory-server's postinstall downloads MongoDB into the root node_modules cache.
// Point tests at it explicitly; otherwise running from server/ falls back to ~/.cache and re-downloads.
const MONGO_BINARY_DIR = fileURLToPath(
  new URL('../node_modules/.cache/mongodb-memory-server', import.meta.url),
);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    env: { MONGOMS_DOWNLOAD_DIR: MONGO_BINARY_DIR },
    // Allows for a first-time binary download on a fresh machine or CI runner.
    hookTimeout: 180_000,
  },
});

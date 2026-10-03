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
    // `npm run test:coverage` (CI): plan §25 Phase 11 asks for at least 80% of lines in the modules.
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, statements: 80, functions: 80 },
    },
  },
});

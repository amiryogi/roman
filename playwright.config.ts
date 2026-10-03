import { defineConfig, devices } from '@playwright/test';

import { E2E_API_PORT, E2E_CLIENT_ORIGIN, E2E_CLIENT_PORT, E2E_CLOUD_NAME } from './e2e/config.js';

// End-to-end suite (plan §19). Playwright starts the test API (in-memory MongoDB, fake media,
// seeded content) and serves a production build of the client with `vite preview`, which applies
// the same CSP and routing as Vercel.

const CI = Boolean(process.env.CI);
const API_URL = `http://localhost:${String(E2E_API_PORT)}`;

export default defineConfig({
  testDir: 'e2e',
  // One worker: every test shares the seeded database.
  workers: 1,
  fullyParallel: false,
  // No retries: a flaky test should fail and be fixed, not hidden.
  retries: 0,
  forbidOnly: CI,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  // In CI, `github` turns each failure into an annotation on the run (readable without the logs).
  reporter: CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: E2E_CLIENT_ORIGIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // The admin is a desktop tool; phones run the visitor and accessibility specs.
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testIgnore: /admin\.spec\.ts/ },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testIgnore: /admin\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'npx tsx e2e/server/api.ts',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !CI,
      timeout: 180_000,
      stdout: 'pipe',
    },
    {
      command:
        // `shared` is already built by `npm run test:e2e`; both servers import it.
        'npm run build -w @roman/client && ' +
        `npm run preview -w @roman/client -- --port ${String(E2E_CLIENT_PORT)} --strictPort`,
      url: E2E_CLIENT_ORIGIN,
      reuseExistingServer: !CI,
      timeout: 300_000,
      env: {
        VITE_CLOUDINARY_CLOUD_NAME: E2E_CLOUD_NAME,
        VITE_SITE_URL: E2E_CLIENT_ORIGIN,
        VITE_API_BASE_URL: '/api',
        API_PROXY_TARGET: API_URL,
        // The prerender reads no content in E2E runs.
        SEO_BUILD_API_URL: '',
      },
    },
  ],
});

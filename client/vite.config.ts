/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, posix, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { z } from 'zod';

// In development the API is reached through this proxy, mirroring the production
// Vercel rewrite of /api/* to the Render service (plan §0.4).
// API_PROXY_TARGET lets the E2E suite point the preview at its own test API.
const API_DEV_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

/** The Zod-free part of `shared` (`@roman/shared/lite`): constants and time-zone helpers. */
const SHARED_LITE = /[\\/]shared[\\/]dist[\\/](?:constants|timezone|lite)\.js$/;
/**
 * Zod and the schemas public pages validate with. The upload schemas are admin-only, so they stay
 * out and load with the admin pages.
 */
const SCHEMAS =
  /[\\/]node_modules[\\/]zod[\\/]|[\\/]shared[\\/]dist[\\/](?!schemas[\\/]upload\.js$)/;
/**
 * React, React Router and TanStack Query. The entry needs them on every page; without a group,
 * the parts the admin also uses become several small chunks, which compress worse than one.
 */
const CORE = /[\\/]node_modules[\\/](?:react|react-dom|scheduler|react-router|@tanstack)[\\/]/;

const vercelConfigSchema = z.object({
  rewrites: z.array(z.object({ source: z.string(), destination: z.string() })),
  headers: z.array(
    z.object({
      source: z.string(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
});

function readVercelConfig(): z.infer<typeof vercelConfigSchema> {
  return vercelConfigSchema.parse(
    JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')),
  );
}

/**
 * The site-wide response headers from vercel.json (CSP and friends), so `vite preview` behaves
 * like production and CSP problems show up locally.
 */
function productionHeaders(): Record<string, string> {
  const siteWide =
    readVercelConfig().headers.find((rule) => rule.source === '/(.*)')?.headers ?? [];
  return Object.fromEntries(
    siteWide
      // HSTS and upgrade-insecure-requests only make sense over HTTPS.
      .filter((header) => header.key !== 'Strict-Transport-Security')
      .map((header) => [header.key, header.value.replace(/;\s*upgrade-insecure-requests/, '')]),
  );
}

/**
 * Production builds get VITE_API_WAKE_URL: the API's health address on Render, from the /api
 * rewrite in vercel.json. A sleeping Render instance ignores requests forwarded by Vercel, so the
 * client knocks there directly to wake it (src/lib/api/wake.ts). The CSP must allow it.
 */
function apiWakeUrl(): Plugin {
  return {
    name: 'api-wake-url',
    config(_config, { command }) {
      if (command !== 'build' || process.env.VITE_API_WAKE_URL !== undefined) return;
      const config = readVercelConfig();
      const rewrite = config.rewrites.find((rule) => rule.source === '/api/:path*');
      if (!rewrite) throw new Error('vercel.json has no /api/:path* rewrite');
      const { origin } = new URL(rewrite.destination);
      const csp = config.headers
        .flatMap((rule) => rule.headers)
        .find((header) => header.key === 'Content-Security-Policy')?.value;
      const connectSrc = csp?.split(';').find((part) => part.trim().startsWith('connect-src'));
      if (!connectSrc?.split(/\s+/).includes(origin)) {
        throw new Error(`vercel.json: the CSP's connect-src must include ${origin}`);
      }
      process.env.VITE_API_WAKE_URL = `${origin}/api/health`;
    },
  };
}

/**
 * `vite preview` routes like Vercel does in production: the prerendered `<page>/index.html` for a
 * public page (scripts/postbuild-seo.ts), and `spa.html` for every other address (vercel.json).
 */
function productionRouting(): Plugin {
  return {
    name: 'production-routing',
    configurePreviewServer(server) {
      const outDir = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, _res, next) => {
        const [path = '/', query] = (req.url ?? '/').split('?');
        const isPage =
          req.method === 'GET' &&
          !path.startsWith('/api/') &&
          !path.startsWith('/assets/') &&
          extname(path) === '';
        if (isPage) {
          const page = posix.join(path, 'index.html');
          const target = existsSync(join(outDir, page)) ? page : '/spa.html';
          req.url = query === undefined ? target : `${target}?${query}`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), productionRouting(), apiWakeUrl()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: API_DEV_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 4173,
    headers: productionHeaders(),
  },
  build: {
    target: 'es2022',
    // Every current browser supports <link rel="modulepreload"> (Safari since 17). Older ones
    // ignore the hints and fetch the same files a moment later; the polyfill would cost every
    // visitor 0.5 KiB of the JS budget (plan §16).
    modulePreload: { polyfill: false },
    // Read by scripts/check-bundle.ts (the JS budget), which then deletes it.
    manifest: true,
    rolldownOptions: {
      output: {
        // Zod and the shared schemas as one chunk: every public page preloads them for response
        // validation, and one file compresses better than many small ones. The Zod-free part gets
        // its own chunk at a higher priority; otherwise it would be pulled into "schemas" as a
        // dependency, and the entry (which uses the constants) would load Zod up front.
        codeSplitting: {
          groups: [
            { name: 'shared-lite', test: SHARED_LITE, priority: 2 },
            { name: 'schemas', test: SCHEMAS, priority: 1 },
            { name: 'core', test: CORE, priority: 0 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: { VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud', VITE_SITE_URL: 'https://example.test' },
    // Stylesheets are skipped in tests, except raw imports (the token contrast test reads index.css).
    css: { include: [/\.css\?raw$/] },
  },
});

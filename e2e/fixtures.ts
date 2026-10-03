import { randomBytes } from 'node:crypto';

import { AxeBuilder } from '@axe-core/playwright';
import { test as base, expect, type Page, type Route } from '@playwright/test';

import { E2E_ADMIN } from './config.js';

// Nothing in the suite reaches the internet: Cloudinary, YouTube and their thumbnails are served
// by the routes below (plan §19).

/** A 2×2 dark PNG, enough for every <img>. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGPQVpTQVpRggFAAC0oBkZMlVwoAAAAASUVORK5CYII=',
  'base64',
);

/** `seconds` of a quiet 440 Hz tone as 8 kHz, 8-bit mono WAV: real audio the player can play. */
function wav(seconds: number): Buffer {
  const rate = 8000;
  const samples = rate * seconds;
  const data = Buffer.alloc(samples);
  for (let i = 0; i < samples; i++) {
    data[i] = 128 + Math.round(4 * Math.sin((2 * Math.PI * 440 * i) / rate));
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples, 40);
  return Buffer.concat([header, data]);
}

const AUDIO = wav(120);

async function serveMedia(route: Route): Promise<void> {
  const url = route.request().url();
  if (/\/video\/.*\.mp3$/.test(url)) {
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: AUDIO });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
}

/** Cloudinary's upload API: answers with a new asset in the folder the signed params name. */
async function serveUpload(route: Route): Promise<void> {
  const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
  const folder = /name="(?:asset_folder|folder)"\r\n\r\n([^\r\n]+)/.exec(body)?.[1];
  const resourceType = route.request().url().includes('/video/upload') ? 'video' : 'image';
  if (!folder) {
    await route.fulfill({ status: 400, json: { error: { message: 'No folder in the upload' } } });
    return;
  }
  await route.fulfill({
    status: 200,
    json: {
      public_id: `${folder}/e2e-${randomBytes(6).toString('hex')}`,
      resource_type: resourceType,
    },
  });
}

export const test = base.extend<{ stubbedNetwork: undefined }>({
  stubbedNetwork: [
    async ({ page }, use) => {
      await page.route('https://res.cloudinary.com/**', serveMedia);
      await page.route('https://i.ytimg.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
      );
      await page.route('https://api.cloudinary.com/**', serveUpload);
      await page.route('https://www.youtube-nocookie.com/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>Video</title><p>Video player</p>',
        }),
      );
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };

/** Signs in through the login form and waits for the dashboard. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Password').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Signing in hashes the password on purpose (argon2) and then loads the admin: allow for slow
  // browsers such as WebKit on Windows.
  await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible({ timeout: 15_000 });
}

/** axe-core scan (WCAG 2.x A/AA): no serious or critical violations (plan §18). */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );
  expect(serious).toEqual([]);
}

/** A unique suffix, so items created by one test never collide with another's. */
export function unique(label: string): string {
  return `${label} ${randomBytes(3).toString('hex')}`;
}

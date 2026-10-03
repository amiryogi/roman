import { z } from 'zod';

import { E2E_ADMIN } from './config.js';
import { expect, signIn, test, unique } from './fixtures.js';

// Each admin flow spans several pages, uploads and saves.
test.describe.configure({ timeout: 60_000 });

// Admin flows (plan §19), desktop browsers only. Every test signs in afresh: the refresh cookie
// rotates on use, so sessions are never shared between tests.

/** A tiny but real WAV file, named like an upload the site accepts. */
function audioFile() {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + 800, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36);
  header.writeUInt32LE(800, 40);
  return {
    name: 'take.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.concat([header, Buffer.alloc(800, 128)]),
  };
}

/** A list's delete button ("Delete" plus the item's name, read only by screen readers). */
function deleteButton(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^Delete\\s*: ${escaped}$`);
}

const PHOTO = {
  name: 'rehearsal.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGPQVpTQVpRggFAAC0oBkZMlVwoAAAAASUVORK5CYII=',
    'base64',
  ),
};

test('signs in, stays signed in across a reload, and signs out', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText(`Signed in as ${E2E_ADMIN.name}`)).toBeVisible();

  // The access token lives in memory only; the reload restores it from the refresh cookie.
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/admin/tracks');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('a track: upload, publish, show on the site, edit, delete', async ({ page }) => {
  const title = unique('Recital Take');
  await signIn(page);
  await page.goto('/admin/tracks/new');

  await page.getByLabel('Audio file (required)').setInputFiles(audioFile());
  await expect(page.locator('audio[controls]')).toBeAttached({ timeout: 15_000 });
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Status').selectOption('published');
  await page.getByRole('button', { name: 'Save track' }).click();
  await expect(page).toHaveURL(/\/admin\/tracks$/);

  await page.goto('/music');
  await expect(page.getByText(title).first()).toBeVisible();

  const renamed = `${title} (edited)`;
  await page.goto('/admin/tracks');
  await page.getByRole('link', { name: title, exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(renamed);
  await page.getByRole('button', { name: 'Save track' }).click();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toBeVisible();

  await page.getByRole('button', { name: deleteButton(renamed) }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete track' }).click();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toHaveCount(0);
  await page.goto('/music');
  await expect(page.getByText(renamed)).toHaveCount(0);
});

test('an event: publish it, see it listed, then remove it', async ({ page }) => {
  const title = unique('Winter Concert');
  const startsLocal = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  await signIn(page);
  await page.goto('/admin/events/new');

  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Starts').fill(startsLocal);
  await page.getByLabel('Venue name').fill('Test Hall');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page).toHaveURL(/\/admin\/events$/);

  await page.goto('/events');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.goto('/admin/events');
  await page.getByRole('button', { name: deleteButton(title) }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete event' }).click();
  await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
});

test('photos: bulk upload with alt text, publish, show in the gallery, delete', async ({
  page,
}) => {
  const alt = unique('Rehearsal in the hall');
  await signIn(page);
  await page.goto('/admin/gallery/upload');

  await page.getByLabel('Publish when saved (otherwise drafts)').check();
  await page.getByLabel(/Choose photos/).setInputFiles(PHOTO);
  const description = page.getByLabel('Description (alt text, required)');
  await expect(description).toBeEnabled({ timeout: 15_000 });
  await description.fill(alt);
  await page.getByRole('button', { name: /^Save all ready photos/ }).click();
  await expect(page.getByText('Saved and published.')).toBeVisible();

  await page.goto('/gallery');
  await expect(page.getByRole('img', { name: alt })).toBeVisible();

  await page.goto('/admin/gallery');
  await page.getByRole('button', { name: deleteButton(alt) }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete photo' }).click();
  await expect(page.getByRole('button', { name: deleteButton(alt) })).toHaveCount(0);
});

test('an inquiry is marked read when opened, and its status can change', async ({
  page,
  request,
}) => {
  const name = unique('Booking Guest');
  const token = await request.get('/api/inquiries/form-token');
  const { data } = z.object({ data: z.object({ token: z.string() }) }).parse(await token.json());
  await new Promise((resolve) => setTimeout(resolve, 3_200));
  const sent = await request.post('/api/inquiries', {
    headers: { 'X-Requested-With': 'fetch' },
    data: {
      name,
      email: 'guest@example.com',
      inquiryType: 'lessons',
      message: 'Could we arrange weekly violin lessons?',
      formToken: data.token,
    },
  });
  expect(sent.status()).toBe(201);

  await signIn(page);
  await page.goto('/admin/inquiries');
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Message from ${name}` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Read', pressed: true })).toBeVisible();

  await page.getByRole('button', { name: 'Replied' }).click();
  await expect(page.getByRole('button', { name: 'Replied', pressed: true })).toBeVisible();
});

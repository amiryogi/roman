import type { Page } from '@playwright/test';

import { SEEDED } from './config.js';
import { expect, test } from './fixtures.js';

/** Follows a main-navigation link: the full bar on wide screens, the menu dialog on phones. */
async function navigate(page: Page, name: string): Promise<void> {
  const bar = page.getByRole('navigation', { name: 'Main' });
  if (await bar.isVisible()) {
    await bar.getByRole('link', { name, exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name, exact: true }).click();
}

/** Seconds played, read from the seek slider's spoken value ("1 minute 5 seconds of …"). */
async function secondsPlayed(page: Page): Promise<number> {
  const text =
    (await page.getByRole('slider', { name: 'Seek' }).first().getAttribute('aria-valuetext')) ?? '';
  const position = text.split(' of ')[0] ?? '';
  const minutes = /(\d+) minutes?/.exec(position)?.[1];
  const seconds = /(\d+) seconds?/.exec(position)?.[1];
  return Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

test('every public page opens from the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: SEEDED.artist })).toBeVisible();

  for (const [link, heading] of [
    ['About', 'About'],
    ['Music', 'Music'],
    ['Videos', 'Videos'],
    ['Gallery', 'Gallery'],
    ['Performances', 'Performances'],
    ['Contact', 'Contact'],
  ] as const) {
    await navigate(page, link);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('music keeps playing while the visitor moves between pages', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit' && process.platform === 'win32',
    "Playwright's WebKit build for Windows can't play media; Linux (CI) can.",
  );
  await page.goto('/music');
  const [track] = SEEDED.tracks;
  await page
    .getByRole('button', { name: `Play ${track}` })
    .first()
    .click();
  const pause = page.getByRole('region', { name: 'Audio player' }).getByRole('button', {
    name: `Pause ${track}`,
  });
  await expect(pause).toBeVisible();

  await navigate(page, 'About');
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  await expect(pause).toBeVisible();

  // Phones show a compact bar; the seek slider lives in the full player.
  const seek = page.getByRole('slider', { name: 'Seek' });
  if ((await seek.count()) === 0) {
    await page.getByRole('button', { name: /open the player/ }).click();
  }
  await expect.poll(() => secondsPlayed(page), { timeout: 10_000 }).toBeGreaterThan(0);
  const before = await secondsPlayed(page);
  await expect.poll(() => secondsPlayed(page), { timeout: 10_000 }).toBeGreaterThan(before);
});

test('a video opens in a player dialog, without loading YouTube before the click', async ({
  page,
}) => {
  const youtube: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('youtube-nocookie.com')) youtube.push(request.url());
  });
  await page.goto('/videos');
  const [title] = SEEDED.videos;
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  expect(youtube).toEqual([]);

  await page.getByRole('button', { name: `Play video: ${title}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('iframe[src*="youtube-nocookie.com"]')).toBeAttached();
  await dialog.getByRole('button', { name: 'Close video' }).click();
  await expect(dialog).toBeHidden();
});

test('the gallery filters by category and opens a keyboard-driven viewer', async ({ page }) => {
  await page.goto('/gallery');
  const photos = page.getByRole('main').getByRole('img');
  await expect(page.getByRole('img', { name: SEEDED.photos.performance })).toBeVisible();
  await expect(page.getByRole('img', { name: SEEDED.photos.draft })).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Photo categories' })
    .getByRole('link', { name: 'Portraits' })
    .click();
  await expect(page).toHaveURL(/category=portrait/);
  await expect(page.getByRole('img', { name: SEEDED.photos.portrait })).toBeVisible();
  await expect(page.getByRole('img', { name: SEEDED.photos.performance })).toHaveCount(0);
  await expect(photos).toHaveCount(1);

  await page
    .getByRole('navigation', { name: 'Photo categories' })
    .getByRole('link', { name: 'All' })
    .click();
  await page.getByRole('button', { name: new RegExp(SEEDED.photos.performance) }).click();
  const next = page.getByRole('button', { name: 'Next photo' });
  await expect(next).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(next).toBeHidden();
});

test('the booking form explains its errors, then sends', async ({ page }) => {
  await page.goto('/contact');
  const send = page.getByRole('button', { name: 'Send enquiry' });
  await send.click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel(/Your name/)).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel(/Your name/).fill('Test Visitor');
  await page.getByLabel(/^Email/).fill('visitor@example.com');
  await page.getByLabel(/Type of event/).selectOption('wedding');
  await page.getByLabel(/^Message/).fill('We would like live violin at our wedding.');
  // The server refuses forms sent within 3 seconds of opening them (spam protection).
  await page.waitForTimeout(3_200);
  await send.click();
  await expect(page.getByText('Your message has been sent.')).toBeVisible();
});

test('drafts never reach visitors', async ({ page }) => {
  await page.goto('/music');
  await expect(page.getByText(SEEDED.tracks[0]).first()).toBeVisible();
  await expect(page.getByText(SEEDED.draftTrack)).toHaveCount(0);

  await page.goto('/events');
  await expect(page.getByRole('heading', { name: SEEDED.upcomingEvent })).toBeVisible();
  await expect(page.getByText(SEEDED.draftEvent)).toHaveCount(0);
});

test('unknown addresses show the 404 page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);
});

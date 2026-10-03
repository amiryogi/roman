import { expect, expectAccessible, test } from './fixtures.js';

// axe on every public page (plan §18, §19), after its content has loaded. Reduced motion makes
// sections appear at once: mid-fade, partly transparent text would fail the contrast check falsely.
test.use({ reducedMotion: 'reduce' });
const PAGES = [
  '/',
  '/about',
  '/music',
  '/videos',
  '/gallery',
  '/events',
  '/contact',
  '/no-such-page',
];

for (const path of PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Wait for data-driven content and skeletons to settle.
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
    await expectAccessible(page);
  });
}

test('the admin sign-in page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
  await expectAccessible(page);
});

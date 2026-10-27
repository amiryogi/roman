import { readFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

const OUT =
  'C:/Users/User/AppData/Local/Temp/claude/d--Roman/cb29aa3a-8a07-4728-8508-04ef9595e993/scratchpad';
const photo = readFileSync('romanhero.JPG');

const PROBE = `(() => {
  const img = document.querySelector('.hero-photo');
  const words = Array.from(document.querySelectorAll('.hero-word > span')).map(function (w) { return getComputedStyle(w).transform; });
  const rise = Array.from(document.querySelectorAll('.hero-rise')).map(function (r) { return Number(getComputedStyle(r).opacity).toFixed(2); });
  const section = document.querySelector('[data-hero]');
  return (section ? section.getAttribute('data-hero') : '-') + ' img=' + (img ? getComputedStyle(img).transform : '-') + ' rise=' + rise.join(',') + ' word0=' + (words[0] || '-') + ' wordLast=' + (words[words.length - 1] || '-');
})()`;

const browser = await chromium.launch({ channel: 'msedge' });
for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  const page = await browser.newPage({ viewport: { width, height } });
  // A slow photo, to check that the text waits for it.
  await page.route('https://res.cloudinary.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({ body: photo, contentType: 'image/jpeg' });
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-hero]');
  const start = Date.now();
  for (const at of [100, 600, 1000, 1400, 2000, 3000, 4500]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - start)));
    console.log(`${String(width)} +${String(at)}ms ${String(await page.evaluate(PROBE))}`);
    if (width === 1440 && [1000, 1400, 4500].includes(at)) {
      await page.screenshot({ path: `${OUT}/r6-hero-${String(at)}.png` });
    }
  }
  await page.screenshot({ path: `${OUT}/r6-hero-final-${String(width)}.png` });
  await page.close();
}
await browser.close();

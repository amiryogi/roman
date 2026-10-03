import { describe, expect, it } from 'vitest';

import css from './index.css?raw';

// The colour tokens are read from the stylesheet itself, so this test fails if a token changes
// to a value that breaks contrast (plan §7.2, §18).

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!match?.[1]) throw new Error(`Token --color-${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(token(foreground)), luminance(token(background))].sort(
    (a, b) => b - a,
  );
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

describe('colour tokens', () => {
  // Body text, links and form text: 4.5:1 (WCAG 1.4.3).
  it.each([
    ['ink', 'ivory'],
    ['ink', 'rosin'],
    ['ink-muted', 'ivory'],
    ['ink-muted', 'rosin'],
    ['varnish-deep', 'ivory'],
    ['varnish-deep', 'rosin'],
    ['ivory', 'ebony'],
    ['ivory', 'ebony-raised'],
    ['mist', 'ebony'],
    ['mist', 'ebony-raised'],
    ['varnish', 'ebony'],
    ['varnish', 'ebony-raised'],
    ['ebony', 'varnish'],
    ['ivory', 'varnish-deep'],
    ['danger', 'ivory'],
  ])('%s on %s meets 4.5:1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  // Focus rings and large display text: 3:1 (WCAG 1.4.11, 1.4.3 large text).
  it.each([
    ['varnish', 'ivory'],
    ['varnish-deep', 'ivory'],
  ])('%s on %s meets 3:1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});

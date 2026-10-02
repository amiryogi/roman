import { describe, expect, it } from 'vitest';

import { SLUG_PATTERN, slugify } from './slug.js';

describe('slugify', () => {
  it.each([
    ['Annapurna Orchestra — Live', 'annapurna-orchestra-live'],
    ['  Fête de la Musique 2008 ', 'fete-de-la-musique-2008'],
    ['Already-a-slug', 'already-a-slug'],
    ['Multiple   spaces & symbols!!', 'multiple-spaces-symbols'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(slugify(input)).toMatch(SLUG_PATTERN);
  });

  it('returns an empty string when nothing Latin remains', () => {
    expect(slugify('नमस्ते')).toBe('');
  });

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

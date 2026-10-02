import { describe, expect, it } from 'vitest';

import { fromIsoDate, toIsoDate } from './dates.js';
import { paginationMeta, skipFor } from './pagination.js';
import { generateUniqueSlug } from './slug.js';

describe('generateUniqueSlug', () => {
  const takenIn = (taken: string[]) => (slug: string) => Promise.resolve(taken.includes(slug));

  it('uses the plain slug when it is free', async () => {
    expect(await generateUniqueSlug('Live in Kathmandu', takenIn([]))).toBe('live-in-kathmandu');
  });

  it('appends the next free number on collision', async () => {
    const isTaken = takenIn(['live', 'live-2']);
    expect(await generateUniqueSlug('Live', isTaken)).toBe('live-3');
  });

  it('falls back when the title has no Latin characters', async () => {
    expect(await generateUniqueSlug('संगीत', takenIn([]), 'track')).toBe('track');
  });
});

describe('pagination', () => {
  it('computes skip and meta', () => {
    expect(skipFor(3, 12)).toBe(24);
    expect(paginationMeta(1, 12, 25)).toEqual({ page: 1, limit: 12, total: 25, totalPages: 3 });
    expect(paginationMeta(1, 12, 0).totalPages).toBe(0);
  });
});

describe('calendar dates', () => {
  it('round-trips YYYY-MM-DD through UTC midnight', () => {
    expect(toIsoDate(fromIsoDate('2026-10-02'))).toBe('2026-10-02');
  });
});

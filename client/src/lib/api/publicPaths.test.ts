import { describe, expect, it } from 'vitest';

import { publicPaths } from './publicPaths';

// The build preloads these exact URLs; a preload is only used when the real request matches it.
describe('public API paths', () => {
  it('builds the same URLs the pages request', () => {
    expect(publicPaths.tracks(1)).toBe('/tracks?page=1&limit=50');
    expect(publicPaths.videos(1)).toBe('/videos?page=1&limit=12');
    expect(publicPaths.videos(2, 'studio')).toBe('/videos?page=2&limit=12&category=studio');
    expect(publicPaths.gallery(1)).toBe('/gallery?page=1&limit=24');
    expect(publicPaths.events(1, 'upcoming')).toBe('/events?page=1&limit=10&when=upcoming');
    expect(publicPaths.album('a b')).toBe('/albums/a%20b');
  });
});

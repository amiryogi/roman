import type { EventTimeframe, GalleryCategory, VideoCategory } from '@roman/shared';

// Paths of the public API requests (relative to the API base), shared by lib/api/public.ts and the
// build-time prerender, which preloads each page's first request (scripts/postbuild-seo.ts). A
// preload is only used when its URL matches the real request exactly. No app imports: this module
// also runs in Node.

export const TRACKS_PAGE_SIZE = 50;
export const VIDEOS_PAGE_SIZE = 12;
export const GALLERY_PAGE_SIZE = 24;
export const EVENTS_PAGE_SIZE = 10;

function pageQuery(page: number, limit: number, category?: string): string {
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) search.set('category', category);
  return search.toString();
}

export const publicPaths = {
  home: () => '/home',
  profile: () => '/profile',
  tracks: (page: number) => `/tracks?${pageQuery(page, TRACKS_PAGE_SIZE)}`,
  albums: () => '/albums?limit=50',
  album: (slug: string) => `/albums/${encodeURIComponent(slug)}`,
  videos: (page: number, category?: VideoCategory) =>
    `/videos?${pageQuery(page, VIDEOS_PAGE_SIZE, category)}`,
  gallery: (page: number, category?: GalleryCategory) =>
    `/gallery?${pageQuery(page, GALLERY_PAGE_SIZE, category)}`,
  events: (page: number, when: EventTimeframe) =>
    `/events?${new URLSearchParams({ page: String(page), limit: String(EVENTS_PAGE_SIZE), when }).toString()}`,
  inquiryFormToken: () => '/inquiries/form-token',
  inquiries: () => '/inquiries',
};

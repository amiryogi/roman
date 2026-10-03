import {
  albumDetailDtoSchema,
  albumDtoSchema,
  eventDtoSchema,
  galleryImageDtoSchema,
  homeDtoSchema,
  inquiryFormTokenDtoSchema,
  inquiryReceiptDtoSchema,
  profileDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
  type AlbumDetailDto,
  type AlbumDto,
  type EventDto,
  type EventTimeframe,
  type GalleryCategory,
  type GalleryImageDto,
  type HomeDto,
  type InquiryCreateInput,
  type InquiryReceiptDto,
  type Paginated,
  type ProfileDto,
  type TrackDto,
  type VideoCategory,
  type VideoDto,
} from '@roman/shared';

import { apiRequest, apiRequestPage } from './client';

/** Typed query keys, so cache entries are shared and invalidated consistently. */
export const queryKeys = {
  home: ['home'] as const,
  profile: ['profile'] as const,
  tracks: ['tracks'] as const,
  albums: ['albums'] as const,
  album: (slug: string) => ['albums', slug] as const,
  videos: (category?: VideoCategory) => ['videos', category ?? 'all'] as const,
  gallery: (category?: GalleryCategory) => ['gallery', category ?? 'all'] as const,
  events: (when: EventTimeframe) => ['events', when] as const,
};

export const TRACKS_PAGE_SIZE = 50;
export const VIDEOS_PAGE_SIZE = 12;
export const GALLERY_PAGE_SIZE = 24;

function pageQuery(page: number, limit: number, category?: string): string {
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) search.set('category', category);
  return search.toString();
}

export function getHome(): Promise<HomeDto> {
  return apiRequest('/home', homeDtoSchema);
}

export function getProfile(): Promise<ProfileDto> {
  return apiRequest('/profile', profileDtoSchema);
}

/** Published tracks, featured first. */
export function getTracks(page: number): Promise<Paginated<TrackDto>> {
  return apiRequestPage(
    `/tracks?page=${String(page)}&limit=${String(TRACKS_PAGE_SIZE)}`,
    trackDtoSchema,
  );
}

/** Published albums (rarely more than a few, so one page). */
export function getAlbums(): Promise<Paginated<AlbumDto>> {
  return apiRequestPage('/albums?limit=50', albumDtoSchema);
}

export function getAlbum(slug: string): Promise<AlbumDetailDto> {
  return apiRequest(`/albums/${encodeURIComponent(slug)}`, albumDetailDtoSchema);
}

/** Published videos, optionally one category. */
export function getVideos(page: number, category?: VideoCategory): Promise<Paginated<VideoDto>> {
  return apiRequestPage(`/videos?${pageQuery(page, VIDEOS_PAGE_SIZE, category)}`, videoDtoSchema);
}

/** Published gallery photos, optionally one category. */
export function getGallery(
  page: number,
  category?: GalleryCategory,
): Promise<Paginated<GalleryImageDto>> {
  return apiRequestPage(
    `/gallery?${pageQuery(page, GALLERY_PAGE_SIZE, category)}`,
    galleryImageDtoSchema,
  );
}

export const EVENTS_PAGE_SIZE = 10;

/** Published events; upcoming soonest first, past most recent first. */
export function getEvents(page: number, when: EventTimeframe): Promise<Paginated<EventDto>> {
  const search = new URLSearchParams({
    page: String(page),
    limit: String(EVENTS_PAGE_SIZE),
    when,
  });
  return apiRequestPage(`/events?${search.toString()}`, eventDtoSchema);
}

/** A signed timestamp for the contact form (minimum fill time, plan §15). */
export async function getInquiryFormToken(): Promise<string> {
  const { token } = await apiRequest('/inquiries/form-token', inquiryFormTokenDtoSchema);
  return token;
}

export function sendInquiry(input: InquiryCreateInput): Promise<InquiryReceiptDto> {
  return apiRequest('/inquiries', inquiryReceiptDtoSchema, { method: 'POST', body: input });
}

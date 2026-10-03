import type {
  AlbumDetailDto,
  AlbumDto,
  EventDto,
  EventTimeframe,
  GalleryCategory,
  GalleryImageDto,
  HomeDto,
  InquiryCreateInput,
  InquiryReceiptDto,
  Paginated,
  ProfileDto,
  TrackDto,
  VideoCategory,
  VideoDto,
} from '@roman/shared';

import { apiRequest, apiRequestPage } from './client';
import { publicPaths } from './publicPaths';

export {
  EVENTS_PAGE_SIZE,
  GALLERY_PAGE_SIZE,
  TRACKS_PAGE_SIZE,
  VIDEOS_PAGE_SIZE,
} from './publicPaths';

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

export function getHome(): Promise<HomeDto> {
  return apiRequest(publicPaths.home(), (s) => s.homeDtoSchema);
}

export function getProfile(): Promise<ProfileDto> {
  return apiRequest(publicPaths.profile(), (s) => s.profileDtoSchema);
}

/** Published tracks, featured first. */
export function getTracks(page: number): Promise<Paginated<TrackDto>> {
  return apiRequestPage(publicPaths.tracks(page), (s) => s.trackDtoSchema);
}

/** Published albums (rarely more than a few, so one page). */
export function getAlbums(): Promise<Paginated<AlbumDto>> {
  return apiRequestPage(publicPaths.albums(), (s) => s.albumDtoSchema);
}

export function getAlbum(slug: string): Promise<AlbumDetailDto> {
  return apiRequest(publicPaths.album(slug), (s) => s.albumDetailDtoSchema);
}

/** Published videos, optionally one category. */
export function getVideos(page: number, category?: VideoCategory): Promise<Paginated<VideoDto>> {
  return apiRequestPage(publicPaths.videos(page, category), (s) => s.videoDtoSchema);
}

/** Published gallery photos, optionally one category. */
export function getGallery(
  page: number,
  category?: GalleryCategory,
): Promise<Paginated<GalleryImageDto>> {
  return apiRequestPage(publicPaths.gallery(page, category), (s) => s.galleryImageDtoSchema);
}

/** Published events; upcoming soonest first, past most recent first. */
export function getEvents(page: number, when: EventTimeframe): Promise<Paginated<EventDto>> {
  return apiRequestPage(publicPaths.events(page, when), (s) => s.eventDtoSchema);
}

/** A signed timestamp for the contact form (minimum fill time, plan §15). */
export async function getInquiryFormToken(): Promise<string> {
  const { token } = await apiRequest(
    publicPaths.inquiryFormToken(),
    (s) => s.inquiryFormTokenDtoSchema,
  );
  return token;
}

export function sendInquiry(input: InquiryCreateInput): Promise<InquiryReceiptDto> {
  return apiRequest(publicPaths.inquiries(), (s) => s.inquiryReceiptDtoSchema, {
    method: 'POST',
    body: input,
  });
}

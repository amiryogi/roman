import {
  albumDetailDtoSchema,
  albumDtoSchema,
  homeDtoSchema,
  profileDtoSchema,
  trackDtoSchema,
  type AlbumDetailDto,
  type AlbumDto,
  type HomeDto,
  type Paginated,
  type ProfileDto,
  type TrackDto,
} from '@roman/shared';

import { apiRequest, apiRequestPage } from './client';

/** Typed query keys, so cache entries are shared and invalidated consistently. */
export const queryKeys = {
  home: ['home'] as const,
  profile: ['profile'] as const,
  tracks: ['tracks'] as const,
  albums: ['albums'] as const,
  album: (slug: string) => ['albums', slug] as const,
};

export const TRACKS_PAGE_SIZE = 50;

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

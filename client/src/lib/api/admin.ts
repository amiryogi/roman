import {
  albumDtoSchema,
  trackDtoSchema,
  type AlbumCreateInput,
  type AlbumDto,
  type AlbumUpdateInput,
  type Paginated,
  type PublicationStatus,
  type TrackCreateInput,
  type TrackDto,
  type TrackUpdateInput,
} from '@roman/shared';

import { apiRequest, apiRequestNoContent, apiRequestPage } from './client';

/** Admin lists show everything on one page in practice; reordering works within a page. */
export const ADMIN_PAGE_SIZE = 50;

export interface AdminListParams {
  page: number;
  status?: PublicationStatus;
  q?: string;
}

/** Every admin query key starts with "admin", which has no client-side caching (plan §12.3). */
export const adminKeys = {
  all: ['admin'] as const,
  tracks: ['admin', 'tracks'] as const,
  trackList: (params: AdminListParams) => ['admin', 'tracks', 'list', params] as const,
  track: (id: string) => ['admin', 'tracks', id] as const,
  albums: ['admin', 'albums'] as const,
  albumList: (params: AdminListParams) => ['admin', 'albums', 'list', params] as const,
  album: (id: string) => ['admin', 'albums', id] as const,
};

function listQuery(params: AdminListParams): string {
  const search = new URLSearchParams({ page: String(params.page), limit: String(ADMIN_PAGE_SIZE) });
  if (params.status) search.set('status', params.status);
  if (params.q) search.set('q', params.q);
  return search.toString();
}

const auth = { auth: true } as const;

// --- Tracks ---------------------------------------------------------------------------------

export function listTracks(params: AdminListParams): Promise<Paginated<TrackDto>> {
  return apiRequestPage(`/admin/tracks?${listQuery(params)}`, trackDtoSchema, auth);
}

export function getTrack(id: string): Promise<TrackDto> {
  return apiRequest(`/admin/tracks/${id}`, trackDtoSchema, auth);
}

export function createTrack(input: TrackCreateInput): Promise<TrackDto> {
  return apiRequest('/admin/tracks', trackDtoSchema, { ...auth, method: 'POST', body: input });
}

export function updateTrack(id: string, input: TrackUpdateInput): Promise<TrackDto> {
  return apiRequest(`/admin/tracks/${id}`, trackDtoSchema, {
    ...auth,
    method: 'PATCH',
    body: input,
  });
}

export function deleteTrack(id: string): Promise<void> {
  return apiRequestNoContent(`/admin/tracks/${id}`, { ...auth, method: 'DELETE' });
}

export function reorderTracks(ids: string[]): Promise<void> {
  return apiRequestNoContent('/admin/tracks/order', { ...auth, method: 'PATCH', body: { ids } });
}

// --- Albums ---------------------------------------------------------------------------------

export function listAlbums(params: AdminListParams): Promise<Paginated<AlbumDto>> {
  return apiRequestPage(`/admin/albums?${listQuery(params)}`, albumDtoSchema, auth);
}

export function getAlbum(id: string): Promise<AlbumDto> {
  return apiRequest(`/admin/albums/${id}`, albumDtoSchema, auth);
}

export function createAlbum(input: AlbumCreateInput): Promise<AlbumDto> {
  return apiRequest('/admin/albums', albumDtoSchema, { ...auth, method: 'POST', body: input });
}

export function updateAlbum(id: string, input: AlbumUpdateInput): Promise<AlbumDto> {
  return apiRequest(`/admin/albums/${id}`, albumDtoSchema, {
    ...auth,
    method: 'PATCH',
    body: input,
  });
}

/** 409 ALBUM_NOT_EMPTY unless `detachTracks` is set. */
export function deleteAlbum(id: string, detachTracks = false): Promise<void> {
  return apiRequestNoContent(`/admin/albums/${id}${detachTracks ? '?detachTracks=true' : ''}`, {
    ...auth,
    method: 'DELETE',
  });
}

export function reorderAlbums(ids: string[]): Promise<void> {
  return apiRequestNoContent('/admin/albums/order', { ...auth, method: 'PATCH', body: { ids } });
}

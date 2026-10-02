import { homeDtoSchema, profileDtoSchema, type HomeDto, type ProfileDto } from '@roman/shared';

import { apiRequest } from './client';

/** Typed query keys, so cache entries are shared and invalidated consistently. */
export const queryKeys = {
  home: ['home'] as const,
  profile: ['profile'] as const,
};

export function getHome(): Promise<HomeDto> {
  return apiRequest('/home', homeDtoSchema);
}

export function getProfile(): Promise<ProfileDto> {
  return apiRequest('/profile', profileDtoSchema);
}

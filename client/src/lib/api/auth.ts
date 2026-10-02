import {
  adminDtoSchema,
  authResponseDtoSchema,
  type AdminDto,
  type AuthResponseDto,
  type ChangePasswordInput,
  type LoginInput,
} from '@roman/shared';

import { apiRequest, apiRequestNoContent, refreshSession, setAccessToken } from './client';

export async function login(input: LoginInput): Promise<AuthResponseDto> {
  const session = await apiRequest('/auth/login', authResponseDtoSchema, {
    method: 'POST',
    body: input,
  });
  setAccessToken(session.accessToken);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await apiRequestNoContent('/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export function getCurrentAdmin(): Promise<AdminDto> {
  return apiRequest('/auth/me', adminDtoSchema, { auth: true });
}

/** Changing the password invalidates the current access token, so a fresh one is fetched. */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiRequestNoContent('/auth/password', { method: 'PUT', body: input, auth: true });
  await refreshSession();
}

import { createContext, useContext } from 'react';

import type { AdminDto, LoginInput } from '@roman/shared';

export type AuthState =
  { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; admin: AdminDto };

export interface AuthContextValue {
  state: AuthState;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

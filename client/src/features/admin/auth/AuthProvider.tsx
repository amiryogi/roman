import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { LoginInput } from '@roman/shared';

import { login as apiLogin, logout as apiLogout } from '@/lib/api/auth';
import { onSessionExpired, refreshSession } from '@/lib/api/client';

import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext';

/**
 * Admin session state. On mount it tries to restore the session from the refresh cookie,
 * so a page reload keeps the admin signed in without storing tokens in the browser.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => {
        if (active) {
          setState(
            session ? { status: 'authenticated', admin: session.admin } : { status: 'anonymous' },
          );
        }
      })
      .catch(() => {
        if (active) setState({ status: 'anonymous' });
      });

    const unsubscribe = onSessionExpired(() => {
      setState({ status: 'anonymous' });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await apiLogin(input);
    setState({ status: 'authenticated', admin: session.admin });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

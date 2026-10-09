import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { PageSpinner } from '@/features/admin/components/PageSpinner';

import { useAuth } from './AuthContext';

/** Renders children only for a signed-in admin; otherwise redirects to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <PageSpinner label="Checking your session…" fullPage />;

  if (state.status === 'anonymous') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return children;
}

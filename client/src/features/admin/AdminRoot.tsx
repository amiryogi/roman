import { Outlet } from 'react-router';

import { AuthProvider } from './auth/AuthProvider';

/** Root of the lazily-loaded admin area: session state and no indexing. */
export function AdminRoot() {
  return (
    <AuthProvider>
      <meta name="robots" content="noindex, nofollow" />
      <Outlet />
    </AuthProvider>
  );
}

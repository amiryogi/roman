import { Outlet } from 'react-router';
import { Toaster } from 'sonner';

import { AuthProvider } from './auth/AuthProvider';

/** Root of the lazily-loaded admin area: session state and no indexing. */
export function AdminRoot() {
  return (
    <AuthProvider>
      <meta name="robots" content="noindex, nofollow" />
      <Outlet />
      {/* Toasts confirm saves; errors are also shown inline (plan §12.5). */}
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  );
}

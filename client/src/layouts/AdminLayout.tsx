import { NavLink, Outlet, useNavigate } from 'react-router';

import { useAuth } from '@/features/admin/auth/AuthContext';
import { RequireAuth } from '@/features/admin/auth/RequireAuth';

// Sections are added as their phases land (plan §25).
const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tracks', label: 'Tracks', end: false },
  { to: '/admin/albums', label: 'Albums', end: false },
  { to: '/admin/account', label: 'Account', end: false },
] as const;

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700';

function AdminShell() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const adminName = state.status === 'authenticated' ? state.admin.name : '';

  async function handleLogout() {
    await logout();
    await navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900 md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#admin-main"
        className={`sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-white focus:px-3 focus:py-2 ${focusRing}`}
      >
        Skip to content
      </a>

      <aside className="border-b border-stone-200 bg-white md:min-h-dvh md:border-r md:border-b-0">
        <div className="px-5 py-5">
          <p className="text-xs tracking-[0.3em] text-stone-500 uppercase">Roman Budhathoki</p>
          <p className="font-semibold">Admin</p>
        </div>
        <nav aria-label="Admin sections" className="px-3 pb-4">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'block rounded-sm px-3 py-2 text-sm whitespace-nowrap',
                      focusRing,
                      isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-stone-200 bg-white px-6 py-3 text-sm">
          <span className="text-stone-600">Signed in as {adminName}</span>
          <a href="/" className={`text-stone-700 underline-offset-4 hover:underline ${focusRing}`}>
            View site
          </a>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`rounded-sm border border-stone-300 px-3 py-1.5 hover:bg-stone-100 ${focusRing}`}
          >
            Sign out
          </button>
        </header>
        <main id="admin-main" tabIndex={-1} className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <RequireAuth>
      <AdminShell />
    </RequireAuth>
  );
}

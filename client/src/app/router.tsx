import { createBrowserRouter, type RouteObject } from 'react-router';

import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { RouteErrorPage } from '@/features/errors/RouteErrorPage';
import { HomePage } from '@/features/home/HomePage';
import { ComingSoonPage } from '@/features/placeholder/ComingSoonPage';
import { PublicLayout } from '@/layouts/PublicLayout';

// Sections built in later phases; each placeholder is replaced by its real page (plan §25).
const UPCOMING_SECTIONS = [
  { path: 'music', title: 'Music' },
  { path: 'videos', title: 'Videos' },
  { path: 'gallery', title: 'Gallery' },
  { path: 'events', title: 'Performances' },
  { path: 'contact', title: 'Contact & Booking' },
] as const;

// Home is in the main chunk for a fast first paint (LCP); other pages load on demand (plan §12.1).
const publicRoutes: RouteObject = {
  path: '/',
  Component: PublicLayout,
  errorElement: <RouteErrorPage />,
  children: [
    { index: true, Component: HomePage },
    {
      path: 'about',
      lazy: async () => ({ Component: (await import('@/features/about/AboutPage')).AboutPage }),
    },
    ...UPCOMING_SECTIONS.map(({ path, title }) => ({
      path,
      element: <ComingSoonPage title={title} path={`/${path}`} />,
    })),
    { path: '*', Component: NotFoundPage },
  ],
};

// The admin area is split into lazily loaded chunks so public visitors never download it (plan §16).
const adminRoutes: RouteObject = {
  path: '/admin',
  lazy: async () => ({ Component: (await import('@/features/admin/AdminRoot')).AdminRoot }),
  hydrateFallbackElement: <PageSpinner label="Loading…" />,
  errorElement: <RouteErrorPage />,
  children: [
    {
      path: 'login',
      lazy: async () => ({
        Component: (await import('@/features/admin/auth/LoginPage')).LoginPage,
      }),
    },
    {
      lazy: async () => ({ Component: (await import('@/layouts/AdminLayout')).AdminLayout }),
      children: [
        {
          index: true,
          lazy: async () => ({
            Component: (await import('@/features/admin/dashboard/DashboardPage')).DashboardPage,
          }),
        },
        {
          // Temporary (Phase 4): see MediaTestPage.
          path: 'media-test',
          lazy: async () => ({
            Component: (await import('@/features/admin/media-test/MediaTestPage')).MediaTestPage,
          }),
        },
        {
          path: 'account',
          lazy: async () => ({
            Component: (await import('@/features/admin/account/AccountPage')).AccountPage,
          }),
        },
        {
          // Unknown admin pages stay inside the admin layout (plan §22).
          path: '*',
          lazy: async () => ({
            Component: (await import('@/features/admin/AdminNotFoundPage')).AdminNotFoundPage,
          }),
        },
      ],
    },
  ],
};

export const routes: RouteObject[] = [publicRoutes, adminRoutes];

export const router = createBrowserRouter(routes);

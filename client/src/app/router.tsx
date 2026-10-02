import { createBrowserRouter, type RouteObject } from 'react-router';

import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { HomePage } from '@/features/home/HomePage';

// The admin area is split into lazily loaded chunks so public visitors never download it (plan §16).
const adminRoutes: RouteObject = {
  path: '/admin',
  lazy: async () => ({ Component: (await import('@/features/admin/AdminRoot')).AdminRoot }),
  hydrateFallbackElement: <PageSpinner label="Loading…" />,
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
          path: 'account',
          lazy: async () => ({
            Component: (await import('@/features/admin/account/AccountPage')).AccountPage,
          }),
        },
      ],
    },
  ],
};

export const routes: RouteObject[] = [
  { path: '/', Component: HomePage },
  adminRoutes,
  { path: '*', Component: NotFoundPage },
];

export const router = createBrowserRouter(routes);

import { createBrowserRouter, type RouteObject } from 'react-router';

import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { RouteErrorPage } from '@/features/errors/RouteErrorPage';
import { HomePage } from '@/features/home/HomePage';
import { PublicLayout } from '@/layouts/PublicLayout';

// Home is in the main chunk for a fast first paint (LCP); other pages load on demand (plan §12.1).
const publicRoutes: RouteObject = {
  path: '/',
  Component: PublicLayout,
  errorElement: <RouteErrorPage />,
  // Shown for a moment when a lazily loaded page is opened directly: the site's dark ground,
  // so nothing flashes.
  hydrateFallbackElement: <div role="status" aria-label="Loading" className="min-h-dvh bg-ebony" />,
  children: [
    { index: true, Component: HomePage },
    {
      path: 'about',
      lazy: async () => ({ Component: (await import('@/features/about/AboutPage')).AboutPage }),
    },
    {
      path: 'music',
      lazy: async () => ({ Component: (await import('@/features/music/MusicPage')).MusicPage }),
    },
    {
      path: 'videos',
      lazy: async () => ({ Component: (await import('@/features/videos/VideosPage')).VideosPage }),
    },
    {
      path: 'gallery',
      lazy: async () => ({
        Component: (await import('@/features/gallery/GalleryPage')).GalleryPage,
      }),
    },
    {
      path: 'events',
      lazy: async () => ({ Component: (await import('@/features/events/EventsPage')).EventsPage }),
    },
    {
      path: 'contact',
      lazy: async () => ({
        Component: (await import('@/features/contact/ContactPage')).ContactPage,
      }),
    },
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
          path: 'tracks',
          lazy: async () => ({
            Component: (await import('@/features/admin/tracks/TracksPage')).TracksPage,
          }),
        },
        {
          // "new" or an id
          path: 'tracks/:id',
          lazy: async () => ({
            Component: (await import('@/features/admin/tracks/TrackEditPage')).TrackEditPage,
          }),
        },
        {
          path: 'albums',
          lazy: async () => ({
            Component: (await import('@/features/admin/albums/AlbumsPage')).AlbumsPage,
          }),
        },
        {
          path: 'albums/:id',
          lazy: async () => ({
            Component: (await import('@/features/admin/albums/AlbumEditPage')).AlbumEditPage,
          }),
        },
        {
          path: 'videos',
          lazy: async () => ({
            Component: (await import('@/features/admin/videos/VideosPage')).VideosPage,
          }),
        },
        {
          path: 'videos/:id',
          lazy: async () => ({
            Component: (await import('@/features/admin/videos/VideoEditPage')).VideoEditPage,
          }),
        },
        {
          path: 'gallery',
          lazy: async () => ({
            Component: (await import('@/features/admin/gallery/GalleryAdminPage')).GalleryAdminPage,
          }),
        },
        {
          path: 'gallery/upload',
          lazy: async () => ({
            Component: (await import('@/features/admin/gallery/GalleryUploadPage'))
              .GalleryUploadPage,
          }),
        },
        {
          path: 'gallery/:id',
          lazy: async () => ({
            Component: (await import('@/features/admin/gallery/GalleryImageEditPage'))
              .GalleryImageEditPage,
          }),
        },
        {
          path: 'events',
          lazy: async () => ({
            Component: (await import('@/features/admin/events/EventsAdminPage')).EventsAdminPage,
          }),
        },
        {
          path: 'events/:id',
          lazy: async () => ({
            Component: (await import('@/features/admin/events/EventEditPage')).EventEditPage,
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

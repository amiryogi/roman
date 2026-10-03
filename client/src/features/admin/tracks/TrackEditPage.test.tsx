import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaAssetDto } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import type { MediaUploaderProps } from '@/features/admin/components/MediaUploader';
import { createTrack, listAlbums } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';
import { trackFixture } from '@/test/fixtures';

import { TrackEditPage } from './TrackEditPage';

const UPLOADED_AUDIO: MediaAssetDto = {
  publicId: 'root/music/audio/new',
  resourceType: 'video',
  version: 1,
  format: 'mp3',
  bytes: 1000,
  duration: 200,
};

// The real uploader talks to Cloudinary; here a button stands in for a finished upload.
vi.mock('@/features/admin/components/MediaUploader', () => ({
  MediaUploader: ({ label, onChange, kind }: MediaUploaderProps) => (
    <button
      type="button"
      onClick={() => {
        onChange({ ...UPLOADED_AUDIO, resourceType: kind === 'track-audio' ? 'video' : 'image' });
      }}
    >
      Upload: {label}
    </button>
  ),
}));

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  createTrack: vi.fn(),
  listAlbums: vi.fn(),
}));

function renderNewTrack() {
  const router = createMemoryRouter(
    [
      { path: '/admin/tracks/:id', element: <TrackEditPage /> },
      { path: '/admin/tracks', element: <h1>Track list</h1> },
    ],
    { initialEntries: ['/admin/tracks/new'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.mocked(createTrack)
    .mockReset()
    .mockResolvedValue(trackFixture({ title: 'New piece' }));
  vi.mocked(listAlbums)
    .mockReset()
    .mockResolvedValue({ items: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } });
});

describe('track editor', () => {
  it('requires a title and an audio file', async () => {
    renderNewTrack();

    await userEvent.click(await screen.findByRole('button', { name: 'Save track' }));

    expect(await screen.findByText('Upload the audio file for this track.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(createTrack).not.toHaveBeenCalled();
  });

  it('sends a clean payload and returns to the list', async () => {
    const router = renderNewTrack();

    await userEvent.type(await screen.findByLabelText('Title'), 'New piece');
    await userEvent.click(screen.getByRole('button', { name: 'Upload: Audio file (required)' }));
    await userEvent.type(screen.getByLabelText('Tags'), 'Folk, film');
    await userEvent.click(screen.getByRole('button', { name: 'Save track' }));

    await screen.findByRole('heading', { name: 'Track list' });
    expect(createTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New piece',
        audio: { publicId: UPLOADED_AUDIO.publicId, resourceType: 'video' },
        albumId: null,
        trackNumber: null,
        year: null,
        tags: ['folk', 'film'],
        status: 'draft',
        featured: false,
        cover: null,
      }),
    );
    expect(router.state.location.pathname).toBe('/admin/tracks');
  });

  it('shows server validation errors on the matching field', async () => {
    vi.mocked(createTrack).mockRejectedValue(
      new ApiClientError(409, 'CONFLICT', 'That slug is already in use.', [
        { path: 'slug', message: 'Already in use' },
      ]),
    );
    renderNewTrack();

    await userEvent.type(await screen.findByLabelText('Title'), 'New piece');
    await userEvent.type(screen.getByLabelText('Address name (slug)'), 'taken');
    await userEvent.click(screen.getByRole('button', { name: 'Upload: Audio file (required)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save track' }));

    expect(await screen.findByText('Already in use')).toBeInTheDocument();
    expect(screen.getByLabelText('Address name (slug)')).toHaveFocus();
  });
});

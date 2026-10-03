import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/queryClient';
import type { MediaUploaderProps } from '@/features/admin/components/MediaUploader';
import { createVideo, getVideo, updateVideo } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { uploadedVideoFixture, youtubeVideoFixture } from '@/test/fixtures';

import { VideoEditPage } from './VideoEditPage';

const uploaded = uploadedVideoFixture();

vi.mock('@/features/admin/components/MediaUploader', () => ({
  MediaUploader: ({ label, onChange }: MediaUploaderProps) => (
    <button
      type="button"
      onClick={() => {
        onChange(uploaded.source === 'cloudinary' ? uploaded.media : null);
      }}
    >
      Upload: {label}
    </button>
  ),
}));

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  createVideo: vi.fn(),
  updateVideo: vi.fn(),
  getVideo: vi.fn(),
}));

function renderEditor(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/videos/:id', element: <VideoEditPage /> },
      { path: '/admin/videos', element: <h1>Video list</h1> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(createVideo).mockReset().mockResolvedValue(youtubeVideoFixture());
  vi.mocked(updateVideo).mockReset().mockResolvedValue(youtubeVideoFixture());
  vi.mocked(getVideo).mockReset().mockResolvedValue(uploaded);
});

describe('video editor', () => {
  it('adds a YouTube video from a pasted link', async () => {
    renderEditor('/admin/videos/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Concert excerpt');
    await userEvent.type(
      screen.getByLabelText('YouTube link'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save video' }));

    await screen.findByRole('heading', { name: 'Video list' });
    const [payload] = vi.mocked(createVideo).mock.calls[0] ?? [];
    expect(payload).toMatchObject({
      source: 'youtube',
      youtube: 'dQw4w9WgXcQ',
      title: 'Concert excerpt',
    });
    expect(payload).not.toHaveProperty('mediaRef');
  });

  it('rejects a link that is not YouTube', async () => {
    renderEditor('/admin/videos/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Clip');
    await userEvent.type(screen.getByLabelText('YouTube link'), 'https://vimeo.com/123');
    await userEvent.click(screen.getByRole('button', { name: 'Save video' }));

    expect(await screen.findByText('Enter a valid YouTube URL or video ID')).toBeInTheDocument();
    expect(createVideo).not.toHaveBeenCalled();
  });

  it('switches an uploaded video to YouTube, sending only the link', async () => {
    renderEditor(`/admin/videos/${uploaded.id}`);

    await userEvent.click(await screen.findByRole('radio', { name: /On YouTube/ }));
    await userEvent.type(screen.getByLabelText('YouTube link'), 'dQw4w9WgXcQ');
    await userEvent.click(screen.getByRole('button', { name: 'Save video' }));

    await screen.findByRole('heading', { name: 'Video list' });
    const [id, payload] = vi.mocked(updateVideo).mock.calls[0] ?? [];
    expect(id).toBe(uploaded.id);
    expect(payload).toMatchObject({ source: 'youtube', youtube: 'dQw4w9WgXcQ' });
    expect(payload).not.toHaveProperty('mediaRef');
  });

  it('requires a file for uploaded videos', async () => {
    renderEditor('/admin/videos/new');

    await userEvent.click(await screen.findByRole('radio', { name: /Upload a video file/ }));
    await userEvent.type(screen.getByLabelText('Title'), 'Clip');
    await userEvent.click(screen.getByRole('button', { name: 'Save video' }));

    expect(await screen.findByText('Upload the video file.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Upload: Video file (required)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save video' }));
    await screen.findByRole('heading', { name: 'Video list' });
    const [payload] = vi.mocked(createVideo).mock.calls[0] ?? [];
    expect(payload).toMatchObject({ source: 'cloudinary', mediaRef: { resourceType: 'video' } });
    expect(payload).not.toHaveProperty('youtube');
  });
});

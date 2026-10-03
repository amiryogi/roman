import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginationMeta } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { getHome, getVideos } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { FakeAudio } from '@/test/fakeAudio';
import {
  homeFixture,
  trackFixture,
  uploadedVideoFixture,
  youtubeVideoFixture,
} from '@/test/fixtures';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getHome: vi.fn(),
  getVideos: vi.fn(),
}));

const youtube = youtubeVideoFixture();
const uploaded = uploadedVideoFixture();

function page<T>(items: T[]): { items: T[]; meta: PaginationMeta } {
  return { items, meta: { page: 1, limit: 12, total: items.length, totalPages: 1 } };
}

function renderSite(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return router;
}

beforeEach(() => {
  FakeAudio.reset();
  vi.stubGlobal('Audio', FakeAudio);
  sessionStorage.clear();
  vi.mocked(getVideos)
    .mockReset()
    .mockResolvedValue(page([youtube, uploaded]));
  vi.mocked(getHome)
    .mockReset()
    .mockResolvedValue(
      homeFixture({
        featuredTracks: [trackFixture({ title: 'Prelude' })],
        featuredVideos: [youtube],
      }),
    );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('videos', () => {
  it('loads nothing from YouTube or the video files until a video is clicked', async () => {
    renderSite('/videos');
    await screen.findByRole('button', { name: 'Play video: Concert excerpt' });

    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByText('Studio take')).toBeInTheDocument();
    expect(screen.getByText('1:35')).toBeInTheDocument();
  });

  it('opens YouTube in a privacy-friendly embed, and removes it on close', async () => {
    renderSite('/videos');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Play video: Concert excerpt' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Concert excerpt' });
    const frame = within(dialog).getByTitle('YouTube video: Concert excerpt');
    expect(frame.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close video' }));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('plays uploaded videos from Cloudinary, smaller on phones', async () => {
    renderSite('/videos');
    await userEvent.click(await screen.findByRole('button', { name: 'Play video: Studio take' }));

    const video = document.querySelector('video');
    expect(video).toHaveAttribute('preload', 'none');
    const sources = [...(video?.querySelectorAll('source') ?? [])];
    expect(sources[0]).toHaveAttribute('media', '(max-width: 767px)');
    expect(sources[0]?.getAttribute('src')).toContain('/c_limit,w_720,q_auto,vc_auto/');
    expect(sources[1]?.getAttribute('src')).toContain('/c_limit,w_1280,q_auto,vc_auto/');
  });

  it('filters by category through the address', async () => {
    const router = renderSite('/videos');
    await screen.findByRole('button', { name: 'Play video: Concert excerpt' });

    await userEvent.click(screen.getByRole('link', { name: 'Studio' }));

    expect(router.state.location.search).toBe('?category=studio');
    expect(getVideos).toHaveBeenLastCalledWith(1, 'studio');
    expect(screen.getByRole('link', { name: 'Studio' })).toHaveAttribute('aria-current', 'true');
  });

  it('pauses the music when a video starts', async () => {
    renderSite('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Play Prelude' }));
    const audio = FakeAudio.last();
    expect(audio.paused).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Play video: Concert excerpt' }));

    expect(audio.paused).toBe(true);
  });
});

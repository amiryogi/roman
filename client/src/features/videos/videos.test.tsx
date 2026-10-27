import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  it('shows posters, and loads nothing from YouTube or the files until a video plays', async () => {
    // jsdom has no IntersectionObserver, so nothing is ever "in view": no autoplay.
    renderSite('/videos');
    await screen.findByRole('button', { name: 'Play video: Concert excerpt' });

    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByText('Studio take')).toBeInTheDocument();
    expect(screen.getByText('1:35')).toBeInTheDocument();
  });

  it('plays YouTube in place with sound in a privacy-friendly embed, until paused', async () => {
    renderSite('/videos');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Play video: Concert excerpt' }),
    );

    const frame = screen.getByTitle('YouTube video: Concert excerpt');
    expect(frame.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&controls=1&playsinline=1&rel=0',
    );
    expect(
      screen.getByRole('button', { name: 'Turn sound off: Concert excerpt' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pause: Concert excerpt' }));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('plays uploaded videos from Cloudinary in place, smaller on phones', async () => {
    renderSite('/videos');
    await userEvent.click(await screen.findByRole('button', { name: 'Play video: Studio take' }));

    const video = document.querySelector('video');
    expect(video).toHaveAttribute('autoplay');
    expect(video?.muted).toBe(false);
    const sources = [...(video?.querySelectorAll('source') ?? [])];
    expect(sources[0]).toHaveAttribute('media', '(max-width: 767px)');
    expect(sources[0]?.getAttribute('src')).toContain('/c_limit,w_720,q_auto,vc_auto/');
    expect(sources[1]?.getAttribute('src')).toContain('/c_limit,w_1280,q_auto,vc_auto/');
  });

  it('gives only one video sound at a time', async () => {
    renderSite('/videos');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Play video: Concert excerpt' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play video: Studio take' }));

    // The first one lost its sound; off screen (always, in jsdom) a muted video is unloaded.
    expect(screen.queryByTitle('YouTube video: Concert excerpt')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play video: Concert excerpt' })).toBeInTheDocument();
    expect(document.querySelector('video')?.muted).toBe(false);
  });

  it('sizes each card to its video, so vertical clips stay tall', async () => {
    vi.mocked(getVideos).mockResolvedValue(
      page([
        youtube,
        uploadedVideoFixture({
          id: 'video-reel',
          title: 'Vertical reel',
          media: {
            publicId: 'root/videos/media/reel',
            resourceType: 'video',
            version: 1,
            format: 'mp4',
            bytes: 1000,
            width: 1080,
            height: 1920,
          },
        }),
      ]),
    );
    renderSite('/videos');
    const reel = await screen.findByRole('article', { name: 'Vertical reel' });
    const wide = screen.getByRole('article', { name: 'Concert excerpt' });

    expect(reel.closest('li')?.style.flexGrow).toBe(String(1080 / 1920));
    expect(wide.closest('li')?.style.flexGrow).toBe(String(16 / 9));
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

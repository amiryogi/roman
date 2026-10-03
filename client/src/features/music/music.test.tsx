import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlbumDto, PaginationMeta } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { getAlbum, getAlbums, getHome, getProfile, getTracks } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { FakeAudio } from '@/test/fakeAudio';
import { homeFixture, profileFixture, trackFixture } from '@/test/fixtures';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getHome: vi.fn(),
  getProfile: vi.fn(),
  getTracks: vi.fn(),
  getAlbums: vi.fn(),
  getAlbum: vi.fn(),
}));

const first = trackFixture({ id: 'a', title: 'First', duration: 225 });
const second = trackFixture({ id: 'b', title: 'Second', credits: 'Arranged by the artist' });

function page<T>(items: T[]): { items: T[]; meta: PaginationMeta } {
  return { items, meta: { page: 1, limit: 50, total: items.length, totalPages: 1 } };
}

const album: AlbumDto = {
  id: 'album-1',
  title: 'Live Sessions',
  slug: 'live-sessions',
  externalLinks: [{ label: 'Spotify', url: 'https://open.spotify.com/album/x' }],
  status: 'published',
  featured: false,
  sortOrder: 1,
  trackCount: 2,
  releaseDate: '2025-04-14',
  createdAt: '2026-10-02T12:00:00.000Z',
  updatedAt: '2026-10-02T12:00:00.000Z',
};

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
  vi.mocked(getHome)
    .mockReset()
    .mockResolvedValue(homeFixture({ featuredTracks: [first] }));
  vi.mocked(getProfile).mockReset().mockResolvedValue(profileFixture());
  vi.mocked(getTracks)
    .mockReset()
    .mockResolvedValue(page([first, second]));
  vi.mocked(getAlbums)
    .mockReset()
    .mockResolvedValue(page([album]));
  vi.mocked(getAlbum)
    .mockReset()
    .mockResolvedValue({ ...album, tracks: [second, first] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('music page and player', () => {
  it('plays a track only when asked, and shows an accessible player', async () => {
    renderSite('/music');
    await screen.findByRole('heading', { level: 3, name: 'First' });

    expect(screen.queryByRole('region', { name: 'Audio player' })).not.toBeInTheDocument();
    expect(FakeAudio.instances).toHaveLength(0); // no autoplay, nothing preloaded

    await userEvent.click(screen.getByRole('button', { name: 'Play First' }));

    const player = screen.getByRole('region', { name: 'Audio player' });
    expect(within(player).getAllByRole('button', { name: 'Pause First' }).length).toBeGreaterThan(
      0,
    );
    expect(within(player).getByRole('slider', { name: 'Seek' })).toHaveAttribute(
      'aria-valuetext',
      '0 seconds of 3 minutes 45 seconds',
    );
    // The track row reflects the global player too.
    const row = screen.getByRole('article', { name: 'First' });
    expect(within(row).getByRole('button', { name: 'Pause First' })).toBeInTheDocument();
    expect(screen.getByText('Arranged by the artist')).toBeInTheDocument();
  });

  it('keeps playing while the visitor moves to another page', async () => {
    renderSite('/music');
    await userEvent.click(await screen.findByRole('button', { name: 'Play First' }));
    const audio = FakeAudio.last();

    const [nav] = screen.getAllByRole('navigation', { name: 'Main' });
    if (!nav) throw new Error('no navigation');
    await userEvent.click(within(nav).getByRole('link', { name: 'About' }));
    await screen.findByRole('heading', { level: 1, name: 'About' });

    expect(FakeAudio.instances).toEqual([audio]);
    expect(audio.paused).toBe(false);
    expect(screen.getByRole('region', { name: 'Audio player' })).toBeInTheDocument();
  });

  it('moves the seek position with the arrow keys', async () => {
    renderSite('/music');
    await userEvent.click(await screen.findByRole('button', { name: 'Play First' }));
    const audio = FakeAudio.last();
    audio.duration = 225;
    audio.fire('durationchange');

    const [seek] = screen.getAllByRole('slider', { name: 'Seek' });
    if (!seek) throw new Error('no seek slider');
    seek.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(audio.currentTime).toBe(10);
  });

  it('plays a whole album in track order', async () => {
    renderSite('/music');
    await userEvent.click(await screen.findByRole('button', { name: 'Play album: Live Sessions' }));

    const player = await screen.findByRole('region', { name: 'Audio player' });
    expect(within(player).getByText('Current track: Second')).toBeInTheDocument();
    expect(getAlbum).toHaveBeenCalledWith('live-sessions');
  });

  it('says so when there are no recordings yet', async () => {
    vi.mocked(getTracks).mockResolvedValue(page([]));
    vi.mocked(getAlbums).mockResolvedValue(page([]));
    renderSite('/music');

    expect(await screen.findByText('New recordings will be shared here soon.')).toBeInTheDocument();
  });

  it('features tracks on the home page', async () => {
    renderSite('/');

    expect(await screen.findByRole('heading', { level: 2, name: 'Listen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play First' })).toBeInTheDocument();
  });
});

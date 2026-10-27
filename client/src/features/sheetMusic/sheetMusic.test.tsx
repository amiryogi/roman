import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetMusicDtoSchema, type PaginationMeta, type SheetMusicDto } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { getInquiryFormToken, getProfile, getSheetMusic } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { profileFixture } from '@/test/fixtures';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getSheetMusic: vi.fn(),
  getProfile: vi.fn(),
  getInquiryFormToken: vi.fn(),
}));

function score(overrides: Partial<SheetMusicDto> = {}): SheetMusicDto {
  return sheetMusicDtoSchema.parse({
    id: 'score-1',
    title: 'Test Waltz',
    slug: 'test-waltz',
    status: 'published',
    featured: false,
    sortOrder: 1,
    createdAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
    ...overrides,
  });
}

function page<T>(items: T[]): { items: T[]; meta: PaginationMeta } {
  return { items, meta: { page: 1, limit: 24, total: items.length, totalPages: 1 } };
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
  vi.mocked(getProfile).mockReset().mockResolvedValue(profileFixture());
  vi.mocked(getInquiryFormToken).mockReset().mockResolvedValue('token');
  vi.mocked(getSheetMusic)
    .mockReset()
    .mockResolvedValue(
      page([
        score({
          artist: 'Test Composer',
          level: 'intermediate',
          externalUrl: 'https://store.example.com/waltz',
        }),
        score({ id: 'score-2', title: 'Test Reel', slug: 'test-reel' }),
      ]),
    );
});

describe('sheet music page', () => {
  it('lists the scores with their details and links', async () => {
    renderSite('/sheet-music');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sheet music' }),
    ).toBeInTheDocument();
    const waltz = await screen.findByRole('article', { name: 'Test Waltz' });
    expect(within(waltz).getByText('Intermediate')).toBeInTheDocument();
    expect(within(waltz).getByText('Test Composer')).toBeInTheDocument();
    expect(within(waltz).getByRole('link', { name: /Store page/ })).toHaveAttribute(
      'href',
      'https://store.example.com/waltz',
    );
    const reel = screen.getByRole('article', { name: 'Test Reel' });
    expect(within(reel).queryByRole('link', { name: /Store page/ })).not.toBeInTheDocument();
  });

  it('opens the contact form with the request written', async () => {
    renderSite('/sheet-music');

    await userEvent.click(
      await screen.findByRole('link', { name: 'Request this score: Test Waltz' }),
    );

    expect(await screen.findByLabelText(/What is it about/)).toHaveValue('sheet-music');
    expect(screen.getByLabelText(/Message/)).toHaveValue('I’d like the score for “Test Waltz”.');
  });

  it('says when nothing is listed yet', async () => {
    vi.mocked(getSheetMusic).mockResolvedValue(page([]));
    renderSite('/sheet-music');

    expect(await screen.findByText('Scores will be listed here soon.')).toBeInTheDocument();
  });
});

describe('contact form links', () => {
  it('chooses the enquiry type from the address', async () => {
    renderSite('/contact?type=lessons');

    expect(await screen.findByLabelText(/What is it about/)).toHaveValue('lessons');
  });
});

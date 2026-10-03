import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GalleryImageDto, PaginationMeta } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { getGallery } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { photoFixture } from '@/test/fixtures';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getGallery: vi.fn(),
}));

const first = photoFixture({
  id: 'p1',
  alt: 'Violinist on stage',
  caption: 'Evening concert',
  photographerCredit: 'A. Photographer',
});
const second = photoFixture({ id: 'p2', alt: 'Portrait with violin', category: 'portrait' });
const third = photoFixture({ id: 'p3', alt: 'Rehearsal in the hall' });

function page(items: GalleryImageDto[], pageNumber: number, totalPages: number) {
  const meta: PaginationMeta = { page: pageNumber, limit: 24, total: 3, totalPages };
  return { items, meta };
}

function renderGallery() {
  const router = createMemoryRouter(routes, { initialEntries: ['/gallery'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getGallery)
    .mockReset()
    .mockImplementation((pageNumber) =>
      Promise.resolve(pageNumber === 1 ? page([first, second], 1, 2) : page([third], 2, 2)),
    );
});

describe('gallery', () => {
  it('declares image sizes up front (no layout shift) and shows credits', async () => {
    renderGallery();

    const image = await screen.findByRole('img', { name: 'Violinist on stage' });
    expect(image).toHaveAttribute('width', '1200');
    expect(image).toHaveAttribute('height', '1600');
    // The first photo is the page's largest image (LCP); the rest load as they scroll into view.
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
    const rest = screen.getAllByRole('img').filter((img) => img !== image);
    expect(rest.length).toBeGreaterThan(0);
    for (const img of rest) expect(img).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText(/Evening concert/)).toHaveTextContent('Photo: A. Photographer');
  });

  it('loads more photos on request', async () => {
    renderGallery();
    await screen.findByRole('img', { name: 'Violinist on stage' });

    await userEvent.click(screen.getByRole('button', { name: 'Load more photos' }));

    expect(await screen.findByRole('img', { name: 'Rehearsal in the hall' })).toBeInTheDocument();
    expect(getGallery).toHaveBeenLastCalledWith(2, undefined);
    expect(screen.queryByRole('button', { name: 'Load more photos' })).not.toBeInTheDocument();
  });

  it('opens the viewer on click and moves through photos with the keyboard', async () => {
    renderGallery();
    await userEvent.click(
      await screen.findByRole('button', { name: /^Violinist on stage.*open in viewer/ }),
    );

    // The viewer code is loaded on demand.
    expect(await screen.findByRole('button', { name: 'Next photo' })).toBeInTheDocument();
    expect(screen.getAllByText('Photo: A. Photographer').length).toBeGreaterThan(0);

    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(document.querySelector('.yarl__slide_current img')).toHaveAttribute(
        'alt',
        'Portrait with violin',
      );
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    });
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/lib/api/client';
import { getHome, getProfile } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { homeFixture, profileFixture } from '@/test/fixtures';

import { createQueryClient } from './queryClient';
import { routes } from './router';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getHome: vi.fn(),
  getProfile: vi.fn(),
}));

// StrictMode as in main.tsx: it runs effects twice, which once moved focus on the first load.
function renderSite(path = '/') {
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

function headerNav() {
  const [nav] = screen.getAllByRole('navigation', { name: 'Main', hidden: true });
  if (!nav) throw new Error('No main navigation');
  return nav;
}

beforeEach(() => {
  vi.mocked(getHome).mockReset().mockResolvedValue(homeFixture());
  vi.mocked(getProfile).mockReset().mockResolvedValue(profileFixture());
});

describe('home page', () => {
  it('shows the hero, calls to action and page metadata', async () => {
    renderSite('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Test Artist' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Listen' })).toHaveAttribute('href', '/music');
    expect(screen.getByRole('link', { name: 'Book Roman' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('img', { name: 'Artist on stage' })).toHaveAttribute(
      'fetchpriority',
      'high',
    );
    expect(document.title).toBe('Roman Budhathoki — Violinist, Kathmandu');
    expect(document.querySelector('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://example.test',
    );
  });

  it('shows an error with a working retry', async () => {
    vi.mocked(getHome)
      .mockRejectedValueOnce(new ApiClientError(0, 'NETWORK_ERROR', 'offline'))
      .mockRejectedValueOnce(new ApiClientError(0, 'NETWORK_ERROR', 'offline'));
    renderSite('/');

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(alert).toHaveTextContent(/offline/i);
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Test Artist' }),
    ).toBeInTheDocument();
  });
});

describe('layout and navigation', () => {
  it('starts with a skip link to the main content', async () => {
    renderSite('/');
    await screen.findByRole('heading', { level: 1 });

    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
  });

  it('leaves focus alone on the first page load', async () => {
    renderSite('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(document.body).toHaveFocus();
  });

  it('marks the current page and moves focus to the new heading after navigating', async () => {
    renderSite('/');
    await screen.findByRole('heading', { level: 1, name: 'Test Artist' });

    await userEvent.click(within(headerNav()).getByRole('link', { name: 'About' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'About' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(within(headerNav()).getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(document.title).toBe('About — Roman Budhathoki, Violinist');
  });

  it('opens the mobile menu, closes it with Esc and returns focus to the button', async () => {
    renderSite('/');
    await screen.findByRole('heading', { level: 1 });
    const menuButton = screen.getByRole('button', { name: 'Menu' });

    await userEvent.click(menuButton);
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(dialog).toHaveAttribute('open');
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await userEvent.type(within(dialog).getByRole('button', { name: 'Close' }), '{Escape}');
    expect(dialog).not.toHaveAttribute('open');
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu after choosing a page', async () => {
    const router = renderSite('/');
    await screen.findByRole('heading', { level: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    await userEvent.click(within(dialog).getByRole('link', { name: 'About' }));

    expect(router.state.location.pathname).toBe('/about');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('shows the branded 404 page for unknown addresses', async () => {
    renderSite('/no-such-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Listen to the music' })).toHaveAttribute(
      'href',
      '/music',
    );
  });
});

describe('footer', () => {
  it('shows the contact details and social links the owner entered', async () => {
    vi.mocked(getProfile).mockResolvedValue(
      profileFixture({
        contact: { publicEmail: 'artist@example.com', phone: '+977 9800000000' },
        socials: [
          { platform: 'youtube', url: 'https://www.youtube.com/@example' },
          { platform: 'instagram', url: 'https://www.instagram.com/example/' },
        ],
      }),
    );
    renderSite('/');
    const footer = await screen.findByRole('contentinfo');

    expect(await within(footer).findByRole('link', { name: 'artist@example.com' })).toHaveAttribute(
      'href',
      'mailto:artist@example.com',
    );
    expect(within(footer).getByRole('link', { name: '+977 9800000000' })).toHaveAttribute(
      'href',
      'tel:+9779800000000',
    );
    const youtube = within(footer).getByRole('link', {
      name: 'Roman Budhathoki on YouTube (opens in a new tab)',
    });
    expect(youtube).toHaveAttribute('href', 'https://www.youtube.com/@example');
    // A new tab keeps music playing on the site.
    expect(youtube).toHaveAttribute('target', '_blank');
    expect(
      within(footer).getByRole('link', { name: /on Instagram \(opens in a new tab\)/ }),
    ).toBeInTheDocument();
  });

  it('leaves out contact details and social links that were not entered', async () => {
    vi.mocked(getProfile).mockResolvedValue(profileFixture({ contact: {}, socials: [] }));
    renderSite('/');
    const footer = await screen.findByRole('contentinfo');
    await waitFor(() => {
      expect(getProfile).toHaveBeenCalled();
    });

    expect(within(footer).queryByText('Get in touch')).not.toBeInTheDocument();
    expect(within(footer).queryByRole('list', { name: 'Social media' })).not.toBeInTheDocument();
  });
});

describe('about page', () => {
  it('shows only the sections that have content', async () => {
    renderSite('/about');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Musical journey' }),
    ).toBeInTheDocument();
    for (const name of ['Biography', 'Teaching', 'Skills and affiliations']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: 'Achievements' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Musical philosophy' })).not.toBeInTheDocument();
    // Non-musical work stays out of the public page (plan ASM-6).
    expect(screen.queryByText('Intern Writer')).not.toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Portrait of the artist' })).toBeInTheDocument();
  });

  it('shows achievements and philosophy once they exist', async () => {
    vi.mocked(getProfile).mockResolvedValue(
      profileFixture({
        achievements: [{ year: '2020', title: 'An award' }],
        philosophy: 'Music is a conversation.',
      }),
    );
    renderSite('/about');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Achievements' }),
    ).toBeInTheDocument();
    expect(screen.getByText('An award')).toBeInTheDocument();
    expect(screen.getByText('Music is a conversation.')).toBeInTheDocument();
  });
});

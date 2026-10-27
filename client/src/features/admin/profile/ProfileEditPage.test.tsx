import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/queryClient';
import { getAdminProfile, saveProfile } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';
import { adminProfileFixture } from '@/test/fixtures';

import { ProfileEditPage } from './ProfileEditPage';

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  getAdminProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

function renderEditor() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Link to="/admin">Dashboard</Link>
            <Outlet />
          </>
        ),
        children: [
          { path: '/admin/profile', element: <ProfileEditPage /> },
          { path: '/admin', element: <h1>Dashboard page</h1> },
        ],
      },
    ],
    { initialEntries: ['/admin/profile'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function savedPayload() {
  const [payload] = vi.mocked(saveProfile).mock.calls[0] ?? [];
  return payload;
}

beforeEach(() => {
  vi.mocked(getAdminProfile).mockReset().mockResolvedValue(adminProfileFixture());
  vi.mocked(saveProfile).mockReset().mockResolvedValue(adminProfileFixture());
});

describe('profile editor', () => {
  it('sends the whole profile back, keeping images and the hidden phone number', async () => {
    renderEditor();

    const tagline = await screen.findByLabelText('Tagline');
    await userEvent.clear(tagline);
    await userEvent.type(tagline, 'Violinist');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('No unsaved changes.')).toBeInTheDocument();
    expect(savedPayload()).toMatchObject({
      displayName: 'Test Artist',
      tagline: 'Violinist',
      skills: ['Violin performance', 'Teaching'],
      affiliations: [{ name: 'Test Trust', since: '2010' }],
      contact: { publicEmail: 'artist@example.com', phone: '+977 9800000000', showPhone: false },
      portrait: { alt: 'Portrait of the artist' },
      heroDesktop: null,
      heroMobile: null,
      ogImage: null,
    });
  });

  it('edits the home page: headline, a stat and a “What I do” card with a detail and button', async () => {
    renderEditor();

    await userEvent.type(await screen.findByLabelText('Headline (optional)'), 'A test headline.');

    await userEvent.click(screen.getByRole('button', { name: 'Add stat' }));
    const stat = screen.getByRole('listitem', { name: 'Stat 1' });
    await userEvent.type(within(stat).getByLabelText('Figure'), '10 years');
    await userEvent.type(within(stat).getByLabelText('What it counts'), 'of testing');

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const card = screen.getByRole('listitem', { name: 'Card 1' });
    await userEvent.type(within(card).getByLabelText('Title'), 'Performer');
    await userEvent.type(within(card).getByLabelText('Summary'), 'Plays at test events.');
    await userEvent.click(within(card).getByRole('button', { name: 'Add detail' }));
    await userEvent.type(within(card).getByLabelText('Detail 1 name'), 'Where');
    await userEvent.type(within(card).getByLabelText('Detail 1 text'), 'Test halls');
    await userEvent.click(
      within(card).getByRole('button', { name: 'Add a button to the contact form' }),
    );
    await userEvent.selectOptions(
      within(card).getByLabelText('Enquiry type it chooses'),
      'Violin lessons',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('No unsaved changes.')).toBeInTheDocument();
    expect(savedPayload()).toMatchObject({
      heroHeadline: 'A test headline.',
      // Left empty: sent as null, which clears it.
      heroIntro: null,
      stats: [{ value: '10 years', label: 'of testing' }],
      services: [
        {
          title: 'Performer',
          summary: 'Plays at test events.',
          details: [{ label: 'Where', value: 'Test halls' }],
          cta: { label: 'Send a request', inquiryType: 'lessons' },
        },
      ],
    });
  });

  it('removes a card’s button again', async () => {
    vi.mocked(getAdminProfile).mockResolvedValue(
      adminProfileFixture({
        services: [
          {
            title: 'Educator',
            summary: 'Teaches.',
            details: [],
            cta: { label: 'Ask', inquiryType: 'lessons' },
          },
        ],
      }),
    );
    renderEditor();

    const card = await screen.findByRole('listitem', { name: 'Card 1' });
    await userEvent.click(within(card).getByRole('button', { name: 'Remove button' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('No unsaved changes.')).toBeInTheDocument();
    const [service] = savedPayload()?.services ?? [];
    expect(service?.title).toBe('Educator');
    expect(service?.cta).toBeUndefined();
  });

  it('adds, reorders and removes biography paragraphs, and edits skills one per line', async () => {
    renderEditor();

    await userEvent.click(await screen.findByRole('button', { name: 'Add paragraph' }));
    const added = screen.getByRole('listitem', { name: 'Paragraph 3' });
    await userEvent.type(within(added).getByLabelText('Text'), 'A new paragraph.');
    await userEvent.click(screen.getByRole('button', { name: 'Move up: Paragraph 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove: Paragraph 1' }));

    const skills = screen.getByLabelText('Skills');
    await userEvent.clear(skills);
    await userEvent.type(skills, 'Violin{Enter}{Enter}  Teaching  {Enter}');

    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText('No unsaved changes.');
    expect(savedPayload()).toMatchObject({
      biography: [{ body: 'A new paragraph.' }, { heading: 'Training', body: 'About training.' }],
      skills: ['Violin', 'Teaching'],
    });
  });

  it('validates with the shared schema before saving', async () => {
    renderEditor();

    await userEvent.click(await screen.findByRole('button', { name: 'Add link' }));
    await userEvent.type(screen.getByLabelText('Address (URL)'), 'http://example.com/me');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Must be an https:// URL')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Some fields need attention');
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('starts empty when no profile exists yet, and saving creates it', async () => {
    vi.mocked(getAdminProfile).mockRejectedValue(
      new ApiClientError(404, 'NOT_FOUND', 'The profile has not been set up yet.'),
    );
    renderEditor();

    await userEvent.type(await screen.findByLabelText('Name'), 'New Name');
    await userEvent.type(screen.getByLabelText('Tagline'), 'Violinist');
    await userEvent.type(screen.getByLabelText('Short introduction'), 'Hello.');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await screen.findByText('No unsaved changes.');
    expect(savedPayload()).toMatchObject({
      displayName: 'New Name',
      biography: [],
      contact: { showPhone: false },
      portrait: null,
    });
  });

  it('asks before leaving with unsaved changes', async () => {
    renderEditor();

    await userEvent.type(await screen.findByLabelText('Tagline'), ' and more');
    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Tagline')).toHaveValue('Violinist · Teacher and more');

    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Leave without saving',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Dashboard page' })).toBeInTheDocument();
  });
});

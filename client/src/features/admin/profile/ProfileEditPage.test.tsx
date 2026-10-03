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

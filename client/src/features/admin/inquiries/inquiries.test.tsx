import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/queryClient';
import { AuthContext } from '@/features/admin/auth/AuthContext';
import { DashboardPage } from '@/features/admin/dashboard/DashboardPage';
import { deleteInquiry, getInquiry, getStats, listInquiries, updateInquiry } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { inquiryFixture } from '@/test/fixtures';

import { InquiriesPage } from './InquiriesPage';
import { InquiryDetailPage } from './InquiryDetailPage';

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  deleteInquiry: vi.fn(),
  getInquiry: vi.fn(),
  getStats: vi.fn(),
  listInquiries: vi.fn(),
  updateInquiry: vi.fn(),
}));

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <DashboardPage /> },
      { path: '/admin/inquiries', element: <InquiriesPage /> },
      { path: '/admin/inquiries/:id', element: <InquiryDetailPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext
        value={{
          state: {
            status: 'authenticated',
            admin: { id: 'admin-1', email: 'admin@example.com', name: 'Test Admin' },
          },
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>,
  );
  return router;
}

const page = (items = [inquiryFixture()]) => ({
  items,
  meta: { page: 1, limit: 20, total: items.length, totalPages: 1 },
});

beforeEach(() => {
  vi.mocked(getInquiry).mockReset().mockResolvedValue(inquiryFixture());
  vi.mocked(updateInquiry)
    .mockReset()
    .mockImplementation((_id, input) =>
      Promise.resolve(
        inquiryFixture({
          status: input.status ?? 'read',
          ...(input.adminNotes ? { adminNotes: input.adminNotes } : {}),
        }),
      ),
    );
  vi.mocked(deleteInquiry).mockReset().mockResolvedValue(undefined);
  vi.mocked(listInquiries).mockReset().mockResolvedValue(page());
  vi.mocked(getStats).mockReset().mockResolvedValue({
    inquiriesNew: 1,
    tracks: 2,
    videos: 3,
    images: 4,
    upcomingEvents: 5,
    drafts: 6,
  });
});

describe('inquiry detail', () => {
  it('marks a new message as read and offers a prefilled email reply', async () => {
    renderAt('/admin/inquiries/inquiry-1');

    expect(
      await screen.findByRole('heading', { name: 'Message from Test Person' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(updateInquiry).toHaveBeenCalledWith('inquiry-1', { status: 'read' });
    });
    expect(screen.getByRole('link', { name: 'Reply by email' })).toHaveAttribute(
      'href',
      'mailto:person@example.com?subject=Re%3A%20Booking%20a%20performance%20(12%20March%202027)',
    );
    expect(await screen.findByRole('button', { name: 'Read', pressed: true })).toBeDisabled();
  });

  it('changes the status and saves private notes', async () => {
    vi.mocked(getInquiry).mockResolvedValue(inquiryFixture({ status: 'read' }));
    renderAt('/admin/inquiries/inquiry-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Replied' }));
    await waitFor(() => {
      expect(updateInquiry).toHaveBeenCalledWith('inquiry-1', { status: 'replied' });
    });

    await userEvent.type(screen.getByLabelText('Notes (only visible here)'), 'Call on Friday');
    await userEvent.click(screen.getByRole('button', { name: 'Save notes' }));
    await waitFor(() => {
      expect(updateInquiry).toHaveBeenCalledWith('inquiry-1', { adminNotes: 'Call on Friday' });
    });
    expect(screen.getByRole('button', { name: 'Save notes' })).toBeDisabled();
  });

  it('deletes after confirmation and returns to the inbox', async () => {
    vi.mocked(getInquiry).mockResolvedValue(inquiryFixture({ status: 'read' }));
    const router = renderAt('/admin/inquiries/inquiry-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete inquiry' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this inquiry?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete inquiry' }));

    await screen.findByRole('heading', { name: 'Inquiries' });
    expect(deleteInquiry).toHaveBeenCalledWith('inquiry-1');
    expect(router.state.location.pathname).toBe('/admin/inquiries');
  });
});

describe('inquiry inbox', () => {
  it('filters by status and type through the URL', async () => {
    const router = renderAt('/admin/inquiries');

    expect(await screen.findByRole('link', { name: 'Test Person' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'new');
    await userEvent.selectOptions(screen.getByLabelText('About'), 'lessons');

    await waitFor(() => {
      expect(listInquiries).toHaveBeenLastCalledWith({
        page: 1,
        status: 'new',
        inquiryType: 'lessons',
      });
    });
    expect(router.state.location.search).toBe('?status=new&type=lessons');
  });

  it('explains an empty inbox', async () => {
    vi.mocked(listInquiries).mockResolvedValue(page([]));
    renderAt('/admin/inquiries');

    expect(await screen.findByText(/No inquiries yet/)).toBeInTheDocument();
  });
});

describe('dashboard', () => {
  it('shows counts and the latest new inquiries', async () => {
    renderAt('/admin');

    await waitFor(() => {
      expect(screen.getByText('Upcoming events').previousSibling).toHaveTextContent('5');
    });
    // Drafts span every content type, so the card isn't a link.
    expect(screen.getByText('Drafts (not on the site)').previousSibling).toHaveTextContent('6');
    expect(screen.queryByRole('link', { name: /Drafts/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Test Person/ })).toHaveAttribute(
      'href',
      '/admin/inquiries/inquiry-1',
    );
    expect(listInquiries).toHaveBeenCalledWith({ page: 1, status: 'new' });
  });
});

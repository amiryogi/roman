import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/queryClient';
import { createEvent, getEvent } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { eventFixture } from '@/test/fixtures';

import { EventEditPage } from './EventEditPage';

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  createEvent: vi.fn(),
  getEvent: vi.fn(),
}));

function renderEditor(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/events/:id', element: <EventEditPage /> },
      { path: '/admin/events', element: <h1>Event list</h1> },
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
  vi.mocked(createEvent).mockReset().mockResolvedValue(eventFixture());
  vi.mocked(getEvent).mockReset().mockResolvedValue(eventFixture());
});

describe('event editor', () => {
  it('takes Kathmandu wall time and sends UTC', async () => {
    renderEditor('/admin/events/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Autumn Recital');
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-11-14T19:00' } });
    await userEvent.type(screen.getByLabelText('Venue name'), 'City Hall');
    await userEvent.click(screen.getByRole('button', { name: 'Save event' }));

    await screen.findByRole('heading', { name: 'Event list' });
    const [payload] = vi.mocked(createEvent).mock.calls[0] ?? [];
    expect(payload).toMatchObject({
      startsAt: '2026-11-14T13:15:00.000Z',
      timezone: 'Asia/Kathmandu',
      venue: { name: 'City Hall', city: 'Kathmandu', country: 'Nepal' },
    });
  });

  it('shows stored times in the event’s zone when editing', async () => {
    renderEditor('/admin/events/event-1');

    expect(await screen.findByLabelText('Starts')).toHaveValue('2026-11-14T19:00');
    expect(screen.getByLabelText(/^Ends/)).toHaveValue('2026-11-14T21:00');
  });

  it('requires a start time', async () => {
    renderEditor('/admin/events/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Recital');
    await userEvent.type(screen.getByLabelText('Venue name'), 'Hall');
    await userEvent.click(screen.getByRole('button', { name: 'Save event' }));

    expect(await screen.findByText('Enter a date and time')).toBeInTheDocument();
    expect(createEvent).not.toHaveBeenCalled();
  });
});

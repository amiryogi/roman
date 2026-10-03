import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventDto, PaginationMeta } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { getEvents } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { eventFixture } from '@/test/fixtures';

import { eventDateParts } from './eventDates';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getEvents: vi.fn(),
}));

function page(items: EventDto[]): { items: EventDto[]; meta: PaginationMeta } {
  return { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } };
}

function renderSite(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('event dates', () => {
  it('shows times in the event’s own zone, with its name', () => {
    // 13:15 UTC is 19:00 in Kathmandu (UTC+05:45).
    expect(eventDateParts(eventFixture())).toEqual({
      weekday: 'Sat',
      day: '14',
      month: 'Nov',
      fullDate: 'Saturday, 14 November 2026',
      time: '7:00 pm – 9:00 pm Nepal Time',
    });
  });

  it('leaves out the end time when the event ends on another day', () => {
    const festival = eventFixture({ endsAt: '2026-11-16T15:15:00.000Z' });
    expect(eventDateParts(festival).time).toBe('7:00 pm Nepal Time');
  });
});

describe('performances page', () => {
  beforeEach(() => {
    vi.mocked(getEvents).mockReset();
  });

  it('lists upcoming events as a programme, each with its own anchor', async () => {
    vi.mocked(getEvents).mockResolvedValue(page([eventFixture()]));
    renderSite('/events');

    const event = await screen.findByRole('article', { name: 'Autumn Recital' });
    expect(event).toHaveAttribute('id', 'autumn-recital');
    expect(
      within(event).getByText(/Saturday, 14 November 2026 · 7:00 pm – 9:00 pm Nepal Time/),
    ).toBeInTheDocument();
    expect(event.querySelector('time')).toHaveAttribute('datetime', '2026-11-14T13:15:00.000Z');
    expect(within(event).getByRole('link', { name: /Tickets/ })).toHaveAttribute(
      'href',
      'https://tickets.example.com/autumn',
    );
    expect(getEvents).toHaveBeenCalledWith(1, 'upcoming');
  });

  it('marks cancelled events and hides their ticket links', async () => {
    vi.mocked(getEvents).mockResolvedValue(page([eventFixture({ eventStatus: 'cancelled' })]));
    renderSite('/events');

    const event = await screen.findByRole('article', { name: 'Autumn Recital' });
    expect(within(event).getByText('Cancelled')).toBeInTheDocument();
    expect(within(event).queryByRole('link', { name: /Tickets/ })).not.toBeInTheDocument();
  });

  it('switches to past performances through the address', async () => {
    vi.mocked(getEvents).mockResolvedValue(page([]));
    const router = renderSite('/events');
    expect(await screen.findByText('New performances will be announced soon.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Past' }));

    expect(router.state.location.search).toBe('?when=past');
    expect(screen.getByRole('link', { name: 'Past' })).toHaveAttribute('aria-current', 'page');
    expect(getEvents).toHaveBeenLastCalledWith(1, 'past');
  });
});

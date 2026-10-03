import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/router';
import { ApiClientError } from '@/lib/api/client';
import { getInquiryFormToken, getProfile, sendInquiry } from '@/lib/api/public';
import type * as PublicApi from '@/lib/api/public';
import { profileFixture } from '@/test/fixtures';

vi.mock('@/lib/api/public', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicApi>()),
  getProfile: vi.fn(),
  getInquiryFormToken: vi.fn(),
  sendInquiry: vi.fn(),
}));

function renderContact() {
  const router = createMemoryRouter(routes, { initialEntries: ['/contact'] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function fillRequiredFields() {
  await userEvent.type(await screen.findByLabelText(/Your name/), 'Sita Sharma');
  await userEvent.type(screen.getByLabelText(/^Email/), 'sita@example.com');
  await userEvent.selectOptions(screen.getByLabelText(/Type of event/), 'wedding');
  await userEvent.type(
    screen.getByLabelText(/^Message/),
    'Live violin for our wedding ceremony, please.',
  );
}

const send = () => userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

beforeEach(() => {
  vi.mocked(getProfile).mockReset().mockResolvedValue(profileFixture());
  vi.mocked(getInquiryFormToken).mockReset().mockResolvedValue('signed-token');
  vi.mocked(sendInquiry)
    .mockReset()
    .mockResolvedValue({ id: 'abc', receivedAt: '2026-10-03T10:00:00.000Z' });
});

describe('contact page', () => {
  it('shows only the contact details the owner made public', async () => {
    renderContact();

    expect(await screen.findByRole('link', { name: 'artist@example.com' })).toHaveAttribute(
      'href',
      'mailto:artist@example.com',
    );
    // The fixture has no public phone number.
    expect(screen.queryByText('Phone', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('sends a booking with the form token, then announces success', async () => {
    renderContact();
    await fillRequiredFields();
    await send();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your message has been sent. The reply will come to sita@example.com.',
    );
    expect(sendInquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sita Sharma',
        inquiryType: 'booking',
        eventType: 'wedding',
        formToken: 'signed-token',
        website: '',
      }),
    );
  });

  it('validates like the server: bookings need an event type', async () => {
    renderContact();
    await userEvent.type(await screen.findByLabelText(/Your name/), 'Sita Sharma');
    await userEvent.type(screen.getByLabelText(/^Email/), 'sita@example.com');
    await userEvent.type(screen.getByLabelText(/^Message/), 'Live violin for our wedding, please.');
    await send();

    const summary = await screen.findByRole('alert');
    expect(
      within(summary).getByRole('link', { name: /Type of event: Choose the type of event/ }),
    ).toHaveAttribute('href', '#contact-eventType');
    expect(screen.getByLabelText(/Type of event/)).toHaveAttribute('aria-invalid', 'true');
    expect(sendInquiry).not.toHaveBeenCalled();
  });

  it('asks lessons enquiries no event type', async () => {
    renderContact();
    await userEvent.selectOptions(await screen.findByLabelText(/What is it about/), 'lessons');

    expect(screen.queryByLabelText(/Type of event/)).not.toBeInTheDocument();
  });

  it('keeps the spam trap away from people and assistive technology', async () => {
    renderContact();
    await screen.findByLabelText(/Your name/);

    const trap = document.getElementById('contact-website');
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('gets a fresh token when the form was sent too fast or left open too long', async () => {
    vi.mocked(sendInquiry).mockRejectedValueOnce(
      new ApiClientError(
        422,
        'VALIDATION_ERROR',
        'Please take a moment to check your message, then send it again.',
        [{ path: 'formToken', message: 'Please take a moment…' }],
      ),
    );
    renderContact();
    await fillRequiredFields();
    await send();

    expect(
      await screen.findByText(/Please take a moment to check your message/),
    ).toBeInTheDocument();
    expect(getInquiryFormToken).toHaveBeenCalledTimes(2);
  });

  it('explains the rate limit', async () => {
    vi.mocked(sendInquiry).mockRejectedValueOnce(
      new ApiClientError(429, 'RATE_LIMITED', 'Too many messages from this connection.'),
    );
    renderContact();
    await fillRequiredFields();
    await send();

    expect(await screen.findByText('Too many messages from this connection.')).toBeInTheDocument();
  });
});

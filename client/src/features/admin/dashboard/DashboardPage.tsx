import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import type { AdminStatsDto } from '@roman/shared';

import { useAuth } from '@/features/admin/auth/AuthContext';
import { adminPrimaryButton, adminSecondaryButton } from '@/features/admin/components/adminStyles';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { adminKeys, getStats, listInquiries } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { INQUIRY_TYPE_LABELS } from '@/lib/labels';

const RECENT_INQUIRIES = 5;
const cardClass = 'block h-full rounded-sm border border-stone-200 bg-white p-4';

const STAT_CARDS: readonly { key: keyof AdminStatsDto; label: string; to?: string }[] = [
  { key: 'inquiriesNew', label: 'New inquiries', to: '/admin/inquiries?status=new' },
  { key: 'upcomingEvents', label: 'Upcoming events', to: '/admin/events' },
  { key: 'tracks', label: 'Tracks', to: '/admin/tracks' },
  { key: 'videos', label: 'Videos', to: '/admin/videos' },
  { key: 'images', label: 'Gallery photos', to: '/admin/gallery' },
  // Drafts span every content type, so there is no single list to link to.
  { key: 'drafts', label: 'Drafts (not on the site)' },
];

/** Admin home (plan §13): counts, the latest new inquiries and shortcuts to common tasks. */
export function DashboardPage() {
  const { state } = useAuth();
  const name = state.status === 'authenticated' ? state.admin.name : '';
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: getStats });
  const inquiryParams = { page: 1, status: 'new' } as const;
  const inquiries = useQuery({
    queryKey: adminKeys.inquiryList(inquiryParams),
    queryFn: () => listInquiries(inquiryParams),
  });

  return (
    <section className="flex max-w-5xl flex-col gap-10">
      <title>Dashboard · Admin · Roman Budhathoki</title>
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/admin/tracks/new" className={adminPrimaryButton}>
            Add track
          </Link>
          <Link to="/admin/events/new" className={adminSecondaryButton}>
            Add event
          </Link>
          <Link to="/admin/gallery/upload" className={adminSecondaryButton}>
            Upload photos
          </Link>
          <Link to="/admin/profile" className={adminSecondaryButton}>
            Edit profile
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">At a glance</h2>
        {stats.isError ? (
          <FormAlert tone="error">{getErrorMessage(stats.error)}</FormAlert>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STAT_CARDS.map((card) => {
              const body = (
                <>
                  <span className="block text-3xl font-semibold tabular-nums">
                    {stats.data ? stats.data[card.key] : '–'}
                  </span>
                  <span className="text-sm text-stone-600">{card.label}</span>
                </>
              );
              return (
                <li key={card.key}>
                  {card.to ? (
                    <Link
                      to={card.to}
                      className={`${cardClass} hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={cardClass}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Latest new inquiries</h2>
          <Link to="/admin/inquiries" className="text-sm underline underline-offset-4">
            All inquiries
          </Link>
        </div>
        {inquiries.isPending ? (
          <p className="text-stone-600">Loading inquiries…</p>
        ) : inquiries.isError ? (
          <FormAlert tone="error">{getErrorMessage(inquiries.error)}</FormAlert>
        ) : inquiries.data.items.length === 0 ? (
          <p className="rounded-sm border border-dashed border-stone-300 bg-white p-6 text-center text-stone-600">
            No new inquiries. Messages from the contact form will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-sm border border-stone-200 bg-white">
            {inquiries.data.items.slice(0, RECENT_INQUIRIES).map((inquiry) => (
              <li key={inquiry.id}>
                <Link
                  to={`/admin/inquiries/${inquiry.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50"
                >
                  <span>
                    <span className="font-medium">{inquiry.name}</span>
                    <span className="text-stone-600">
                      {' '}
                      · {INQUIRY_TYPE_LABELS[inquiry.inquiryType]}
                    </span>
                  </span>
                  <span className="text-sm text-stone-600">
                    {formatDateTime(inquiry.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

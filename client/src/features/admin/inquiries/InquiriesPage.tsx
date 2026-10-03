import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  inquiryStatusSchema,
  inquiryTypeSchema,
  type InquiryDto,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminTable, type AdminColumn } from '@/features/admin/components/AdminTable';
import { adminSmallButton } from '@/features/admin/components/adminStyles';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { Pagination } from '@/features/admin/components/ListControls';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { adminKeys, listInquiries, type InquiryListParams } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from '@/lib/labels';

import { InquiryStatusBadge } from './InquiryStatusBadge';

/** Inbox filters live in the URL, like the content lists (plan §12.3). */
function useInquiryListParams() {
  const [search, setSearch] = useSearchParams();
  const status = inquiryStatusSchema.safeParse(search.get('status'));
  const inquiryType = inquiryTypeSchema.safeParse(search.get('type'));
  const page = Number(search.get('page') ?? '1');

  const params: InquiryListParams = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    ...(status.success ? { status: status.data } : {}),
    ...(inquiryType.success ? { inquiryType: inquiryType.data } : {}),
  };

  function update(changes: Partial<Record<'status' | 'type' | 'page', string>>) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setSearch(next, { replace: true });
  }

  return { params, update };
}

const columns: readonly AdminColumn<InquiryDto>[] = [
  {
    header: 'From',
    cell: (inquiry) => (
      <div className="min-w-0">
        <Link
          to={`/admin/inquiries/${inquiry.id}`}
          className={[
            'underline-offset-4 hover:underline',
            inquiry.status === 'new' ? 'font-semibold' : 'font-medium',
          ].join(' ')}
        >
          {inquiry.name}
        </Link>
        <p className="text-xs break-all text-stone-600">{inquiry.email}</p>
      </div>
    ),
  },
  { header: 'About', wide: true, cell: (inquiry) => INQUIRY_TYPE_LABELS[inquiry.inquiryType] },
  { header: 'Received', wide: true, cell: (inquiry) => formatDateTime(inquiry.createdAt) },
  { header: 'Status', cell: (inquiry) => <InquiryStatusBadge status={inquiry.status} /> },
];

/** The contact-form inbox (plan §13): newest first, filtered by status and type. */
export function InquiriesPage() {
  const { params, update } = useInquiryListParams();
  const list = useQuery({
    queryKey: adminKeys.inquiryList(params),
    queryFn: () => listInquiries(params),
  });
  const statusId = useId();
  const typeId = useId();
  const filtered = params.status !== undefined || params.inquiryType !== undefined;

  return (
    <section>
      <AdminPageHeader title="Inquiries" />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={statusId} className="text-sm font-medium text-stone-800">
            Status
          </label>
          <select
            id={statusId}
            value={params.status ?? ''}
            onChange={(event) => {
              update({ status: event.currentTarget.value });
            }}
            className="min-h-10 rounded-sm border border-stone-300 bg-white px-3"
          >
            <option value="">All</option>
            {INQUIRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {INQUIRY_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={typeId} className="text-sm font-medium text-stone-800">
            About
          </label>
          <select
            id={typeId}
            value={params.inquiryType ?? ''}
            onChange={(event) => {
              update({ type: event.currentTarget.value });
            }}
            className="min-h-10 rounded-sm border border-stone-300 bg-white px-3"
          >
            <option value="">Anything</option>
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {INQUIRY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {list.isPending ? (
        <PageSpinner label="Loading inquiries…" />
      ) : list.isError ? (
        <FormAlert tone="error">{getErrorMessage(list.error)}</FormAlert>
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          {filtered
            ? 'No inquiries match these filters.'
            : 'No inquiries yet. Messages sent through the contact form will appear here.'}
        </p>
      ) : (
        <>
          <AdminTable
            caption="Inquiries, newest first"
            items={list.data.items}
            columns={columns}
            getKey={(inquiry) => inquiry.id}
            actions={(inquiry) => (
              <Link to={`/admin/inquiries/${inquiry.id}`} className={adminSmallButton}>
                Open<span className="sr-only">: message from {inquiry.name}</span>
              </Link>
            )}
          />
          <Pagination
            meta={list.data.meta}
            onPage={(page) => {
              update({ page: String(page) });
            }}
          />
        </>
      )}
    </section>
  );
}

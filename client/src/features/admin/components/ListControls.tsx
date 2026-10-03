import { useId, useState } from 'react';

import type { AdminListParams } from '@/lib/api/admin';
import type { PaginationMeta } from '@roman/shared';

import { adminSecondaryButton } from './adminStyles';

interface ListFiltersProps {
  params: AdminListParams;
  onChange: (changes: { status?: string; q?: string }) => void;
  searchLabel: string;
}

/** Status filter and title search for admin lists. */
export function ListFilters({ params, onChange, searchLabel }: ListFiltersProps) {
  const statusId = useId();
  const searchId = useId();
  const [q, setQ] = useState(params.q ?? '');

  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={statusId} className="text-sm font-medium text-stone-800">
          Status
        </label>
        <select
          id={statusId}
          value={params.status ?? ''}
          onChange={(event) => {
            onChange({ status: event.currentTarget.value });
          }}
          className="min-h-10 rounded-sm border border-stone-300 bg-white px-3"
        >
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <form
        role="search"
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ q });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-sm font-medium text-stone-800">
            {searchLabel}
          </label>
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.currentTarget.value);
            }}
            className="min-h-10 rounded-sm border border-stone-300 bg-white px-3"
          />
        </div>
        <button type="submit" className={adminSecondaryButton}>
          Search
        </button>
      </form>
    </div>
  );
}

export function Pagination({
  meta,
  onPage,
}: {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={meta.page <= 1}
        onClick={() => {
          onPage(meta.page - 1);
        }}
        className={adminSecondaryButton}
      >
        Previous
      </button>
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      <button
        type="button"
        disabled={meta.page >= meta.totalPages}
        onClick={() => {
          onPage(meta.page + 1);
        }}
        className={adminSecondaryButton}
      >
        Next
      </button>
    </nav>
  );
}

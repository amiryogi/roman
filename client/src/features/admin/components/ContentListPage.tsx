import { useMutation, useQuery, type QueryKey } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import type { Paginated, PublicationStatus } from '@roman/shared';

import type { AdminListParams } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';

import { AdminPageHeader } from './AdminPageHeader';
import { adminDangerSmallButton, adminPrimaryButton, adminSmallButton } from './adminStyles';
import { AdminTable, type AdminColumn } from './AdminTable';
import { ConfirmDialog } from './ConfirmDialog';
import { FormAlert } from './FormAlert';
import { ListFilters, Pagination } from './ListControls';
import { PageSpinner } from './PageSpinner';
import { StatusBadge } from './StatusBadge';
import { useAdminListParams, useInvalidate, useMove } from './useAdminList';

const noReorder = () => Promise.resolve();

interface ContentItem {
  id: string;
  status: PublicationStatus;
  featured: boolean;
}

export interface ContentListConfig<T extends ContentItem> {
  title: string;
  /** e.g. "track", used in messages. */
  noun: string;
  newPath: string;
  newLabel: string;
  /** Extra header actions, e.g. "Upload photos". */
  extraActions?: ReactNode;
  listKey: (params: AdminListParams) => QueryKey;
  list: (params: AdminListParams) => Promise<Paginated<T>>;
  /** Admin and public caches that show this content. */
  invalidate: QueryKey[];
  update: (id: string, input: { status?: PublicationStatus; featured?: boolean }) => Promise<T>;
  remove: (id: string) => Promise<void>;
  /** Omit for content that has a natural order (events are sorted by date). */
  reorder?: (ids: string[]) => Promise<void>;
  /** A short name for an item, for messages and screen-reader labels. */
  label: (item: T) => string;
  editPath: (item: T) => string;
  /** Content columns; status and "featured" columns are added after them. */
  columns: AdminColumn<T>[];
  deleteMessage: (item: T) => string;
  searchLabel: string;
  emptyMessage: string;
}

/**
 * The admin list shared by tracks, videos and photos (plan §13): filters in the URL, publish and
 * feature toggles, keyboard reordering, and delete with confirmation.
 */
export function ContentListPage<T extends ContentItem>({
  config,
}: {
  config: ContentListConfig<T>;
}) {
  const { params, update } = useAdminListParams();
  const list = useQuery({ queryKey: config.listKey(params), queryFn: () => config.list(params) });
  const invalidate = useInvalidate(...config.invalidate);
  const [toDelete, setToDelete] = useState<T | null>(null);

  const patch = useMutation({
    mutationFn: ({
      item,
      input,
    }: {
      item: T;
      input: { status?: PublicationStatus; featured?: boolean };
    }) => config.update(item.id, input),
    onSuccess: async (_saved, { item }) => {
      toast.success(`“${config.label(item)}” updated`);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (item: T) => config.remove(item.id),
    onSuccess: async (_result, item) => {
      toast.success(`“${config.label(item)}” deleted`);
      setToDelete(null);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { move, busy } = useMove(list.data?.items, config.reorder ?? noReorder, invalidate);

  const columns: AdminColumn<T>[] = [
    ...config.columns,
    { header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    {
      header: 'Featured',
      wide: true,
      cell: (item) => (
        <button
          type="button"
          aria-pressed={item.featured}
          aria-label={`Featured on the home page: ${config.label(item)}`}
          disabled={patch.isPending}
          onClick={() => {
            patch.mutate({ item, input: { featured: !item.featured } });
          }}
          className={adminSmallButton}
        >
          {item.featured ? '★ Yes' : '☆ No'}
        </button>
      ),
    },
  ];

  return (
    <section>
      <AdminPageHeader
        title={config.title}
        action={
          <div className="flex flex-wrap gap-2">
            {config.extraActions}
            <Link to={config.newPath} className={adminPrimaryButton}>
              {config.newLabel}
            </Link>
          </div>
        }
      />
      <ListFilters
        key={params.q ?? ''}
        params={params}
        searchLabel={config.searchLabel}
        onChange={(changes) => {
          update(changes);
        }}
      />

      {list.isPending ? (
        <PageSpinner label={`Loading ${config.title.toLowerCase()}…`} />
      ) : list.isError ? (
        <FormAlert tone="error">{getErrorMessage(list.error)}</FormAlert>
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          {params.status || params.q ? 'Nothing matches these filters.' : config.emptyMessage}
        </p>
      ) : (
        <>
          <AdminTable
            caption={`${config.title}, in the order they appear on the site`}
            items={list.data.items}
            columns={columns}
            getKey={(item) => item.id}
            onMove={config.reorder ? move : undefined}
            moveLabel={config.label}
            busy={busy}
            actions={(item) => (
              <>
                <Link to={config.editPath(item)} className={adminSmallButton}>
                  Edit<span className="sr-only">: {config.label(item)}</span>
                </Link>
                <button
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => {
                    patch.mutate({
                      item,
                      input: { status: item.status === 'published' ? 'draft' : 'published' },
                    });
                  }}
                  className={adminSmallButton}
                >
                  {item.status === 'published' ? 'Unpublish' : 'Publish'}
                  <span className="sr-only">: {config.label(item)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setToDelete(item);
                  }}
                  className={adminDangerSmallButton}
                >
                  Delete<span className="sr-only">: {config.label(item)}</span>
                </button>
              </>
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

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete this ${config.noun}?`}
        message={toDelete ? config.deleteMessage(toDelete) : ''}
        confirmLabel={`Delete ${config.noun}`}
        busy={remove.isPending}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
        }}
        onCancel={() => {
          setToDelete(null);
        }}
      />
    </section>
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import type { TrackDto, TrackUpdateInput } from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  adminDangerSmallButton,
  adminPrimaryButton,
  adminSmallButton,
} from '@/features/admin/components/adminStyles';
import { AdminTable, type AdminColumn } from '@/features/admin/components/AdminTable';
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { ListFilters, Pagination } from '@/features/admin/components/ListControls';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import {
  useAdminListParams,
  useInvalidate,
  useMove,
} from '@/features/admin/components/useAdminList';
import { formatDuration } from '@/features/audio/duration';
import { TrackArtwork } from '@/features/audio/TrackArtwork';
import { adminKeys, deleteTrack, listTracks, reorderTracks, updateTrack } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';

export function TracksPage() {
  const { params, update } = useAdminListParams();
  const list = useQuery({
    queryKey: adminKeys.trackList(params),
    queryFn: () => listTracks(params),
  });
  const invalidate = useInvalidate(
    adminKeys.tracks,
    adminKeys.albums,
    queryKeys.tracks,
    queryKeys.home,
  );
  const [toDelete, setToDelete] = useState<TrackDto | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TrackUpdateInput }) => updateTrack(id, input),
    onSuccess: async (track) => {
      toast.success(`“${track.title}” updated`);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (track: TrackDto) => deleteTrack(track.id),
    onSuccess: async (_result, track) => {
      toast.success(`“${track.title}” deleted`);
      setToDelete(null);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { move, busy } = useMove(list.data?.items, reorderTracks, invalidate);

  const columns: AdminColumn<TrackDto>[] = [
    {
      header: 'Track',
      cell: (track) => (
        <div className="flex items-center gap-3">
          <TrackArtwork track={track} size={40} />
          <div className="min-w-0">
            <Link
              to={`/admin/tracks/${track.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {track.title}
            </Link>
            {track.album && <p className="text-xs text-stone-600">{track.album.title}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Length',
      wide: true,
      cell: (track) => formatDuration(track.duration),
      className: 'tabular-nums',
    },
    { header: 'Status', cell: (track) => <StatusBadge status={track.status} /> },
    {
      header: 'Featured',
      wide: true,
      cell: (track) => (
        <button
          type="button"
          aria-pressed={track.featured}
          aria-label={`Featured on the home page: ${track.title}`}
          disabled={patch.isPending}
          onClick={() => {
            patch.mutate({ id: track.id, input: { featured: !track.featured } });
          }}
          className={adminSmallButton}
        >
          {track.featured ? '★ Yes' : '☆ No'}
        </button>
      ),
    },
  ];

  return (
    <section>
      <AdminPageHeader
        title="Tracks"
        action={
          <Link to="/admin/tracks/new" className={adminPrimaryButton}>
            Add track
          </Link>
        }
      />
      <ListFilters
        key={params.q ?? ''}
        params={params}
        searchLabel="Search titles"
        onChange={(changes) => {
          update(changes);
        }}
      />

      {list.isPending ? (
        <PageSpinner label="Loading tracks…" />
      ) : list.isError ? (
        <FormAlert tone="error">{getErrorMessage(list.error)}</FormAlert>
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          {params.status || params.q
            ? 'No tracks match these filters.'
            : 'No tracks yet. Add the first one.'}
        </p>
      ) : (
        <>
          <AdminTable
            caption="Tracks, in the order they appear on the site"
            items={list.data.items}
            columns={columns}
            getKey={(track) => track.id}
            onMove={move}
            moveLabel={(track) => track.title}
            busy={busy}
            actions={(track) => (
              <>
                <Link to={`/admin/tracks/${track.id}`} className={adminSmallButton}>
                  Edit<span className="sr-only">: {track.title}</span>
                </Link>
                <button
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => {
                    patch.mutate({
                      id: track.id,
                      input: { status: track.status === 'published' ? 'draft' : 'published' },
                    });
                  }}
                  className={adminSmallButton}
                >
                  {track.status === 'published' ? 'Unpublish' : 'Publish'}
                  <span className="sr-only">: {track.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setToDelete(track);
                  }}
                  className={adminDangerSmallButton}
                >
                  Delete<span className="sr-only">: {track.title}</span>
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
        title="Delete this track?"
        message={`“${toDelete?.title ?? ''}” and its audio file will be deleted. This can’t be undone.`}
        confirmLabel="Delete track"
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

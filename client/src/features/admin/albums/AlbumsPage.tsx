import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import type { AlbumDto, AlbumUpdateInput } from '@roman/shared';

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
import { adminKeys, deleteAlbum, listAlbums, reorderAlbums, updateAlbum } from '@/lib/api/admin';
import { getMediaUrls } from '@/lib/cloudinary';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';

interface PendingDelete {
  album: AlbumDto;
  detachTracks: boolean;
}

export function AlbumsPage() {
  const { params, update } = useAdminListParams();
  const list = useQuery({
    queryKey: adminKeys.albumList(params),
    queryFn: () => listAlbums(params),
  });
  const invalidate = useInvalidate(
    adminKeys.albums,
    adminKeys.tracks,
    queryKeys.albums,
    queryKeys.tracks,
    queryKeys.home,
  );
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AlbumUpdateInput }) => updateAlbum(id, input),
    onSuccess: async (album) => {
      toast.success(`“${album.title}” updated`);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: ({ album, detachTracks }: PendingDelete) => deleteAlbum(album.id, detachTracks),
    onSuccess: async (_result, { album }) => {
      toast.success(`“${album.title}” deleted`);
      setPending(null);
      await invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { move, busy } = useMove(list.data?.items, reorderAlbums, invalidate);

  function requestDelete(album: AlbumDto) {
    // Albums with tracks need explicit consent to detach them (plan §8.3).
    setPending({ album, detachTracks: (album.trackCount ?? 0) > 0 });
  }

  const columns: AdminColumn<AlbumDto>[] = [
    {
      header: 'Album',
      cell: (album) => (
        <div className="flex items-center gap-3">
          {album.cover ? (
            <img
              src={getMediaUrls().imageUrl(album.cover.asset, {
                crop: 'fill',
                width: 80,
                height: 80,
              })}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-sm object-cover"
            />
          ) : (
            <span aria-hidden="true" className="size-10 rounded-sm bg-stone-200" />
          )}
          <Link
            to={`/admin/albums/${album.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {album.title}
          </Link>
        </div>
      ),
    },
    { header: 'Released', wide: true, cell: (album) => album.releaseDate ?? '—' },
    {
      header: 'Tracks',
      wide: true,
      cell: (album) => album.trackCount ?? 0,
      className: 'tabular-nums',
    },
    { header: 'Status', cell: (album) => <StatusBadge status={album.status} /> },
  ];

  const trackCount = pending?.album.trackCount ?? 0;

  return (
    <section>
      <AdminPageHeader
        title="Albums"
        action={
          <Link to="/admin/albums/new" className={adminPrimaryButton}>
            Add album
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
        <PageSpinner label="Loading albums…" />
      ) : list.isError ? (
        <FormAlert tone="error">{getErrorMessage(list.error)}</FormAlert>
      ) : list.data.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          {params.status || params.q
            ? 'No albums match these filters.'
            : 'No albums yet. Tracks can also be published without an album.'}
        </p>
      ) : (
        <>
          <AdminTable
            caption="Albums, in the order they appear on the site"
            items={list.data.items}
            columns={columns}
            getKey={(album) => album.id}
            onMove={move}
            moveLabel={(album) => album.title}
            busy={busy}
            actions={(album) => (
              <>
                <Link to={`/admin/albums/${album.id}`} className={adminSmallButton}>
                  Edit<span className="sr-only">: {album.title}</span>
                </Link>
                <button
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => {
                    patch.mutate({
                      id: album.id,
                      input: { status: album.status === 'published' ? 'draft' : 'published' },
                    });
                  }}
                  className={adminSmallButton}
                >
                  {album.status === 'published' ? 'Unpublish' : 'Publish'}
                  <span className="sr-only">: {album.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    requestDelete(album);
                  }}
                  className={adminDangerSmallButton}
                >
                  Delete<span className="sr-only">: {album.title}</span>
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
        open={pending !== null}
        title="Delete this album?"
        message={
          trackCount > 0
            ? `“${pending?.album.title ?? ''}” has ${String(trackCount)} track${trackCount === 1 ? '' : 's'}. They will be kept, without an album. The album and its cover will be deleted.`
            : `“${pending?.album.title ?? ''}” and its cover will be deleted. This can’t be undone.`
        }
        confirmLabel={trackCount > 0 ? 'Detach tracks and delete' : 'Delete album'}
        busy={remove.isPending}
        onConfirm={() => {
          if (pending) remove.mutate(pending);
        }}
        onCancel={() => {
          setPending(null);
        }}
      />
    </section>
  );
}

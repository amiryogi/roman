import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { AlbumDto } from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { Seo } from '@/components/seo/Seo';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { BookingBand } from '@/features/home/BookingBand';
import { getErrorMessage } from '@/lib/api/errors';
import { getAlbum, getAlbums, getTracks, queryKeys } from '@/lib/api/public';

import { TrackList } from './TrackList';

/** Music (plan §6): albums when there are any, and every published track, featured first. */
export function MusicPage() {
  const tracks = useInfiniteQuery({
    queryKey: queryKeys.tracks,
    queryFn: ({ pageParam }) => getTracks(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const albums = useQuery({ queryKey: queryKeys.albums, queryFn: getAlbums });
  const allTracks = tracks.data?.pages.flatMap((page) => page.items) ?? [];
  const albumList = albums.data?.items.filter((album) => (album.trackCount ?? 0) > 0) ?? [];

  return (
    <>
      <Seo title="Music" path="/music" />
      <header className="surface-dark">
        <Container className="pt-16 pb-4 sm:pt-24">
          <p className="label-caps text-varnish">Listen</p>
          <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
            Music
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mist">
            Press play on any track. The music keeps playing while you explore the rest of the site.
          </p>
        </Container>
      </header>

      <Section tone="dark" label="Recordings" number={1}>
        {tracks.isPending ? (
          <div role="status" aria-label="Loading" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tracks.isError ? (
          <ErrorState
            error={tracks.error}
            title="The recordings could not be loaded"
            onRetry={() => {
              void tracks.refetch();
            }}
          />
        ) : allTracks.length === 0 ? (
          <p className="max-w-xl text-lg text-mist">New recordings will be shared here soon.</p>
        ) : (
          <>
            <TrackList tracks={allTracks} />
            {tracks.hasNextPage && (
              <button
                type="button"
                onClick={() => {
                  void tracks.fetchNextPage();
                }}
                disabled={tracks.isFetchingNextPage}
                className="mt-10 inline-flex min-h-11 items-center rounded-sm border border-current px-6 text-sm font-medium tracking-[0.14em] uppercase hover:bg-(--accent) hover:text-(--on-accent) disabled:opacity-60"
              >
                {tracks.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </Section>

      {albumList.length > 0 && (
        <Section tone="light" label="Albums" number={2}>
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {albumList.map((album) => (
              <li key={album.id}>
                <AlbumCard album={album} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <BookingBand tone={albumList.length > 0 ? 'dark' : 'light'} />
    </>
  );
}

function AlbumCard({ album }: { album: AlbumDto }) {
  const queryClient = useQueryClient();
  const { playTrack } = useAudioPlayer();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const year = album.releaseDate?.slice(0, 4);
  const count = album.trackCount ?? 0;

  async function playAlbum() {
    setError(null);
    setLoading(true);
    try {
      const detail = await queryClient.query({
        queryKey: queryKeys.album(album.slug),
        queryFn: () => getAlbum(album.slug),
      });
      const [first] = detail.tracks;
      if (first) playTrack(first, detail.tracks);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article aria-labelledby={`album-${album.id}`} className="flex flex-col gap-4">
      {album.cover && (
        <ResponsiveImage
          asset={album.cover.asset}
          alt={album.cover.alt}
          aspect={1}
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 100vw"
          className="h-auto w-full rounded-sm"
        />
      )}
      <div>
        <h3
          id={`album-${album.id}`}
          className="font-display text-[1.75rem] leading-tight font-medium"
        >
          {album.title}
        </h3>
        <p className="mt-1 text-sm text-(--muted)">
          {[year, `${String(count)} track${count === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </p>
        {album.description && <p className="mt-3 leading-relaxed">{album.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => void playAlbum()}
          disabled={loading}
          className="inline-flex min-h-11 items-center rounded-sm bg-(--accent) px-5 text-sm font-medium tracking-[0.14em] text-(--on-accent) uppercase hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Play album'}
          <span className="sr-only">: {album.title}</span>
        </button>
        {album.externalLinks.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-(--accent) underline underline-offset-4"
          >
            {link.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </article>
  );
}

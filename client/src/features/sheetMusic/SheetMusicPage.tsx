import { useInfiniteQuery } from '@tanstack/react-query';

import type { SheetMusicDto } from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingBand } from '@/features/home/BookingBand';
import { getSheetMusic, queryKeys } from '@/lib/api/public';
import { SHEET_MUSIC_LEVEL_LABELS } from '@/lib/labels';

/**
 * Sheet music (2026-10 revamp): the scores the owner listed, each with a "Request this score" link
 * that opens the contact form with the request written, and the owner's store link if there is
 * one. Scores aren't downloaded from the site.
 */
export function SheetMusicPage() {
  const scores = useInfiniteQuery({
    queryKey: queryKeys.sheetMusic,
    queryFn: ({ pageParam }) => getSheetMusic(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const items = scores.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <Seo {...PAGE_SEO.sheetMusic} />
      <div className="surface-dark stage-light">
        <Container className="pt-16 pb-24 sm:pt-24">
          <p className="eyebrow">Scores</p>
          <h1 className="mt-4 page-title">Sheet music</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fog">
            Violin scores of songs I play. Request the one you’d like and I’ll reply with the
            details.
          </p>

          <div className="mt-14">
            {scores.isPending ? (
              <div
                role="status"
                aria-label="Loading"
                className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-96 rounded-2xl" />
                ))}
              </div>
            ) : scores.isError ? (
              <ErrorState
                error={scores.error}
                title="The sheet music could not be loaded"
                onRetry={() => {
                  void scores.refetch();
                }}
              />
            ) : items.length === 0 ? (
              <p className="max-w-xl text-lg text-fog">Scores will be listed here soon.</p>
            ) : (
              <>
                <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((score) => (
                    <li key={score.id}>
                      <ScoreCard score={score} />
                    </li>
                  ))}
                </ul>
                {scores.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => {
                      void scores.fetchNextPage();
                    }}
                    disabled={scores.isFetchingNextPage}
                    className="pill mt-12 btn-fill disabled:opacity-60"
                  >
                    {scores.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>
        </Container>
      </div>
      <BookingBand tone="dark-raised" />
    </>
  );
}

function ScoreCard({ score }: { score: SheetMusicDto }) {
  const titleId = `score-${score.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-snow/10 bg-night-raised transition-colors duration-300 hover:border-crimson/50"
    >
      {/* Score snippets are mostly white paper: shown whole, never cropped. */}
      <div
        className={`flex aspect-[4/3] items-center justify-center p-3 ${score.preview ? 'bg-snow' : 'bg-night'}`}
      >
        {score.preview ? (
          <ResponsiveImage
            asset={score.preview.asset}
            alt={score.preview.alt}
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 100vw"
            className="max-h-full w-auto object-contain"
          />
        ) : (
          <span aria-hidden="true" className="font-display text-[4rem] text-crimson/50">
            ♪
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {score.level && (
          <p className="label-caps text-crimson">{SHEET_MUSIC_LEVEL_LABELS[score.level]}</p>
        )}
        <h2 id={titleId} className="mt-2 text-xl font-semibold">
          {score.title}
        </h2>
        {score.artist && <p className="mt-1 text-fog">{score.artist}</p>}
        {score.description && (
          <p className="mt-4 line-clamp-4 leading-relaxed text-fog">{score.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          <ButtonLink
            to={`/contact?score=${encodeURIComponent(score.title)}`}
            className="min-h-11 px-5 text-sm"
          >
            Request this score<span className="sr-only">: {score.title}</span>
          </ButtonLink>
          {score.externalUrl && (
            <a
              href={score.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-crimson underline-offset-4 hover:text-crimson"
            >
              Store page<span className="sr-only"> for {score.title} (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

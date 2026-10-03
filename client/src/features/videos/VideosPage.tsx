import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { VIDEO_CATEGORIES, videoCategorySchema } from '@roman/shared';

import { Seo } from '@/components/seo/Seo';
import { CategoryFilter } from '@/components/ui/CategoryFilter';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingBand } from '@/features/home/BookingBand';
import { getVideos, queryKeys } from '@/lib/api/public';
import { VIDEO_CATEGORY_LABELS } from '@/lib/labels';

import { VideoGallery } from './VideoGallery';

/** Videos (plan §6): a filterable grid; each video plays in a dialog. No detail pages (ADR-9). */
export function VideosPage() {
  const [search] = useSearchParams();
  const parsed = videoCategorySchema.safeParse(search.get('category'));
  const category = parsed.success ? parsed.data : undefined;

  const videos = useInfiniteQuery({
    queryKey: queryKeys.videos(category),
    queryFn: ({ pageParam }) => getVideos(pageParam, category),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const items = videos.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <Seo title="Videos" path="/videos" />
      <div className="surface-dark">
        <Container className="pt-16 pb-24 sm:pt-24">
          <p className="label-caps text-varnish">Watch</p>
          <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
            Videos
          </h1>
          <div className="mt-10">
            <CategoryFilter
              label="Video categories"
              categories={VIDEO_CATEGORIES}
              labels={VIDEO_CATEGORY_LABELS}
              current={category}
            />
          </div>

          <div className="mt-12">
            {videos.isPending ? (
              <div
                role="status"
                aria-label="Loading"
                className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-video w-full" />
                ))}
              </div>
            ) : videos.isError ? (
              <ErrorState
                error={videos.error}
                title="The videos could not be loaded"
                onRetry={() => {
                  void videos.refetch();
                }}
              />
            ) : items.length === 0 ? (
              <p className="max-w-xl text-lg text-mist">
                {category ? 'No videos in this category yet.' : 'Videos will be shared here soon.'}
              </p>
            ) : (
              <>
                <VideoGallery videos={items} />
                {videos.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => {
                      void videos.fetchNextPage();
                    }}
                    disabled={videos.isFetchingNextPage}
                    className="mt-12 inline-flex min-h-11 items-center rounded-sm border border-current px-6 text-sm font-medium tracking-[0.14em] uppercase hover:bg-(--accent) hover:text-(--on-accent) disabled:opacity-60"
                  >
                    {videos.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>
        </Container>
      </div>
      <BookingBand tone="light" />
    </>
  );
}

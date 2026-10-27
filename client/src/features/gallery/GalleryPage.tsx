import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { GALLERY_CATEGORIES, isOneOf } from '@roman/shared/lite';

import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { CategoryFilter } from '@/components/ui/CategoryFilter';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getGallery, queryKeys } from '@/lib/api/public';
import { GALLERY_CATEGORY_LABELS } from '@/lib/labels';

import { GalleryGrid } from './GalleryGrid';

/** Gallery (plan §6): category filter in the URL, masonry grid, "Load more", viewer. */
export function GalleryPage() {
  const [search] = useSearchParams();
  const requested = search.get('category');
  const category = isOneOf(GALLERY_CATEGORIES, requested) ? requested : undefined;

  const gallery = useInfiniteQuery({
    queryKey: queryKeys.gallery(category),
    queryFn: ({ pageParam }) => getGallery(pageParam, category),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const images = gallery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="surface-light">
      <Seo {...PAGE_SEO.gallery} />
      <Container className="pt-16 pb-24 sm:pt-24">
        <p className="eyebrow">Photographs</p>
        <h1 className="mt-4 page-title">Gallery</h1>
        <div className="mt-10">
          <CategoryFilter
            label="Photo categories"
            categories={GALLERY_CATEGORIES}
            labels={GALLERY_CATEGORY_LABELS}
            current={category}
          />
        </div>

        <div className="mt-12">
          {gallery.isPending ? (
            <div
              role="status"
              aria-label="Loading"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : gallery.isError ? (
            <ErrorState
              error={gallery.error}
              title="The photos could not be loaded"
              onRetry={() => {
                void gallery.refetch();
              }}
            />
          ) : images.length === 0 ? (
            <p className="max-w-xl text-lg text-(--muted)">
              {category ? 'No photos in this category yet.' : 'Photos will be shared here soon.'}
            </p>
          ) : (
            <>
              <GalleryGrid images={images} />
              {gallery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => {
                    void gallery.fetchNextPage();
                  }}
                  disabled={gallery.isFetchingNextPage}
                  className="pill mt-12 btn-fill disabled:opacity-60"
                >
                  {gallery.isFetchingNextPage ? 'Loading…' : 'Load more photos'}
                </button>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}

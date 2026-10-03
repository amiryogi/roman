import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import type { EventTimeframe } from '@roman/shared';

import { BOOK_PATH } from '@/components/layout/navigation';
import { seoContext } from '@/components/seo/context';
import { JsonLd } from '@/components/seo/JsonLd';
import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { SITE_NAME } from '@/components/seo/site';
import { eventJsonLd, personRef } from '@/components/seo/structuredData';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingBand } from '@/features/home/BookingBand';
import { getEvents, queryKeys } from '@/lib/api/public';

import { EventList } from './EventList';

const TABS: { when: EventTimeframe; label: string }[] = [
  { when: 'upcoming', label: 'Upcoming' },
  { when: 'past', label: 'Past' },
];

/** Performances (plan §6): upcoming and past, chosen in the address (`?when=past`). */
export function EventsPage() {
  const [search] = useSearchParams();
  const when: EventTimeframe = search.get('when') === 'past' ? 'past' : 'upcoming';

  const events = useInfiniteQuery({
    queryKey: queryKeys.events(when),
    queryFn: ({ pageParam }) => getEvents(pageParam, when),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  const items = events.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <Seo {...PAGE_SEO.events} />
      {/* Only upcoming events are marked up as MusicEvent (plan §17). */}
      {when === 'upcoming' && (
        <JsonLd
          items={items.map((event) =>
            eventJsonLd(event, personRef(seoContext(), SITE_NAME), seoContext()),
          )}
        />
      )}
      <div className="surface-dark">
        <Container className="pt-16 pb-24 sm:pt-24">
          <p className="label-caps text-varnish">Concerts and events</p>
          <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
            Performances
          </h1>

          <nav aria-label="Performances" className="mt-10">
            <ul className="flex gap-6 border-b border-current/15">
              {TABS.map((tab) => (
                <li key={tab.when}>
                  <Link
                    to={{ search: tab.when === 'past' ? '?when=past' : '' }}
                    replace
                    aria-current={when === tab.when ? 'page' : undefined}
                    className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent label-caps text-mist hover:text-ivory aria-[current=page]:border-varnish aria-[current=page]:text-ivory"
                  >
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8">
            {events.isPending ? (
              <div role="status" aria-label="Loading" className="space-y-6">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : events.isError ? (
              <ErrorState
                error={events.error}
                title="The performances could not be loaded"
                onRetry={() => {
                  void events.refetch();
                }}
              />
            ) : items.length === 0 ? (
              when === 'upcoming' ? (
                <div className="flex max-w-xl flex-col items-start gap-6 py-8">
                  <p className="text-lg text-mist">New performances will be announced soon.</p>
                  <ButtonLink to={BOOK_PATH} variant="outline">
                    Book Roman for your event
                  </ButtonLink>
                </div>
              ) : (
                <p className="py-8 text-lg text-mist">No past performances listed yet.</p>
              )
            ) : (
              <>
                <EventList events={items} headingLevel={2} />
                {events.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => {
                      void events.fetchNextPage();
                    }}
                    disabled={events.isFetchingNextPage}
                    className="mt-10 inline-flex min-h-11 items-center rounded-sm border border-current px-6 text-sm font-medium tracking-[0.14em] uppercase hover:bg-(--accent) hover:text-(--on-accent) disabled:opacity-60"
                  >
                    {events.isFetchingNextPage ? 'Loading…' : 'Load more'}
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

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import type { HomeDto, ProfileSummaryDto } from '@roman/shared';

import { BOOK_PATH } from '@/components/layout/navigation';
import { HeroPicture } from '@/components/media/HeroPicture';
import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { Seo } from '@/components/seo/Seo';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { StringsDivider } from '@/components/ui/StringsDivider';
import { TrackList } from '@/features/music/TrackList';
import { getHome, queryKeys } from '@/lib/api/public';

import { BookingBand } from './BookingBand';

export function HomePage() {
  const home = useQuery({ queryKey: queryKeys.home, queryFn: getHome });

  return (
    <>
      <Seo path="/" type="profile" />
      {home.isPending ? (
        <HeroSkeleton />
      ) : home.isError ? (
        <div className="surface-dark">
          <Container>
            <ErrorState
              error={home.error}
              onRetry={() => {
                void home.refetch();
              }}
            />
          </Container>
        </div>
      ) : (
        <HomeContent home={home.data} />
      )}
    </>
  );
}

/**
 * Order follows plan §6. Sections with no content are left out entirely (plan §12.5), and the
 * movement numbers follow the visible order. Videos, photos and events join in Phases 7–8.
 */
function HomeContent({ home }: { home: HomeDto }) {
  const { profile, featuredTracks } = home;
  const hasMusic = featuredTracks.length > 0;
  const biographyNumber = hasMusic ? 2 : 1;
  return (
    <>
      <Hero profile={profile} />
      {hasMusic && (
        <Section tone="dark" label="Music" number={1} title="Listen">
          <TrackList tracks={featuredTracks} />
          <Link
            to="/music"
            className="mt-8 inline-flex min-h-11 items-center text-sm font-medium tracking-[0.14em] text-varnish uppercase underline decoration-varnish/40 underline-offset-[6px] hover:decoration-varnish"
          >
            All music
          </Link>
        </Section>
      )}
      <BiographyTeaser profile={profile} number={biographyNumber} />
      <BookingBand number={biographyNumber + 1} />
    </>
  );
}

function Hero({ profile }: { profile: ProfileSummaryDto }) {
  return (
    <section aria-labelledby="hero-title" className="surface-dark">
      {profile.heroDesktop && (
        // The photograph carries the large wordmark; the HTML heading stays smaller beside it
        // (plan §0.4). Never cropped: tall screens letterbox it instead.
        <HeroPicture
          desktop={profile.heroDesktop}
          mobile={profile.heroMobile}
          className="block h-auto max-h-[85svh] w-full object-contain"
        />
      )}
      <Container className="grid gap-8 py-12 sm:py-16 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="label-caps text-varnish">{profile.tagline}</p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-[2.25rem] leading-[1.05] font-medium tracking-[0.08em] uppercase sm:text-[3rem]"
          >
            {profile.displayName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
          <ButtonLink to="/music">Listen</ButtonLink>
          <ButtonLink to={BOOK_PATH} variant="outline">
            Book Roman
          </ButtonLink>
        </div>
      </Container>
      <StringsDivider />
    </section>
  );
}

function BiographyTeaser({ profile, number }: { profile: ProfileSummaryDto; number: number }) {
  return (
    <Section tone="light" label="Biography" number={number} hideTitle>
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className={profile.portrait ? 'lg:col-span-7' : 'lg:col-span-10'}>
          <p className="font-display text-[1.75rem] leading-[1.3] sm:text-[2rem]">
            {profile.shortBio}
          </p>
          <Link
            to="/about"
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium tracking-[0.14em] text-varnish-deep uppercase underline decoration-varnish-deep/40 underline-offset-[6px] hover:decoration-varnish-deep"
          >
            Read the full biography
          </Link>
        </div>
        {profile.portrait && (
          <div className="lg:col-span-5">
            <ResponsiveImage
              asset={profile.portrait.asset}
              alt={profile.portrait.alt}
              aspect={4 / 5}
              sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 40vw, 100vw"
              className="h-auto w-full rounded-sm"
            />
          </div>
        )}
      </div>
    </Section>
  );
}

function HeroSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="surface-dark">
      <Skeleton className="aspect-[2048/1215] max-h-[85svh] w-full rounded-none" />
      <Container className="py-12 sm:py-16">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-6 h-12 w-full max-w-xl" />
      </Container>
    </div>
  );
}

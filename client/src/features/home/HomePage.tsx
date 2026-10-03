import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import type { HomeDto, ProfileSummaryDto } from '@roman/shared';

import { BOOK_PATH } from '@/components/layout/navigation';
import { HeroPicture } from '@/components/media/HeroPicture';
import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { seoContext } from '@/components/seo/context';
import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { shareImage } from '@/components/seo/structuredData';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { StringsDivider } from '@/components/ui/StringsDivider';
import { EventList } from '@/features/events/EventList';
import { TrackList } from '@/features/music/TrackList';
import { VideoGallery } from '@/features/videos/VideoGallery';
import { getHome, queryKeys } from '@/lib/api/public';

import { BookingBand } from './BookingBand';

export function HomePage() {
  const home = useQuery({ queryKey: queryKeys.home, queryFn: getHome });
  const profile = home.data?.profile;

  return (
    <>
      <Seo
        {...PAGE_SEO.home}
        fullTitle={profile?.seo.metaTitle}
        description={profile?.seo.metaDescription ?? PAGE_SEO.home.description}
        image={profile && shareImage(profile, seoContext())}
      />
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

type HomeSection = 'music' | 'biography' | 'videos' | 'gallery' | 'events' | 'booking';

/** Stage (dark) or paper (light) per section; the closing band takes the opposite of the last. */
const TONES: Record<Exclude<HomeSection, 'booking'>, 'dark' | 'light'> = {
  music: 'dark',
  biography: 'light',
  videos: 'dark',
  gallery: 'light',
  events: 'dark',
};

/**
 * Order follows plan §6, except that videos come before the photo strip so stage and paper keep
 * alternating. Sections with no content are left out entirely (plan §12.5), and the movement
 * numbers follow the visible order.
 */
function HomeContent({ home }: { home: HomeDto }) {
  const { profile, featuredTracks, featuredVideos, featuredImages, upcomingEvents } = home;
  const present: Record<HomeSection, boolean> = {
    music: featuredTracks.length > 0,
    biography: true,
    videos: featuredVideos.length > 0,
    gallery: featuredImages.length > 0,
    events: upcomingEvents.length > 0,
    booking: true,
  };
  const order = (['music', 'biography', 'videos', 'gallery', 'events', 'booking'] as const).filter(
    (key) => present[key],
  );
  const number = (key: HomeSection) => order.indexOf(key) + 1;
  const lastSection = order.at(-2);
  const bookingTone =
    lastSection && lastSection !== 'booking' && TONES[lastSection] === 'dark' ? 'light' : 'dark';

  return (
    <>
      <Hero profile={profile} />
      {present.music && (
        <Section tone="dark" label="Music" number={number('music')} title="Listen">
          <TrackList tracks={featuredTracks} />
          <ArrowLink to="/music" className="mt-10">
            All music
          </ArrowLink>
        </Section>
      )}
      <BiographyTeaser profile={profile} number={number('biography')} />
      {present.videos && (
        <Section tone="dark" label="Videos" number={number('videos')} title="Watch">
          <VideoGallery videos={featuredVideos} />
          <ArrowLink to="/videos" className="mt-10">
            All videos
          </ArrowLink>
        </Section>
      )}
      {present.gallery && (
        <Section tone="light" label="Gallery" number={number('gallery')} title="Photographs">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {featuredImages.map((photo) => (
              <li key={photo.id}>
                <Link to="/gallery" className="group block overflow-hidden rounded-sm">
                  <ResponsiveImage
                    asset={photo.image}
                    alt={photo.alt}
                    aspect={1}
                    sizes="(min-width: 768px) 22vw, 45vw"
                    className="h-auto w-full transition-[transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] group-hover:brightness-105 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <ArrowLink to="/gallery" className="mt-10">
            Open the gallery
          </ArrowLink>
        </Section>
      )}
      {present.events && (
        <Section tone="dark" label="Performances" number={number('events')} title="Upcoming">
          <EventList events={upcomingEvents} />
          <ArrowLink to="/events" className="mt-10">
            All performances
          </ArrowLink>
        </Section>
      )}
      <BookingBand number={number('booking')} tone={bookingTone} />
    </>
  );
}

function Hero({ profile }: { profile: ProfileSummaryDto }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate surface-dark">
      {profile.heroDesktop && (
        // The photograph carries the large wordmark; the HTML heading stays smaller beside it
        // (plan §0.4). Never cropped: tall screens letterbox it, and the slow settle ends at the
        // natural size. Its lower edge fades into the stage, only as far as stays clear of the
        // baked-in wordmark at each size.
        <div className="relative overflow-hidden">
          <HeroPicture
            desktop={profile.heroDesktop}
            mobile={profile.heroMobile}
            className="block h-auto max-h-[85svh] w-full object-contain motion-safe:animate-kenburns"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-ebony to-transparent sm:h-10 lg:h-16"
          />
        </div>
      )}
      {/* A spotlight on the name, as on a stage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-72 bg-[radial-gradient(ellipse_55%_80%_at_18%_100%,rgb(192_122_53/0.16),transparent_70%)]"
      />
      <Container className="grid gap-8 py-12 sm:py-16 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="label-caps text-varnish motion-safe:animate-rise motion-safe:[animation-delay:100ms]">
            {profile.tagline}
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-[2.25rem] leading-[1.05] font-medium tracking-[0.08em] uppercase motion-safe:animate-rise motion-safe:[animation-delay:220ms] sm:text-[3rem]"
          >
            {profile.displayName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3 motion-safe:animate-rise motion-safe:[animation-delay:360ms] lg:col-span-4 lg:justify-end">
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
          <ArrowLink to="/about" className="mt-8">
            Read the full biography
          </ArrowLink>
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

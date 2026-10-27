import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, type ReactNode } from 'react';
import { Link } from 'react-router';

import type { HomeDto, ProfileSummaryDto } from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { seoContext } from '@/components/seo/context';
import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { shareImage } from '@/components/seo/structuredData';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { buttonClass } from '@/components/ui/buttonClass';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Section } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReveal } from '@/hooks/useReveal';
import { getHome, getProfile, queryKeys } from '@/lib/api/public';

import { HomeHero, HomeHeroSkeleton } from './HomeHero';
import { MakeMusicBand } from './MakeMusicBand';

// Below the fold, and some shared with their own pages: loaded after the first paint, so they don't
// count against the home page's initial JavaScript (plan §16 budget).
const TrackList = lazy(() =>
  import('@/features/music/TrackList').then((module) => ({ default: module.TrackList })),
);
const VideoGallery = lazy(() =>
  import('@/features/videos/VideoGallery').then((module) => ({ default: module.VideoGallery })),
);
const EventList = lazy(() =>
  import('@/features/events/EventList').then((module) => ({ default: module.EventList })),
);
const ServicesCarousel = lazy(() =>
  import('./ServicesCarousel').then((module) => ({ default: module.ServicesCarousel })),
);
const Showcase = lazy(() => import('./Showcase').then((module) => ({ default: module.Showcase })));

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
        <HomeHeroSkeleton />
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

type Tone = 'dark' | 'dark-raised';

/**
 * Order follows the reference design: hero, stats, about, what I do, songs I've played on, recent
 * videos, then the rest of the site's content and the closing invitation. Sections with no content
 * are left out entirely (plan §12.5), and the rest alternate between the two dark depths.
 */
function HomeContent({ home }: { home: HomeDto }) {
  const { profile, featuredTracks, featuredVideos, featuredImages, upcomingEvents } = home;
  // The full profile (socials, public phone) is shared with the footer, so this adds no request.
  const fullProfile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile }).data;
  const instagram = fullProfile?.socials.find((link) => link.platform === 'instagram');

  const sections: [boolean, (tone: Tone) => ReactNode][] = [
    [true, (tone) => <AboutTeaser key="about" profile={profile} tone={tone} />],
    [
      profile.services.length > 0,
      (tone) => (
        <Section
          key="services"
          tone={tone}
          id="what-i-do"
          label={profile.tagline}
          title="What I do"
        >
          <Suspense fallback={<Skeleton className="h-[32rem] rounded-3xl" />}>
            <ServicesCarousel services={profile.services} />
          </Suspense>
        </Section>
      ),
    ],
    [
      home.showcaseVideos.length > 0,
      (tone) => (
        <Section
          key="songs"
          tone={tone}
          id="songs"
          label="Featured work"
          title="Songs I’ve played on"
          intro="Choose a song to play it with sound."
        >
          <Suspense fallback={<Skeleton className="aspect-video rounded-2xl" />}>
            <Showcase videos={home.showcaseVideos} />
          </Suspense>
        </Section>
      ),
    ],
    [
      featuredVideos.length > 0,
      (tone) => (
        <Section key="videos" tone={tone} label="Videos" title="Recent videos">
          <Suspense fallback={<Skeleton className="aspect-video" />}>
            <VideoGallery videos={featuredVideos} />
          </Suspense>
          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink to="/videos">See all my work</ButtonLink>
            {instagram && (
              <a
                href={instagram.url}
                target="_blank"
                rel="me noopener noreferrer"
                className={buttonClass('outline')}
              >
                Follow me on Instagram<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </Section>
      ),
    ],
    [
      featuredTracks.length > 0,
      (tone) => (
        <Section key="music" tone={tone} label="Music" title="Listen">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <TrackList tracks={featuredTracks} />
          </Suspense>
          <ArrowLink to="/music" className="mt-10">
            All music
          </ArrowLink>
        </Section>
      ),
    ],
    [
      upcomingEvents.length > 0,
      (tone) => (
        <Section key="events" tone={tone} label="Performances" title="Upcoming">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <EventList events={upcomingEvents} />
          </Suspense>
          <ArrowLink to="/events" className="mt-10">
            All performances
          </ArrowLink>
        </Section>
      ),
    ],
    [
      featuredImages.length > 0,
      (tone) => (
        <Section key="gallery" tone={tone} label="Gallery" title="Photographs">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {featuredImages.map((photo) => (
              <li key={photo.id}>
                <Link to="/gallery" className="group block overflow-hidden rounded-xl">
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
      ),
    ],
    [
      home.sheetMusicCount > 0,
      (tone) => (
        <Section key="sheet-music" tone={tone} label="Sheet music" title="Scores for violin">
          <p className="max-w-2xl text-lg leading-relaxed text-(--muted)">
            Violin scores of songs I play. Browse them, or ask for the one you’d like.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink to="/sheet-music">Browse sheet music</ButtonLink>
            <ButtonLink to="/contact?type=sheet-music" variant="outline">
              Request a score
            </ButtonLink>
          </div>
        </Section>
      ),
    ],
  ];
  const visible = sections.filter(([present]) => present).map(([, render]) => render);
  const toneAt = (position: number): Tone => (position % 2 === 0 ? 'dark-raised' : 'dark');

  return (
    <>
      <HomeHero profile={profile} />
      <StatsRow stats={profile.stats} />
      {visible.map((render, position) => render(toneAt(position)))}
      <MakeMusicBand tone={toneAt(visible.length)} phone={fullProfile?.contact.phone} />
    </>
  );
}

/** The owner's figures under the hero ("15+ years · as a violinist"). Hidden when there are none. */
function StatsRow({ stats }: { stats: ProfileSummaryDto['stats'] }) {
  if (stats.length === 0) return null;
  return (
    <section aria-label="At a glance" className="surface-dark">
      <Container className="pt-4 pb-16 sm:pb-20">
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={`${stat.value}-${stat.label}`} className="border-t border-snow/20 pt-6">
              <p className="font-display text-[2rem] leading-tight font-semibold">{stat.value}</p>
              <p className="mt-2 label-caps text-fog">{stat.label}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Portrait beside the short biography, with a link to the full story. */
function AboutTeaser({ profile, tone }: { profile: ProfileSummaryDto; tone: Tone }) {
  const [revealRef, revealState] = useReveal();
  return (
    <section
      aria-labelledby="about-teaser-title"
      className={`${tone === 'dark' ? 'surface-dark' : 'surface-dark-raised'} stage-light`}
    >
      <Container className="py-20 sm:py-24 lg:py-28">
        <div
          ref={revealRef}
          data-reveal={revealState}
          className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16"
        >
          {profile.portrait && (
            <div className="lg:col-span-5">
              <ResponsiveImage
                asset={profile.portrait.asset}
                alt={profile.portrait.alt}
                aspect={4 / 5}
                sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 40vw, 100vw"
                className="h-auto w-full rounded-2xl"
              />
            </div>
          )}
          <div className={profile.portrait ? 'lg:col-span-7' : 'lg:col-span-10'}>
            <p className="eyebrow" aria-hidden="true">
              {profile.displayName}
            </p>
            <h2
              id="about-teaser-title"
              className="mt-4 font-display text-[2.25rem] leading-[1.1] sm:text-[3.25rem]"
            >
              About me
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-(--muted)">{profile.shortBio}</p>
            <ButtonLink to="/about" variant="outline" className="mt-9">
              Read my story
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

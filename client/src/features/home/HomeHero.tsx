import type { ProfileSummaryDto } from '@roman/shared';

import { BOOK_PATH } from '@/components/layout/navigation';
import { HeroPicture } from '@/components/media/HeroPicture';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

// The hero slides up under the transparent header (h-16, sm:h-20), so the photo starts at the top
// of the screen as on the reference design.
const UNDER_HEADER = '-mt-16 sm:-mt-20';

/**
 * Full-bleed stage photo with the headline at the bottom left. Copy comes from the profile: the
 * headline falls back to the name, the introduction to the short biography. Motion is slight and
 * motion-safe only: the photo settles, a crimson rule draws in, the text rises in turn.
 */
export function HomeHero({ profile }: { profile: ProfileSummaryDto }) {
  const headline = profile.heroHeadline ?? profile.displayName;
  const intro = profile.heroIntro ?? profile.shortBio;

  return (
    <section
      aria-labelledby="hero-title"
      className={`relative isolate flex min-h-svh flex-col justify-end overflow-hidden surface-dark stage-light ${UNDER_HEADER}`}
    >
      {profile.heroDesktop && (
        <div className="absolute inset-0 -z-10">
          <HeroPicture
            desktop={profile.heroDesktop}
            mobile={profile.heroMobile}
            className="size-full object-cover object-[50%_20%] motion-safe:animate-kenburns"
          />
          <div aria-hidden="true" className="absolute inset-0 hero-shade" />
        </div>
      )}
      <Container className="pt-32 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-4xl">
          <p className="flex items-center gap-4 text-sm font-medium tracking-[0.08em] text-snow/90 uppercase motion-safe:animate-rise motion-safe:[animation-delay:150ms]">
            <span
              aria-hidden="true"
              className="h-px w-8 origin-left bg-crimson motion-safe:animate-draw motion-safe:[animation-delay:350ms]"
            />
            {profile.tagline}
          </p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-[2.75rem] leading-[1.02] font-semibold text-balance motion-safe:animate-rise motion-safe:[animation-delay:280ms] sm:text-[4rem] lg:text-[5.25rem]"
          >
            {headline}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-snow/90 motion-safe:animate-rise motion-safe:[animation-delay:420ms]">
              {intro}
            </p>
          )}
          <div className="mt-9 motion-safe:animate-rise motion-safe:[animation-delay:560ms]">
            <ButtonLink to={BOOK_PATH}>
              Book me <span aria-hidden="true">→</span>
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function HomeHeroSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex min-h-svh flex-col justify-end surface-dark stage-light ${UNDER_HEADER}`}
    >
      <Container className="pt-32 pb-16 sm:pb-20 lg:pb-24">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-6 h-14 w-full max-w-3xl" />
        <Skeleton className="mt-6 h-5 w-full max-w-xl" />
        <Skeleton className="mt-9 h-12 w-36 rounded-full" />
      </Container>
    </div>
  );
}

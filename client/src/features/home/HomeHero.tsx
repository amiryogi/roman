import { Fragment, useEffect, useState } from 'react';

import type { ProfileSummaryDto } from '@roman/shared';

import { BOOK_PATH } from '@/components/layout/navigation';
import { HeroPicture } from '@/components/media/HeroPicture';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

// The hero slides up under the transparent header (h-16, sm:h-20), so the photo starts at the top
// of the screen as on the reference design.
const UNDER_HEADER = '-mt-16 sm:-mt-20';

/** On a slow connection the text doesn't wait longer than this for the photo. */
const MAX_WAIT_MS = 2500;
/** Seconds between headline words rising in. */
const WORD_STAGGER = 0.07;

function seconds(value: number): string {
  return `${value.toFixed(2)}s`;
}

/**
 * Full-bleed stage photo with the headline at the bottom left. Copy comes from the profile: the
 * headline falls back to the name, the introduction to the short biography.
 *
 * Entrance (after the reference design; CSS in styles/index.css, motion-safe only): once the photo
 * has loaded, it slowly zooms out to its full frame while the text rises in, the headline word by
 * word from behind a mask. Until then the hero waits (`data-hero="wait"`), so photo and text start
 * together. With reduced motion everything is simply there.
 */
export function HomeHero({ profile }: { profile: ProfileSummaryDto }) {
  const headline = profile.heroHeadline ?? profile.displayName;
  const intro = profile.heroIntro ?? profile.shortBio;
  const words = headline.split(/\s+/).filter(Boolean);
  const [ready, setReady] = useState(!profile.heroDesktop);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => {
      setReady(true);
    }, MAX_WAIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [ready]);

  const textStart = 0.2 + words.length * WORD_STAGGER;

  return (
    <section
      aria-labelledby="hero-title"
      data-hero={ready ? 'play' : 'wait'}
      className={`relative isolate flex min-h-svh flex-col justify-end overflow-hidden surface-dark stage-light ${UNDER_HEADER}`}
    >
      {profile.heroDesktop && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <HeroPicture
            desktop={profile.heroDesktop}
            mobile={profile.heroMobile}
            onReady={() => {
              setReady(true);
            }}
            className="hero-photo size-full object-cover object-[50%_20%]"
          />
          <div aria-hidden="true" className="absolute inset-0 hero-shade" />
        </div>
      )}
      <Container className="pt-32 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-4xl">
          <p
            className="hero-rise flex items-center gap-4 text-sm font-medium tracking-[0.08em] text-snow/90 uppercase"
            style={{ animationDelay: '0.1s' }}
          >
            <span
              aria-hidden="true"
              className="hero-rule h-px w-8 bg-crimson"
              style={{ animationDelay: '0.3s' }}
            />
            {profile.tagline}
          </p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-[2.75rem] leading-[1.02] font-semibold text-balance sm:text-[4rem] lg:text-[5.25rem]"
          >
            {words.map((word, index) => (
              // Each word rises from behind its own mask. The spaces are plain text directly in
              // the heading (not inside a word's span, where they'd be trimmed from its name), so
              // it reads as one sentence.
              <Fragment key={index}>
                {index > 0 && ' '}
                <span className="hero-word">
                  <span style={{ animationDelay: seconds(0.2 + index * WORD_STAGGER) }}>
                    {word}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          {intro && (
            <p
              className="hero-rise mt-6 max-w-2xl text-lg leading-relaxed text-snow/90"
              style={{ animationDelay: seconds(textStart) }}
            >
              {intro}
            </p>
          )}
          <div className="hero-rise mt-9" style={{ animationDelay: seconds(textStart + 0.15) }}>
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

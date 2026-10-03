import { useQuery } from '@tanstack/react-query';

import type { ProfileDto } from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { seoContext } from '@/components/seo/context';
import { JsonLd } from '@/components/seo/JsonLd';
import { PAGE_SEO } from '@/components/seo/pages';
import { Seo } from '@/components/seo/Seo';
import { personJsonLd, shareImage } from '@/components/seo/structuredData';
import { SITE_NAME } from '@/components/seo/site';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { Section, type SectionTone } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingBand } from '@/features/home/BookingBand';
import { getProfile, queryKeys } from '@/lib/api/public';

import {
  musicalJourney,
  teachingExperience,
  visibleAboutSections,
  type AboutSectionKey,
} from './aboutSections';

/** Plain-text bodies keep the owner's paragraph breaks (no rich text, plan ADR-11). */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function AboutPage() {
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });

  return (
    <>
      <Seo {...PAGE_SEO.about} image={profile.data && shareImage(profile.data, seoContext())} />
      {profile.data && <JsonLd items={[personJsonLd(profile.data, seoContext())]} />}
      <header className="surface-light">
        <Container className="pt-16 pb-4 sm:pt-24">
          <p className="label-caps text-(--accent)">{SITE_NAME}</p>
          <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
            About
          </h1>
          {profile.data && (
            <p className="mt-6 max-w-2xl text-lg text-(--muted)">{profile.data.tagline}</p>
          )}
        </Container>
      </header>

      {profile.isPending ? (
        <div role="status" aria-label="Loading" className="surface-light">
          <Container className="space-y-4 py-16">
            <Skeleton className="h-6 w-full max-w-2xl" />
            <Skeleton className="h-6 w-full max-w-xl" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </Container>
        </div>
      ) : profile.isError ? (
        <div className="surface-light">
          <Container>
            <ErrorState
              error={profile.error}
              onRetry={() => {
                void profile.refetch();
              }}
            />
          </Container>
        </div>
      ) : (
        <AboutSections profile={profile.data} />
      )}
    </>
  );
}

/** Paper and stage alternate down the page (plan §7.1), starting on paper under the header. */
function toneAt(index: number): SectionTone {
  return index % 2 === 0 ? 'light' : 'dark';
}

function AboutSections({ profile }: { profile: ProfileDto }) {
  const sections = visibleAboutSections(profile);

  const render = (key: AboutSectionKey, index: number) => {
    const common = { tone: toneAt(index), number: index + 1 };
    switch (key) {
      case 'biography':
        return (
          <Section key={key} {...common} label="Biography" hideTitle>
            <Biography profile={profile} />
          </Section>
        );
      case 'journey':
        return (
          <Section key={key} {...common} label="Musical journey">
            <Journey profile={profile} />
          </Section>
        );
      case 'teaching':
        return (
          <Section key={key} {...common} label="Teaching">
            <Teaching profile={profile} />
          </Section>
        );
      case 'achievements':
        return (
          <Section key={key} {...common} label="Achievements">
            <ul className="grid max-w-3xl gap-8">
              {profile.achievements.map((item, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[6rem_1fr] sm:gap-8">
                  <span className="text-sm text-(--muted) tabular-nums">{item.year}</span>
                  <div>
                    <p className="text-lg font-medium">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 leading-relaxed text-(--muted)">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        );
      case 'philosophy':
        return (
          <Section key={key} {...common} label="Musical philosophy" hideTitle>
            <blockquote className="max-w-3xl space-y-6 font-display text-[1.75rem] leading-[1.35] sm:text-[2rem]">
              {paragraphs(profile.philosophy ?? '').map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </blockquote>
          </Section>
        );
      case 'skills':
        return (
          <Section key={key} {...common} label="Skills and affiliations">
            <SkillsAndAffiliations profile={profile} />
          </Section>
        );
    }
  };

  return (
    <>
      {sections.map(render)}
      <BookingBand tone={toneAt(sections.length)} />
    </>
  );
}

function Biography({ profile }: { profile: ProfileDto }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-7">
        {profile.biography.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h3 className="mb-4 font-display text-[1.75rem] leading-tight font-medium">
                {section.heading}
              </h3>
            )}
            <div className="space-y-5 text-lg leading-relaxed">
              {paragraphs(section.body).map((text, j) => (
                <p key={j}>{text}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {profile.portrait && (
        <div className="lg:col-span-5">
          <ResponsiveImage
            asset={profile.portrait.asset}
            alt={profile.portrait.alt}
            aspect={4 / 5}
            sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 40vw, 100vw"
            className="h-auto w-full rounded-sm lg:sticky lg:top-28"
          />
        </div>
      )}
    </div>
  );
}

function Journey({ profile }: { profile: ProfileDto }) {
  return (
    <ol className="divide-y divide-current/15 border-y border-current/15">
      {musicalJourney(profile).map((entry, i) => (
        <li key={i} className="timeline-string grid gap-2 py-8 md:grid-cols-12 md:gap-8">
          <p className="text-sm text-(--muted) tabular-nums md:col-span-3">{entry.period}</p>
          <div className="md:col-span-9">
            <p className="label-caps text-(--accent)">{entry.kind}</p>
            <h3 className="mt-2 font-display text-[1.75rem] leading-tight font-medium">
              {entry.title}
            </h3>
            {entry.place && <p className="mt-1 text-(--muted)">{entry.place}</p>}
            {entry.highlights.length > 0 && (
              <ul className="mt-4 space-y-2 text-(--muted)">
                {entry.highlights.map((highlight, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-(--accent)" />
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Teaching({ profile }: { profile: ProfileDto }) {
  return (
    <ol className="divide-y divide-current/15 border-y border-current/15">
      {teachingExperience(profile).map((item, i) => (
        <li key={i} className="timeline-string grid gap-2 py-8 md:grid-cols-12 md:gap-8">
          <p className="text-sm text-(--muted) tabular-nums md:col-span-3">{item.period}</p>
          <div className="md:col-span-9">
            <h3 className="text-xl font-medium">{item.role}</h3>
            <p className="mt-1 text-(--muted)">
              {[item.organization, item.location].filter(Boolean).join(', ')}
            </p>
            {item.highlights.length > 0 && (
              <ul className="mt-4 space-y-2">
                {item.highlights.map((highlight, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-(--accent)" />
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SkillsAndAffiliations({ profile }: { profile: ProfileDto }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      {profile.skills.length > 0 && (
        <div className="lg:col-span-7">
          <h3 className="label-caps text-(--muted)">Skills</h3>
          <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {profile.skills.map((skill) => (
              <li key={skill} className="border-t border-current/15 pt-4 text-lg">
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}
      {profile.affiliations.length > 0 && (
        <div className="lg:col-span-5">
          <h3 className="label-caps text-(--muted)">Affiliations</h3>
          <ul className="mt-6 space-y-4">
            {profile.affiliations.map((affiliation) => (
              <li key={affiliation.name} className="border-t border-current/15 pt-4">
                <p className="text-lg">{affiliation.name}</p>
                {affiliation.since && (
                  <p className="text-sm text-(--muted)">Since {affiliation.since}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

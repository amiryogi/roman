import type { ProfileDto } from '@roman/shared';

import { startYear } from '@/lib/format';

export interface JourneyEntry {
  kind: 'Performance' | 'Training';
  period: string;
  title: string;
  /** Organisation or institution, with the place when known. */
  place?: string;
  highlights: string[];
}

function joinPlace(...parts: (string | undefined)[]): string | undefined {
  const text = parts.filter(Boolean).join(', ');
  return text === '' ? undefined : text;
}

/**
 * Performance milestones and training, oldest first: the musical journey (plan §6). Teaching has
 * its own section, and "other" experience (e.g. journalism) isn't shown publicly (plan ASM-6).
 * Entries without a recognisable year keep their place at the end.
 */
export function musicalJourney(
  profile: Pick<ProfileDto, 'education' | 'experience'>,
): JourneyEntry[] {
  const entries: JourneyEntry[] = [
    ...profile.education.map((item) => ({
      kind: 'Training' as const,
      period: item.year,
      title: item.title,
      place: joinPlace(item.institution, item.location),
      highlights: [],
    })),
    ...profile.experience
      .filter((item) => item.category === 'performance')
      .map((item) => ({
        kind: 'Performance' as const,
        period: item.period,
        title: item.role,
        place: joinPlace(item.organization, item.location),
        highlights: item.highlights,
      })),
  ];
  // Array.prototype.sort is stable, so equal years keep their order (training before performance).
  return entries.sort(
    (a, b) =>
      (startYear(a.period) ?? Number.POSITIVE_INFINITY) -
      (startYear(b.period) ?? Number.POSITIVE_INFINITY),
  );
}

export function teachingExperience(profile: Pick<ProfileDto, 'experience'>) {
  return profile.experience.filter((item) => item.category === 'teaching');
}

export type AboutSectionKey =
  'biography' | 'journey' | 'teaching' | 'achievements' | 'philosophy' | 'skills';

/**
 * The About sections that have content, in page order. Empty sections are left out rather than
 * shown with placeholder text (plan §6): achievements and philosophy stay hidden until the owner
 * fills them in.
 */
export function visibleAboutSections(profile: ProfileDto): AboutSectionKey[] {
  const present: Record<AboutSectionKey, boolean> = {
    biography: profile.biography.length > 0,
    journey: musicalJourney(profile).length > 0,
    teaching: teachingExperience(profile).length > 0,
    achievements: profile.achievements.length > 0,
    philosophy: Boolean(profile.philosophy),
    skills: profile.skills.length > 0 || profile.affiliations.length > 0,
  };
  const order: AboutSectionKey[] = [
    'biography',
    'journey',
    'teaching',
    'achievements',
    'philosophy',
    'skills',
  ];
  return order.filter((key) => present[key]);
}

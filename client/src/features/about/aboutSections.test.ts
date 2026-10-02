import { describe, expect, it } from 'vitest';

import { profileFixture } from '@/test/fixtures';
import { startYear, toRoman } from '@/lib/format';

import { musicalJourney, teachingExperience, visibleAboutSections } from './aboutSections';

describe('musicalJourney', () => {
  it('merges training and performances oldest first, without teaching or other work', () => {
    const journey = musicalJourney(profileFixture());

    expect(journey.map((entry) => [entry.period, entry.kind, entry.title])).toEqual([
      ['2008', 'Performance', 'Festival performance'],
      ['2012 – Present', 'Performance', 'First Violin'],
      ['2013', 'Training', 'Grade exam'],
    ]);
    expect(journey[2]?.place).toBe('Test Board, London');
  });

  it('keeps training before performances in the same year', () => {
    const journey = musicalJourney(
      profileFixture({
        education: [{ year: '2008 – 2009', title: 'Lessons' }],
      }),
    );

    expect(journey.slice(0, 2).map((entry) => entry.kind)).toEqual(['Training', 'Performance']);
  });
});

describe('visibleAboutSections', () => {
  it('hides achievements and philosophy while they are empty', () => {
    expect(visibleAboutSections(profileFixture())).toEqual([
      'biography',
      'journey',
      'teaching',
      'skills',
    ]);
  });

  it('shows them once the owner fills them in', () => {
    const profile = profileFixture({
      achievements: [{ title: 'An award' }],
      philosophy: 'Music is a conversation.',
    });

    expect(visibleAboutSections(profile)).toEqual([
      'biography',
      'journey',
      'teaching',
      'achievements',
      'philosophy',
      'skills',
    ]);
  });

  it('leaves out every section without content', () => {
    const empty = profileFixture({
      biography: [],
      education: [],
      experience: [],
      skills: [],
      affiliations: [],
    });

    expect(visibleAboutSections(empty)).toEqual([]);
    expect(teachingExperience(empty)).toEqual([]);
  });
});

describe('format', () => {
  it('writes movement numbers', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 14].map(toRoman)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'IX',
      'X',
      'XIV',
    ]);
  });

  it('reads the first year of a period', () => {
    expect(startYear('2019 – 2023')).toBe(2019);
    expect(startYear('2012 – Present')).toBe(2012);
    expect(startYear('Present')).toBeUndefined();
  });
});

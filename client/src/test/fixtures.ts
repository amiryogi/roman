import {
  homeDtoSchema,
  profileDtoSchema,
  type HomeDto,
  type MediaAssetDto,
  type ProfileDto,
} from '@roman/shared';

// Test fixtures only: neutral placeholder data, not facts about Roman. Parsed with the shared
// schemas so they can't drift from the API contract.

export function imageAsset(overrides: Partial<MediaAssetDto> = {}): MediaAssetDto {
  return {
    publicId: 'root/profile/photo',
    resourceType: 'image',
    version: 1,
    format: 'jpg',
    bytes: 1000,
    width: 2000,
    height: 1200,
    dominantColor: '#334455',
    ...overrides,
  };
}

export function profileFixture(overrides: Partial<ProfileDto> = {}): ProfileDto {
  return profileDtoSchema.parse({
    displayName: 'Test Artist',
    tagline: 'Violinist · Teacher',
    shortBio: 'A short biography used only in tests.',
    biography: [
      { body: 'First paragraph.\n\nSecond paragraph.' },
      { heading: 'Training', body: 'About training.' },
    ],
    education: [
      { year: '2013', title: 'Grade exam', institution: 'Test Board', location: 'London' },
    ],
    experience: [
      {
        period: '2019 – 2023',
        role: 'Instructor',
        organization: 'Test School',
        category: 'teaching',
        highlights: ['Taught classes'],
      },
      {
        period: '2012 – Present',
        role: 'First Violin',
        organization: 'Test Orchestra',
        category: 'performance',
        highlights: [],
      },
      {
        period: '2008',
        role: 'Festival performance',
        organization: 'Test Festival',
        category: 'performance',
        highlights: [],
      },
      {
        period: '2012',
        role: 'Intern Writer',
        organization: 'Test Magazine',
        category: 'other',
        highlights: [],
      },
    ],
    achievements: [],
    skills: ['Violin performance', 'Teaching'],
    affiliations: [{ name: 'Test Trust', since: '2010' }],
    contact: { publicEmail: 'artist@example.com' },
    socials: [],
    seo: {},
    portrait: {
      asset: imageAsset({ publicId: 'root/profile/portrait' }),
      alt: 'Portrait of the artist',
    },
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

export function homeFixture(overrides: Partial<HomeDto> = {}): HomeDto {
  const profile = profileFixture();
  return homeDtoSchema.parse({
    profile: {
      displayName: profile.displayName,
      tagline: profile.tagline,
      shortBio: profile.shortBio,
      portrait: profile.portrait,
      heroDesktop: { asset: imageAsset({ publicId: 'root/profile/hero' }), alt: 'Artist on stage' },
    },
    featuredTracks: [],
    featuredVideos: [],
    featuredImages: [],
    upcomingEvents: [],
    ...overrides,
  });
}

import {
  eventDtoSchema,
  galleryImageDtoSchema,
  homeDtoSchema,
  profileDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
  type EventDto,
  type GalleryImageDto,
  type HomeDto,
  type MediaAssetDto,
  type ProfileDto,
  type TrackDto,
  type VideoDto,
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

export function trackFixture(overrides: Partial<TrackDto> = {}): TrackDto {
  return trackDtoSchema.parse({
    id: 'track-1',
    title: 'Test track',
    slug: 'test-track',
    artistCredit: 'Test Artist',
    audio: {
      publicId: 'root/music/audio/test-track',
      resourceType: 'video',
      version: 1,
      format: 'mp3',
      bytes: 1000,
      duration: 225,
    },
    duration: 225,
    tags: [],
    status: 'published',
    featured: false,
    sortOrder: 1,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

export function youtubeVideoFixture(overrides: Partial<VideoDto> = {}): VideoDto {
  return videoDtoSchema.parse({
    id: 'video-yt',
    title: 'Concert excerpt',
    slug: 'concert-excerpt',
    source: 'youtube',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'performance',
    status: 'published',
    featured: false,
    sortOrder: 1,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

export function uploadedVideoFixture(overrides: Partial<VideoDto> = {}): VideoDto {
  return videoDtoSchema.parse({
    id: 'video-up',
    title: 'Studio take',
    slug: 'studio-take',
    source: 'cloudinary',
    media: {
      publicId: 'root/videos/media/take',
      resourceType: 'video',
      version: 3,
      format: 'mp4',
      bytes: 9_000_000,
      width: 1920,
      height: 1080,
      duration: 95,
    },
    duration: 95,
    category: 'studio',
    status: 'published',
    featured: false,
    sortOrder: 2,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

export function photoFixture(overrides: Partial<GalleryImageDto> = {}): GalleryImageDto {
  return galleryImageDtoSchema.parse({
    id: 'photo-1',
    image: imageAsset({ publicId: 'root/gallery/photo-1', width: 1200, height: 1600 }),
    alt: 'Violinist on stage',
    category: 'performance',
    status: 'published',
    featured: false,
    sortOrder: 1,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

export function eventFixture(overrides: Partial<EventDto> = {}): EventDto {
  return eventDtoSchema.parse({
    id: 'event-1',
    title: 'Autumn Recital',
    slug: 'autumn-recital',
    startsAt: '2026-11-14T13:15:00.000Z',
    endsAt: '2026-11-14T15:15:00.000Z',
    timezone: 'Asia/Kathmandu',
    venue: { name: 'City Hall', city: 'Kathmandu', country: 'Nepal' },
    eventStatus: 'scheduled',
    ticketUrl: 'https://tickets.example.com/autumn',
    status: 'published',
    featured: false,
    createdAt: '2026-10-02T12:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  });
}

import { Types } from 'mongoose';

import type { MediaAssetDoc } from '../src/lib/mongo.js';
import { AlbumModel, type AlbumDoc } from '../src/modules/albums/model.js';
import { AdminModel } from '../src/modules/auth/admin.model.js';
import { EventModel, type EventDoc } from '../src/modules/events/model.js';
import { GalleryImageModel, type GalleryImageDoc } from '../src/modules/gallery/model.js';
import { InquiryModel, type InquiryDoc } from '../src/modules/inquiries/model.js';
import { ProfileModel, type ProfileDoc } from '../src/modules/profile/model.js';
import { TrackModel, type TrackDoc } from '../src/modules/tracks/model.js';
import { VideoModel, type VideoDoc } from '../src/modules/videos/model.js';

let counter = 0;
function next(): number {
  counter += 1;
  return counter;
}

// Test fixtures only: neutral placeholder data, not facts about Roman.

export function imageAsset(overrides: Partial<MediaAssetDoc> = {}): MediaAssetDoc {
  return {
    publicId: `roman-budhathoki/test/gallery/img-${String(next())}`,
    resourceType: 'image',
    version: 1_700_000_000,
    format: 'jpg',
    bytes: 250_000,
    width: 2000,
    height: 1333,
    dominantColor: '#2b2118',
    ...overrides,
  };
}

export function audioAsset(overrides: Partial<MediaAssetDoc> = {}): MediaAssetDoc {
  return {
    publicId: `roman-budhathoki/test/music/audio/track-${String(next())}`,
    resourceType: 'video',
    version: 1_700_000_000,
    format: 'mp3',
    bytes: 1_375_424,
    duration: 85.9,
    ...overrides,
  };
}

export function createAdmin() {
  return AdminModel.create({
    email: `admin${String(next())}@example.com`,
    passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$placeholder',
    name: 'Test Admin',
  });
}

export function createProfile(overrides: Partial<ProfileDoc> = {}) {
  return ProfileModel.create({
    displayName: 'Test Artist',
    tagline: 'Violinist',
    shortBio: 'A short biography used only in tests.',
    biography: [{ body: 'Paragraph one.' }, { heading: 'Training', body: 'Paragraph two.' }],
    education: [{ year: '2013', title: 'Grade exam', institution: 'Test Board' }],
    experience: [
      {
        period: '2019 – 2023',
        role: 'Instructor',
        organization: 'Test School',
        category: 'teaching',
        highlights: ['Taught classes'],
      },
    ],
    achievements: [],
    skills: ['Violin performance'],
    affiliations: [{ name: 'Test Trust', since: '2010' }],
    contact: { publicEmail: 'artist@example.com', phone: '+977 9800000000', showPhone: false },
    socials: [{ platform: 'youtube', url: 'https://www.youtube.com/@example' }],
    portrait: { asset: imageAsset(), alt: 'Portrait of the artist with a violin' },
    seo: {},
    ...overrides,
  });
}

export function createAlbum(overrides: Partial<AlbumDoc> = {}) {
  const n = next();
  return AlbumModel.create({
    title: `Album ${String(n)}`,
    slug: `album-${String(n)}`,
    externalLinks: [],
    ...overrides,
  });
}

export function createTrack(overrides: Partial<TrackDoc> = {}) {
  const n = next();
  return TrackModel.create({
    title: `Track ${String(n)}`,
    slug: `track-${String(n)}`,
    audio: audioAsset(),
    ...overrides,
  });
}

export function createVideo(overrides: Partial<VideoDoc> = {}) {
  const n = next();
  return VideoModel.create({
    title: `Video ${String(n)}`,
    slug: `video-${String(n)}`,
    source: 'youtube',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'performance',
    ...overrides,
  });
}

export function createGalleryImage(overrides: Partial<GalleryImageDoc> = {}) {
  return GalleryImageModel.create({
    image: imageAsset(),
    alt: 'Violinist performing on stage',
    category: 'performance',
    ...overrides,
  });
}

export function createEvent(overrides: Partial<EventDoc> = {}) {
  const n = next();
  return EventModel.create({
    title: `Concert ${String(n)}`,
    slug: `concert-${String(n)}`,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    venue: { name: 'Test Hall', city: 'Kathmandu', country: 'Nepal' },
    ...overrides,
  });
}

export function createInquiry(overrides: Partial<InquiryDoc> = {}) {
  return InquiryModel.create({
    name: 'Test Visitor',
    email: 'visitor@example.com',
    inquiryType: 'booking',
    eventType: 'wedding',
    message: 'We would like to book a violinist.',
    meta: { ipHash: 'a'.repeat(64) },
    ...overrides,
  });
}

export function objectId(): Types.ObjectId {
  return new Types.ObjectId();
}

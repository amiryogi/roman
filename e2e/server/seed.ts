import { hashPassword } from '../../server/src/lib/password.js';
import { AdminModel } from '../../server/src/modules/auth/admin.model.js';
import {
  createEvent,
  createGalleryImage,
  createProfile,
  createSheetMusic,
  createTrack,
  createVideo,
  imageAsset,
} from '../../server/test/factories.js';

import { E2E_ADMIN, SEEDED } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Neutral content for the E2E run: published items, plus drafts that must stay hidden. */
export async function seed(): Promise<void> {
  await AdminModel.create({
    email: E2E_ADMIN.email,
    name: E2E_ADMIN.name,
    passwordHash: await hashPassword(E2E_ADMIN.password),
  });

  await createProfile({
    displayName: SEEDED.artist,
    heroDesktop: {
      asset: imageAsset({
        publicId: 'roman-budhathoki/test/profile/hero',
        // The shape of the real hero photo (romanhero.JPG, portrait).
        width: 1541,
        height: 2048,
      }),
      alt: 'The artist on stage with a violin',
    },
    heroHeadline: SEEDED.heroHeadline,
    stats: [SEEDED.stat],
    services: [
      {
        title: SEEDED.service,
        kicker: 'On stage',
        summary: 'Plays at test events.',
        details: [{ label: 'Where', value: 'Test halls' }],
        cta: { label: 'Send a request', inquiryType: 'booking' },
      },
    ],
  });

  const [first, second, third] = SEEDED.tracks;
  await createTrack({ title: first, slug: 'evening-raga', status: 'published', featured: true });
  await createTrack({ title: second, slug: 'morning-etude', status: 'published' });
  await createTrack({ title: third, slug: 'folk-medley', status: 'published' });
  await createTrack({ title: SEEDED.draftTrack, slug: 'unreleased-sketch', status: 'draft' });

  const [hall, studio] = SEEDED.videos;
  await createVideo({
    title: hall,
    slug: 'hall-recital',
    category: 'performance',
    status: 'published',
    featured: true,
  });
  await createVideo({
    title: studio,
    slug: 'studio-session',
    category: 'studio',
    status: 'published',
  });
  await createVideo({
    title: SEEDED.showcaseVideo,
    slug: 'film-song',
    description: 'From a test film',
    category: 'studio',
    status: 'published',
    showcase: true,
  });

  const [waltz, reel] = SEEDED.scores;
  await createSheetMusic({
    title: waltz,
    slug: 'test-waltz',
    artist: 'A Composer',
    level: 'beginner',
    status: 'published',
  });
  await createSheetMusic({ title: reel, slug: 'test-reel', status: 'published' });
  await createSheetMusic({ title: SEEDED.draftScore, slug: 'unfinished-score', status: 'draft' });

  await createGalleryImage({
    alt: SEEDED.photos.performance,
    category: 'performance',
    status: 'published',
    featured: true,
  });
  await createGalleryImage({
    alt: SEEDED.photos.portrait,
    category: 'portrait',
    status: 'published',
  });
  await createGalleryImage({ alt: SEEDED.photos.draft, category: 'performance', status: 'draft' });

  await createEvent({
    title: SEEDED.upcomingEvent,
    slug: 'autumn-recital',
    startsAt: new Date(Date.now() + 30 * DAY_MS),
    status: 'published',
  });
  await createEvent({
    title: SEEDED.pastEvent,
    slug: 'spring-gala',
    startsAt: new Date(Date.now() - 30 * DAY_MS),
    status: 'published',
  });
  await createEvent({
    title: SEEDED.draftEvent,
    slug: 'secret-rehearsal',
    startsAt: new Date(Date.now() + 10 * DAY_MS),
    status: 'draft',
  });
}

import { hashPassword } from '../../server/src/lib/password.js';
import { AdminModel } from '../../server/src/modules/auth/admin.model.js';
import {
  createEvent,
  createGalleryImage,
  createProfile,
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
        width: 2048,
        height: 1215,
      }),
      alt: 'The artist on stage with a violin',
    },
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

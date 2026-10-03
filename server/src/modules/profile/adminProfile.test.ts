import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  adminStatsDtoSchema,
  apiErrorBodySchema,
  apiSuccessSchema,
  profileAdminDtoSchema,
  profileDtoSchema,
  type MediaRef,
  type ProfileInput,
} from '@roman/shared';

import { createTestApp, createTestMedia } from '../../../test/app.js';
import { adminAccessToken } from '../../../test/auth.js';
import { useTestDb } from '../../../test/db.js';
import {
  createAlbum,
  createEvent,
  createGalleryImage,
  createInquiry,
  createTrack,
  createVideo,
} from '../../../test/factories.js';
import type { FakeMediaService } from '../../services/media/fakeMediaService.js';

useTestDb();

const adminProfileResponse = apiSuccessSchema(profileAdminDtoSchema);

describe('admin profile', () => {
  let media: FakeMediaService;
  let app: ReturnType<typeof createTestApp>;
  let token: string;

  beforeEach(async () => {
    media = createTestMedia();
    app = createTestApp(media);
    token = await adminAccessToken(app);
  });

  const get = () => request(app).get('/api/admin/profile').set('Authorization', `Bearer ${token}`);
  const put = (body: object) =>
    request(app).put('/api/admin/profile').set('Authorization', `Bearer ${token}`).send(body);

  function uploaded(): MediaRef {
    const { publicId } = media.simulateUpload('profile');
    return { publicId, resourceType: 'image' };
  }

  // Neutral test data, not facts about Roman.
  function fullProfile(overrides: Partial<ProfileInput> = {}): ProfileInput {
    return {
      displayName: 'Test Artist',
      tagline: 'Violinist · Teacher',
      shortBio: 'A short biography used only in tests.',
      biography: [{ body: 'First paragraph.' }, { heading: 'Training', body: 'Second paragraph.' }],
      education: [
        { year: '2013', title: 'Grade exam', institution: 'Test Board', location: 'London' },
      ],
      experience: [
        {
          period: '2019 – 2023',
          role: 'Instructor',
          organization: 'Test School',
          location: 'Kathmandu',
          category: 'teaching',
          highlights: ['Taught classes', 'Led the ensemble'],
        },
      ],
      achievements: [{ year: '2020', title: 'An award', description: 'For testing.' }],
      philosophy: 'Music is a conversation.',
      skills: ['Violin performance', 'Teaching'],
      affiliations: [{ name: 'Test Trust', since: '2010' }],
      contact: {
        publicEmail: 'artist@example.com',
        phone: '+977 9800000000',
        showPhone: false,
        location: 'Kathmandu, Nepal',
      },
      socials: [{ platform: 'youtube', url: 'https://www.youtube.com/@example', label: 'YouTube' }],
      seo: { metaTitle: 'Test Artist', metaDescription: 'A violinist used in tests.' },
      portrait: { mediaRef: uploaded(), alt: 'Portrait of the artist' },
      heroDesktop: { mediaRef: uploaded(), alt: 'Artist on stage' },
      heroMobile: null,
      ogImage: null,
      ...overrides,
    };
  }

  it('answers 404 until a profile exists, then creates it with PUT', async () => {
    expect((await get()).status).toBe(404);

    const res = await put(fullProfile());
    expect(res.status).toBe(200);
    expect((await get()).status).toBe(200);
  });

  it('round-trips every field, including the hidden phone number', async () => {
    const input = fullProfile();
    const saved = adminProfileResponse.parse((await put(input)).body).data;

    const { portrait, heroDesktop } = input;
    expect(saved).toMatchObject({
      displayName: input.displayName,
      tagline: input.tagline,
      shortBio: input.shortBio,
      biography: input.biography,
      education: input.education,
      experience: input.experience,
      achievements: input.achievements,
      philosophy: input.philosophy,
      skills: input.skills,
      affiliations: input.affiliations,
      socials: input.socials,
      seo: input.seo,
    });
    expect(saved.portrait).toMatchObject({
      alt: portrait?.alt,
      asset: { publicId: portrait?.mediaRef?.publicId },
    });
    expect(saved.heroDesktop?.asset.publicId).toBe(heroDesktop?.mediaRef?.publicId);
    expect(saved.heroMobile).toBeUndefined();
    expect(saved.contact).toEqual({ ...input.contact });

    // The public profile still withholds the phone number.
    const pub = apiSuccessSchema(profileDtoSchema).parse(
      (await request(app).get('/api/profile')).body,
    );
    expect(pub.data.contact.phone).toBeUndefined();
  });

  it('keeps an image when only its alt text is sent, and removes a slot that is left out', async () => {
    const created = adminProfileResponse.parse((await put(fullProfile())).body).data;
    const portraitId = created.portrait?.asset.publicId;
    const heroId = created.heroDesktop?.asset.publicId;

    const res = await put(
      fullProfile({
        portrait: { alt: 'A better description of the portrait' },
        heroDesktop: undefined,
      }),
    );

    const saved = adminProfileResponse.parse(res.body).data;
    expect(saved.portrait).toMatchObject({
      alt: 'A better description of the portrait',
      asset: { publicId: portraitId },
    });
    expect(saved.heroDesktop).toBeUndefined();
    expect(media.destroyed).toEqual([heroId]);
  });

  it('replaces an image and deletes the old file after saving', async () => {
    const created = adminProfileResponse.parse((await put(fullProfile())).body).data;
    const replacement = uploaded();

    await put(fullProfile({ portrait: { mediaRef: replacement, alt: 'New portrait' } }));

    expect(media.destroyed).toContain(created.portrait?.asset.publicId);
  });

  it('validates the whole profile', async () => {
    const insecure = await put(
      fullProfile({ socials: [{ platform: 'instagram', url: 'http://instagram.com/x' }] }),
    );
    expect(insecure.status).toBe(422);

    const badEmail = await put(
      fullProfile({ contact: { publicEmail: 'not-an-email', showPhone: false } }),
    );
    expect(apiErrorBodySchema.parse(badEmail.body).error.details?.[0]?.path).toBe(
      'contact.publicEmail',
    );

    const altOnlyWithoutImage = await put(fullProfile({ ogImage: { alt: 'Share image text' } }));
    expect(apiErrorBodySchema.parse(altOnlyWithoutImage.body).error.details?.[0]?.path).toBe(
      'ogImage.mediaRef',
    );
  });
});

describe('admin stats', () => {
  it('counts content, drafts, upcoming events and new inquiries', async () => {
    const app = createTestApp();
    const token = await adminAccessToken(app);
    await createTrack({ status: 'published' });
    await createTrack({ status: 'draft' });
    await createAlbum({ status: 'draft' });
    await createVideo({ status: 'draft' });
    await createGalleryImage({ status: 'published' });
    await createEvent({ startsAt: new Date(Date.now() + 86_400_000), status: 'draft' });
    await createEvent({ startsAt: new Date(Date.now() - 86_400_000), status: 'published' });
    await createInquiry({ status: 'new' });
    await createInquiry({ status: 'replied' });

    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);

    expect(apiSuccessSchema(adminStatsDtoSchema).parse(res.body).data).toEqual({
      inquiriesNew: 1,
      tracks: 2,
      videos: 1,
      images: 1,
      upcomingEvents: 1,
      drafts: 4,
    });
  });
});

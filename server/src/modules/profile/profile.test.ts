import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  apiErrorBodySchema,
  apiSuccessSchema,
  homeDtoSchema,
  profileDtoSchema,
} from '@roman/shared';

import { createTestApp } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import { createProfile } from '../../../test/factories.js';

useTestDb();

const profileResponse = apiSuccessSchema(profileDtoSchema);
const homeResponse = apiSuccessSchema(homeDtoSchema);

describe('public profile and home', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/profile', () => {
    it('returns the public profile with a short public cache', async () => {
      await createProfile();
      const res = await request(app).get('/api/profile');

      expect(res.status).toBe(200);
      const profile = profileResponse.parse(res.body).data;
      expect(profile.displayName).toBe('Test Artist');
      expect(profile.education).toHaveLength(1);
      expect(profile.portrait?.alt).toBe('Portrait of the artist with a violin');
      expect(res.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
      expect(res.headers.etag).toMatch(/^W\//);
    });

    it('withholds the phone number unless the owner chose to show it', async () => {
      await createProfile();
      const hidden = profileResponse.parse((await request(app).get('/api/profile')).body).data;
      expect(hidden.contact.phone).toBeUndefined();
      expect(JSON.stringify(hidden)).not.toContain('9800000000');
      expect(JSON.stringify(hidden)).not.toContain('showPhone');
    });

    it('shows the phone number when the owner allows it', async () => {
      await createProfile({
        contact: { phone: '+977 9800000000', showPhone: true, publicEmail: 'a@example.com' },
      });
      const shown = profileResponse.parse((await request(app).get('/api/profile')).body).data;

      expect(shown.contact.phone).toBe('+977 9800000000');
    });

    it('answers 404, uncached, before the profile exists', async () => {
      const res = await request(app).get('/api/profile');

      expect(res.status).toBe(404);
      expect(apiErrorBodySchema.parse(res.body).error.code).toBe('NOT_FOUND');
      expect(res.headers['cache-control']).toBe('no-store');
    });
  });

  describe('GET /api/home', () => {
    it('returns the profile summary and empty featured sections', async () => {
      await createProfile();
      const res = await request(app).get('/api/home');

      expect(res.status).toBe(200);
      const home = homeResponse.parse(res.body).data;
      expect(home.profile).toMatchObject({ displayName: 'Test Artist', tagline: 'Violinist' });
      expect(Object.keys(home.profile).sort()).toEqual(
        ['displayName', 'portrait', 'seo', 'shortBio', 'tagline'].sort(),
      );
      expect(home.featuredTracks).toEqual([]);
      expect(home.featuredVideos).toEqual([]);
      expect(home.featuredImages).toEqual([]);
      expect(home.upcomingEvents).toEqual([]);
      expect(res.headers['cache-control']).toMatch(/^public/);
    });

    it('answers 404 before the profile exists', async () => {
      expect((await request(app).get('/api/home')).status).toBe(404);
    });
  });
});

// Shared settings for the Playwright suite and its test API (plan §19). Test data only: neutral
// placeholders, not facts about Roman.

export const E2E_API_PORT = 4100;
export const E2E_CLIENT_PORT = 4300;
export const E2E_CLIENT_ORIGIN = `http://localhost:${String(E2E_CLIENT_PORT)}`;
/** Matches the server test factories' public IDs (server/test/factories.ts). */
export const E2E_MEDIA_ROOT = 'roman-budhathoki/test';
/** The client build points its media URLs at this cloud; the tests intercept them. */
export const E2E_CLOUD_NAME = 'e2e-cloud';

export const E2E_ADMIN = {
  email: 'e2e-admin@example.com',
  password: 'e2e-admin-password-1234',
  name: 'E2E Admin',
} as const;

/** Seeded content the specs look for. */
export const SEEDED = {
  artist: 'Test Artist',
  tracks: ['Evening Raga', 'Morning Etude', 'Folk Medley'],
  draftTrack: 'Unreleased Sketch',
  videos: ['Hall Recital', 'Studio Session'],
  photos: {
    performance: 'Violinist performing on a lit stage',
    portrait: 'Portrait of the violinist holding the instrument',
    draft: 'Draft photo that visitors must not see',
  },
  upcomingEvent: 'Autumn Recital',
  pastEvent: 'Spring Gala',
  draftEvent: 'Secret Rehearsal',
} as const;

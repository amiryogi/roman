import { describe, expect, it } from 'vitest';

import { clearableText, optionalText } from '../common.js';
import { paginationQuerySchema } from '../api.js';
import { eventCreateInputSchema, eventUpdateInputSchema } from './event.js';
import { galleryImageCreateInputSchema } from './gallery.js';
import { inquiryCreateInputSchema } from './inquiry.js';
import { profileInputSchema } from './profile.js';
import { trackCreateInputSchema, trackUpdateInputSchema } from './track.js';
import { extractYouTubeId, videoCreateInputSchema, videoDtoSchema } from './video.js';

const validInquiry = {
  name: 'Sita Sharma',
  email: 'sita@example.com',
  inquiryType: 'general',
  message: 'Hello, I would like to know more.',
};

describe('text helpers', () => {
  it('optionalText treats an empty string as absent', () => {
    expect(optionalText(10).parse('')).toBeUndefined();
    expect(optionalText(10).parse('  hi ')).toBe('hi');
  });

  it('clearableText distinguishes "unchanged" from "clear"', () => {
    const schema = clearableText(10);
    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse('')).toBeNull();
    expect(schema.parse(null)).toBeNull();
  });
});

describe('paginationQuerySchema', () => {
  it('coerces strings and applies defaults', () => {
    expect(paginationQuerySchema(12).parse({})).toEqual({ page: 1, limit: 12 });
    expect(paginationQuerySchema(12).parse({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it('caps the limit at 50', () => {
    expect(paginationQuerySchema(12).safeParse({ limit: '51' }).success).toBe(false);
  });
});

describe('inquiryCreateInputSchema', () => {
  it('accepts a general inquiry', () => {
    expect(inquiryCreateInputSchema.safeParse(validInquiry).success).toBe(true);
  });

  it('requires an event type for bookings', () => {
    const result = inquiryCreateInputSchema.safeParse({ ...validInquiry, inquiryType: 'booking' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['eventType']);
  });

  it('rejects a preferred date in the past', () => {
    const result = inquiryCreateInputSchema.safeParse({
      ...validInquiry,
      preferredDate: '2000-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys and operator injection', () => {
    expect(inquiryCreateInputSchema.safeParse({ ...validInquiry, isAdmin: true }).success).toBe(
      false,
    );
    expect(
      inquiryCreateInputSchema.safeParse({ ...validInquiry, email: { $gt: '' } }).success,
    ).toBe(false);
  });
});

describe('trackCreateInputSchema', () => {
  const track = {
    title: 'Untitled',
    audio: { publicId: 'roman-budhathoki/development/music/audio/abc', resourceType: 'video' },
  };

  it('accepts audio stored as a Cloudinary video resource', () => {
    expect(trackCreateInputSchema.safeParse(track).success).toBe(true);
  });

  it('rejects audio given as an image resource', () => {
    const result = trackCreateInputSchema.safeParse({
      ...track,
      audio: { ...track.audio, resourceType: 'image' },
    });
    expect(result.success).toBe(false);
  });

  it('update schema accepts an empty patch and never injects defaults', () => {
    expect(trackUpdateInputSchema.parse({})).toEqual({});
  });
});

describe('YouTube ids', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ&t=1', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts from %s', (input, expected) => {
    expect(extractYouTubeId(input)).toBe(expected);
  });

  it.each(['https://evil.example/watch?v=dQw4w9WgXcQ', 'not a url', 'https://youtube.com/watch'])(
    'rejects %s',
    (input) => {
      expect(extractYouTubeId(input)).toBeNull();
    },
  );

  it('video create input normalises a URL to the id', () => {
    const parsed = videoCreateInputSchema.parse({
      source: 'youtube',
      youtube: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'Live',
      category: 'performance',
    });
    expect(parsed.source === 'youtube' && parsed.youtube).toBe('dQw4w9WgXcQ');
  });

  it('video DTO requires the field matching its source', () => {
    const base = {
      id: '64b7f0c2a1b2c3d4e5f60718',
      title: 'Live',
      slug: 'live',
      category: 'performance',
      status: 'published',
      featured: false,
      sortOrder: 1,
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    };
    expect(
      videoDtoSchema.safeParse({ ...base, source: 'youtube', youtubeId: 'dQw4w9WgXcQ' }).success,
    ).toBe(true);
    expect(
      videoDtoSchema.safeParse({ ...base, source: 'cloudinary', youtubeId: 'dQw4w9WgXcQ' }).success,
    ).toBe(false);
  });
});

describe('events', () => {
  const event = {
    title: 'Concert',
    startsAt: '2026-12-01T18:00:00+05:45',
    venue: { name: 'Hall', city: 'Kathmandu', country: 'Nepal' },
  };

  it('requires the end to be after the start', () => {
    expect(eventCreateInputSchema.safeParse(event).success).toBe(true);
    expect(
      eventCreateInputSchema.safeParse({ ...event, endsAt: '2026-12-01T17:00:00+05:45' }).success,
    ).toBe(false);
  });

  it('validates time zones', () => {
    expect(eventUpdateInputSchema.safeParse({ timezone: 'Asia/Kathmandu' }).success).toBe(true);
    expect(eventUpdateInputSchema.safeParse({ timezone: 'Mars/Olympus' }).success).toBe(false);
  });
});

describe('gallery and profile', () => {
  it('requires meaningful alt text on gallery images', () => {
    const result = galleryImageCreateInputSchema.safeParse({
      image: { publicId: 'a/b', resourceType: 'image' },
      alt: 'pic',
      category: 'portrait',
    });
    expect(result.success).toBe(false);
  });

  it('profile input only accepts https social links', () => {
    const profile = {
      displayName: 'Roman Budhathoki',
      tagline: 'Violinist',
      shortBio: 'Violinist and music educator.',
      biography: [],
      education: [],
      experience: [],
      achievements: [],
      skills: [],
      affiliations: [],
      seo: {},
      contact: { showPhone: false },
      socials: [{ platform: 'youtube', url: 'http://youtube.com/x' }],
    };
    expect(profileInputSchema.safeParse(profile).success).toBe(false);
    expect(
      profileInputSchema.safeParse({
        ...profile,
        socials: [{ platform: 'youtube', url: 'https://youtube.com/x' }],
      }).success,
    ).toBe(true);
  });
});

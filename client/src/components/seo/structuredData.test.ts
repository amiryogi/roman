import { describe, expect, it } from 'vitest';

import { createMediaUrls } from '@/lib/mediaUrls';
import {
  eventFixture,
  imageAsset,
  profileFixture,
  trackFixture,
  uploadedVideoFixture,
  youtubeVideoFixture,
} from '@/test/fixtures';

import {
  eventJsonLd,
  isoDuration,
  isoWithOffset,
  personJsonLd,
  personRef,
  shareImage,
  trackJsonLd,
  videoJsonLd,
} from './structuredData';

const ctx = { siteUrl: 'https://example.test', urls: createMediaUrls('demo') };

describe('structured data helpers', () => {
  it('formats durations and local times with the zone offset', () => {
    expect(isoDuration(225)).toBe('PT3M45S');
    expect(isoDuration(3725)).toBe('PT1H2M5S');
    expect(isoDuration(42)).toBe('PT42S');
    expect(isoWithOffset('2026-11-14T13:15:00.000Z', 'Asia/Kathmandu')).toBe(
      '2026-11-14T19:00:00+05:45',
    );
    expect(isoWithOffset('2026-01-10T20:00:00.000Z', 'America/New_York')).toBe(
      '2026-01-10T15:00:00-05:00',
    );
  });
});

describe('Person', () => {
  it('uses only entered data, and leaves out what is missing', () => {
    const person = personJsonLd(profileFixture(), ctx);

    expect(person).toMatchObject({
      '@type': 'Person',
      '@id': 'https://example.test/#person',
      name: 'Test Artist',
      url: 'https://example.test',
      jobTitle: ['Violinist', 'Music Educator'],
      address: { addressLocality: 'Kathmandu', addressCountry: 'NP' },
      // Only the current performance role ("2012 – Present").
      memberOf: [
        {
          '@type': 'OrganizationRole',
          roleName: 'First Violin',
          memberOf: { '@type': 'Organization', name: 'Test Orchestra' },
        },
      ],
      affiliation: [{ '@type': 'Organization', name: 'Test Trust' }],
      alumniOf: [{ '@type': 'EducationalOrganization', name: 'Test Board' }],
    });
    expect(person.image).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/private\//);
    // No social links were entered, so there is no sameAs at all.
    expect(JSON.parse(JSON.stringify(person))).not.toHaveProperty('sameAs');
  });

  it('leaves collective entries out of memberOf', () => {
    const base = profileFixture();
    const person = personJsonLd(
      profileFixture({
        experience: [
          ...base.experience,
          {
            period: '2010 – Present',
            role: 'Studio recordings',
            organization: 'Various bands, solo artists, and orchestras',
            category: 'performance',
            highlights: [],
          },
        ],
      }),
      ctx,
    );
    expect(person.memberOf).toHaveLength(1);
  });

  it('lists entered social links as sameAs', () => {
    const person = personJsonLd(
      profileFixture({ socials: [{ platform: 'youtube', url: 'https://www.youtube.com/@x' }] }),
      ctx,
    );
    expect(person.sameAs).toEqual(['https://www.youtube.com/@x']);
  });

  it('picks the share image: own image, then hero, then portrait', () => {
    const own = { asset: imageAsset({ publicId: 'own' }), alt: 'Own' };
    const hero = { asset: imageAsset({ publicId: 'hero' }), alt: 'Hero' };
    expect(shareImage({ ogImage: own, heroDesktop: hero }, ctx)?.alt).toBe('Own');
    expect(shareImage({ heroDesktop: hero }, ctx)?.url).toContain('c_fill,g_auto,w_1200,h_630');
    expect(shareImage({}, ctx)).toBeUndefined();
  });
});

describe('MusicEvent', () => {
  it('has the local start time, venue and status, and an offer only with a ticket link', () => {
    const performer = personRef(ctx, 'Test Artist');
    const event = eventJsonLd(eventFixture({ ticketUrl: undefined }), performer, ctx);
    expect(event).toMatchObject({
      '@type': 'MusicEvent',
      startDate: '2026-11-14T19:00:00+05:45',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', address: { addressLocality: 'Kathmandu' } },
      performer,
    });
    expect(event.offers).toBeUndefined();

    const ticketed = eventJsonLd(
      eventFixture({ ticketUrl: 'https://tickets.example/x', eventStatus: 'cancelled' }),
      performer,
      ctx,
    );
    expect(ticketed).toMatchObject({
      offers: { '@type': 'Offer', url: 'https://tickets.example/x' },
      eventStatus: 'https://schema.org/EventCancelled',
    });
    // No price is ever invented.
    expect(JSON.stringify(ticketed)).not.toContain('price');
  });
});

describe('recordings and videos', () => {
  it('describes a track with its ISO duration and artist credit', () => {
    expect(trackJsonLd(trackFixture({ duration: 225 }), ctx)).toMatchObject({
      '@type': 'MusicRecording',
      duration: 'PT3M45S',
      byArtist: { '@type': 'Person' },
    });
  });

  it('uses the YouTube embed or the Cloudinary file, and the recording date when known', () => {
    const youtube = videoJsonLd(youtubeVideoFixture({ recordedAt: '2025-05-01' }), ctx);
    expect(youtube).toMatchObject({ '@type': 'VideoObject', uploadDate: '2025-05-01' });
    expect(youtube.embedUrl).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    expect(youtube.contentUrl).toBeUndefined();

    const uploaded = videoJsonLd(uploadedVideoFixture(), ctx);
    expect(uploaded.contentUrl).toMatch(/\.mp4$/);
    expect(uploaded.uploadDate).toBe(uploadedVideoFixture().createdAt);
  });
});

import type {
  AlbumDto,
  EventDto,
  ImageDto,
  MediaAssetDto,
  ProfileDto,
  TrackDto,
  VideoDto,
} from '@roman/shared';
import { zoneOffsetMinutes } from '@roman/shared/lite';

import { youtubeThumbnailUrl, type MediaUrls } from '../../lib/mediaUrls';

// schema.org data (plan §17), built only from what the API returns. A field without data is left
// out, never filled with a default. Pure functions with relative imports: the build-time prerender
// (scripts/postbuild-seo.ts) uses them in Node too.

export type JsonLdValue = string | number | JsonLdObject | JsonLdValue[] | undefined;
export interface JsonLdObject {
  [key: string]: JsonLdValue;
}

export interface SeoContext {
  /** Absolute, without a trailing slash. */
  siteUrl: string;
  urls: MediaUrls;
}

/** Facts from the CV (plan §0.3): where Roman is based and what he does. */
const JOB_TITLES = ['Violinist', 'Music Educator'];
const KNOWS_ABOUT = ['Violin', 'Music education'];
const ADDRESS = { '@type': 'PostalAddress', addressLocality: 'Kathmandu', addressCountry: 'NP' };

const EVENT_STATUS: Record<EventDto['eventStatus'], string> = {
  scheduled: 'https://schema.org/EventScheduled',
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

function nonEmpty<T>(values: T[]): T[] | undefined {
  return values.length > 0 ? values : undefined;
}

/** 225 → "PT3M45S" (ISO 8601 duration). */
export function isoDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `PT${hours ? `${String(hours)}H` : ''}${minutes ? `${String(minutes)}M` : ''}${String(rest)}S`;
}

/** UTC ISO → local time with the zone's offset, e.g. "2026-11-14T19:00:00+05:45". */
export function isoWithOffset(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const offset = zoneOffsetMinutes(date, timeZone);
  const local = new Date(date.getTime() + offset * 60_000).toISOString().slice(0, 19);
  const sign = offset < 0 ? '-' : '+';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${local}${sign}${hours}:${minutes}`;
}

function imageUrl(ctx: SeoContext, asset: MediaAssetDto): string {
  return ctx.urls.imageUrl(asset, { crop: 'limit', width: 1200, format: 'jpg' });
}

/**
 * The link-preview image (plan §17): the profile's own share image, else a 1200×630 crop of the
 * hero or the portrait. JPG, because social scrapers don't reliably accept AVIF.
 */
export function shareImage(
  profile: { ogImage?: ImageDto; heroDesktop?: ImageDto; portrait?: ImageDto },
  ctx: SeoContext,
): { url: string; alt: string } | undefined {
  const image = profile.ogImage ?? profile.heroDesktop ?? profile.portrait;
  return image ? { url: ctx.urls.ogImageUrl(image.asset), alt: image.alt } : undefined;
}

/** A short reference to the Person, for use inside other items. */
export function personRef(ctx: SeoContext, name: string): JsonLdObject {
  return { '@type': 'Person', '@id': `${ctx.siteUrl}/#person`, name, url: ctx.siteUrl };
}

/** Home and About (plan §17). */
export function personJsonLd(profile: ProfileDto, ctx: SeoContext): JsonLdObject {
  // Current performance roles with one named organisation (e.g. an orchestra position
  // "2012 – Present") as memberships. Collective entries such as "Various bands, solo artists…"
  // aren't an organisation, so they are left out.
  const memberOf = profile.experience
    .filter(
      (item) =>
        item.category === 'performance' &&
        /present/i.test(item.period) &&
        !/^various\b|,/i.test(item.organization),
    )
    .map((item) => ({
      '@type': 'OrganizationRole',
      roleName: item.role,
      memberOf: { '@type': 'Organization', name: item.organization },
    }));
  const schools = [
    ...new Set(profile.education.flatMap((item) => (item.institution ? [item.institution] : []))),
  ];

  return {
    ...personRef(ctx, profile.displayName),
    jobTitle: JOB_TITLES,
    description: profile.shortBio,
    image: profile.portrait ? imageUrl(ctx, profile.portrait.asset) : undefined,
    address: ADDRESS,
    knowsAbout: KNOWS_ABOUT,
    sameAs: nonEmpty(profile.socials.map((link) => link.url)),
    memberOf: nonEmpty(memberOf),
    affiliation: nonEmpty(
      profile.affiliations.map((item) => ({ '@type': 'Organization', name: item.name })),
    ),
    alumniOf: nonEmpty(schools.map((name) => ({ '@type': 'EducationalOrganization', name }))),
  };
}

/** Upcoming events only (plan §17). Offers appear only when there is a ticket link. */
export function eventJsonLd(
  event: EventDto,
  performer: JsonLdObject,
  ctx: SeoContext,
): JsonLdObject {
  return {
    '@type': 'MusicEvent',
    name: event.title,
    description: event.description,
    url: `${ctx.siteUrl}/events#${event.slug}`,
    startDate: isoWithOffset(event.startsAt, event.timezone),
    endDate: event.endsAt ? isoWithOffset(event.endsAt, event.timezone) : undefined,
    eventStatus: EVENT_STATUS[event.eventStatus],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue.address,
        addressLocality: event.venue.city,
        addressCountry: event.venue.country,
      },
    },
    image: event.image ? imageUrl(ctx, event.image.asset) : undefined,
    performer,
    offers: event.ticketUrl ? { '@type': 'Offer', url: event.ticketUrl } : undefined,
  };
}

export function trackJsonLd(track: TrackDto, ctx: SeoContext): JsonLdObject {
  const cover = track.cover ?? track.album?.cover;
  return {
    '@type': 'MusicRecording',
    name: track.title,
    url: `${ctx.siteUrl}/music`,
    duration: isoDuration(track.duration),
    byArtist: { '@type': 'Person', name: track.artistCredit },
    inAlbum: track.album
      ? {
          '@type': 'MusicAlbum',
          name: track.album.title,
          url: `${ctx.siteUrl}/music/${track.album.slug}`,
        }
      : undefined,
    image: cover ? imageUrl(ctx, cover.asset) : undefined,
    description: track.description,
  };
}

export function albumJsonLd(
  album: AlbumDto,
  performer: JsonLdObject,
  ctx: SeoContext,
): JsonLdObject {
  return {
    '@type': 'MusicAlbum',
    name: album.title,
    url: `${ctx.siteUrl}/music/${album.slug}`,
    byArtist: performer,
    datePublished: album.releaseDate,
    numTracks: album.trackCount,
    image: album.cover ? imageUrl(ctx, album.cover.asset) : undefined,
    description: album.description,
  };
}

export function videoJsonLd(video: VideoDto, ctx: SeoContext): JsonLdObject {
  const thumbnail = video.poster
    ? imageUrl(ctx, video.poster.asset)
    : video.source === 'youtube'
      ? youtubeThumbnailUrl(video.youtubeId)
      : ctx.urls.videoPosterUrl(video.media);
  return {
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: thumbnail,
    uploadDate: video.recordedAt ?? video.createdAt,
    duration: video.duration === undefined ? undefined : isoDuration(video.duration),
    contentUrl: video.source === 'cloudinary' ? ctx.urls.videoUrl(video.media) : undefined,
    embedUrl:
      video.source === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}`
        : undefined,
    url: `${ctx.siteUrl}/videos`,
  };
}

/** One JSON-LD document; several items go in an `@graph`. */
export function jsonLdDocument(items: JsonLdObject[]): JsonLdObject {
  const [only] = items;
  return items.length === 1 && only
    ? { '@context': 'https://schema.org', ...only }
    : { '@context': 'https://schema.org', '@graph': items };
}

/**
 * JSON for a `<script type="application/ld+json">`. Undefined fields disappear, and `<` is escaped
 * so the text can't close the script element (plan §15).
 */
export function serializeJsonLd(document: JsonLdObject): string {
  return JSON.stringify(document).replace(/</g, '\\u003c');
}

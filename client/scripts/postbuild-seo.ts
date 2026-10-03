// Runs after `vite build` (plan §17). Writes a prerendered `<head>` for every public page, so link
// previews (WhatsApp, Facebook, X…) and crawlers that don't run JavaScript see the right title,
// description, image and structured data. Also writes sitemap.xml, robots.txt and the hero preload.
// The two critical fonts are preloaded: without them the late font swap moves the layout (Music
// CLS 0.081 without, 0.025 with, in Phase 10's Lighthouse runs), and LCP was no better without.
//
//   SEO_BUILD_API_URL   API to read content from at build time, e.g. https://<service>.onrender.com/api.
//                       Not VITE_-prefixed, so it never reaches the browser. Without it the pages get
//                       their titles and descriptions but no content-based image or structured data.
//   VITE_SITE_URL       Absolute site address for canonical URLs and the sitemap.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';
import { z } from 'zod';

import {
  albumDtoSchema,
  apiSuccessSchema,
  eventDtoSchema,
  galleryImageDtoSchema,
  profileDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
  type ProfileDto,
} from '@roman/shared';

import { HERO_MOBILE_QUERY, HERO_SIZES } from '../src/components/media/hero';
import { imageAttributes } from '../src/components/media/imageAttributes';
import { GALLERY_IMAGE_SIZES } from '../src/features/gallery/galleryLayout';
import { PAGE_SEO, type PageKey } from '../src/components/seo/pages';
import { resolveSeo, SITE_NAME } from '../src/components/seo/site';
import {
  albumJsonLd,
  eventJsonLd,
  personJsonLd,
  personRef,
  shareImage,
  trackJsonLd,
  videoJsonLd,
  type SeoContext,
} from '../src/components/seo/structuredData';
import { publicPaths } from '../src/lib/api/publicPaths';
import { createMediaUrls } from '../src/lib/mediaUrls';

import {
  initialFiles,
  manifestSchema,
  PUBLIC_PAGES,
  VALIDATION_MODULE,
  type BuildManifest,
} from './bundle';
import {
  headTags,
  latest,
  renderPage,
  robotsTxt,
  sitemapXml,
  type HeadOptions,
  type ImagePreload,
} from './prerender';

const clientDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(clientDir, 'dist');

const FETCH_TIMEOUT_MS = 60_000; // a sleeping Render instance can take this long to wake
const FETCH_ATTEMPTS = 3;
/** The critical font files: body text (Inter) and headings (Cormorant), Latin subset. */
const CRITICAL_FONTS = /^(inter|cormorant-garamond)-latin-wght-normal-[\w-]+\.woff2$/;

/** Unset and empty (`NAME=`) both mean "not configured". */
function setting(name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value.replace(/\/+$/, '') : undefined;
}

const env = loadEnv('production', clientDir, '');
const siteUrl = setting('VITE_SITE_URL') ?? 'http://localhost:5173';
const apiUrl = setting('SEO_BUILD_API_URL');
/** The API base the browser uses (relative in production: Vercel rewrites /api). */
const browserApiBase = setting('VITE_API_BASE_URL') ?? '/api';
const cloudName = setting('VITE_CLOUDINARY_CLOUD_NAME');

async function fetchJson(path: string): Promise<unknown> {
  if (!apiUrl) throw new Error('SEO_BUILD_API_URL is not set');
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`GET ${path} answered ${String(res.status)}`);
      const body: unknown = await res.json();
      return body;
    } catch (error) {
      lastError = error;
      console.warn(`postbuild-seo: attempt ${String(attempt)} for ${path} failed`);
    }
  }
  throw lastError;
}

async function get<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S>> {
  const envelope = apiSuccessSchema(z.unknown()).parse(await fetchJson(path));
  return schema.parse(envelope.data);
}

interface SiteData {
  profile: ProfileDto;
  upcomingEvents: z.output<typeof eventDtoSchema>[];
  tracks: z.output<typeof trackDtoSchema>[];
  albums: z.output<typeof albumDtoSchema>[];
  videos: z.output<typeof videoDtoSchema>[];
  galleryUpdatedAt: string | undefined;
  /** The gallery's first photo: its largest image (LCP), preloaded on the Gallery page. */
  firstPhoto: z.output<typeof galleryImageDtoSchema> | undefined;
}

async function loadSiteData(): Promise<SiteData> {
  const list = <S extends z.ZodType>(path: string, item: S) => get(path, z.array(item));
  const [profile, upcomingEvents, tracks, albums, videos, gallery] = await Promise.all([
    get('/profile', profileDtoSchema),
    list('/events?when=upcoming&limit=50', eventDtoSchema),
    list('/tracks?limit=50', trackDtoSchema),
    list('/albums?limit=50', albumDtoSchema),
    list('/videos?limit=50', videoDtoSchema),
    list('/gallery?limit=50', galleryImageDtoSchema),
  ]);
  return {
    profile,
    upcomingEvents,
    tracks,
    albums: albums.filter((album) => (album.trackCount ?? 0) > 0),
    videos,
    galleryUpdatedAt: latest(gallery.map((image) => image.updatedAt)),
    firstPhoto: gallery[0],
  };
}

function heroPreloads(profile: ProfileDto, ctx: SeoContext): ImagePreload[] {
  const { heroDesktop, heroMobile } = profile;
  if (!heroDesktop) return [];
  const desktop = imageAttributes(ctx.urls, heroDesktop.asset).srcSet;
  if (!heroMobile) return [{ srcSet: desktop, sizes: HERO_SIZES }];
  // Mirrors <HeroPicture>'s <source media>: each screen size preloads only its own image.
  return [
    {
      srcSet: imageAttributes(ctx.urls, heroMobile.asset).srcSet,
      sizes: HERO_SIZES,
      media: HERO_MOBILE_QUERY,
    },
    { srcSet: desktop, sizes: HERO_SIZES, media: '(min-width: 768px)' },
  ];
}

/** Per-page head options from live content (when the API is available). */
function contentOptions(page: PageKey, data: SiteData, ctx: SeoContext): Partial<HeadOptions> {
  const performer = personRef(ctx, SITE_NAME);
  switch (page) {
    case 'home':
      // Home has no runtime copy of the Person data, so it stays in the page.
      return {
        staticJsonLd: [personJsonLd(data.profile, ctx)],
        imagePreloads: heroPreloads(data.profile, ctx),
      };
    case 'about':
      return { jsonLd: [personJsonLd(data.profile, ctx)] };
    case 'music':
      return {
        jsonLd: [
          ...data.albums.map((album) => albumJsonLd(album, performer, ctx)),
          ...data.tracks.map((track) => trackJsonLd(track, ctx)),
        ],
      };
    case 'videos':
      return { jsonLd: data.videos.map((video) => videoJsonLd(video, ctx)) };
    case 'events':
      return { jsonLd: data.upcomingEvents.map((event) => eventJsonLd(event, performer, ctx)) };
    case 'gallery':
      return data.firstPhoto
        ? {
            imagePreloads: [
              {
                srcSet: imageAttributes(ctx.urls, data.firstPhoto.image).srcSet,
                sizes: GALLERY_IMAGE_SIZES,
              },
            ],
          }
        : {};
    case 'contact':
      return {};
  }
}

function lastModified(page: PageKey, data: SiteData | undefined): string | undefined {
  if (!data) return undefined;
  switch (page) {
    case 'home':
    case 'about':
    case 'contact':
      return data.profile.updatedAt;
    case 'music':
      return latest([...data.tracks, ...data.albums].map((item) => item.updatedAt));
    case 'videos':
      return latest(data.videos.map((video) => video.updatedAt));
    case 'gallery':
      return data.galleryUpdatedAt;
    case 'events':
      return latest(data.upcomingEvents.map((event) => event.updatedAt));
  }
}

/**
 * Chunks a page needs beyond what the entry already loads (the entry's own are in index.html): the
 * page's chunk and the response validation, which would otherwise only start after the entry runs.
 */
function pageModules(manifest: BuildManifest, path: string): string[] {
  const page = PUBLIC_PAGES[path];
  const entry = new Set(initialFiles(manifest, ['index.html']));
  return initialFiles(manifest, [VALIDATION_MODULE, ...(page ? [page] : [])])
    .filter((file) => !entry.has(file))
    .map((file) => `/${file}`);
}

/** The API requests each page makes as it opens (see the page components), to preload. */
const FIRST_REQUESTS: Record<PageKey, string[]> = {
  home: [publicPaths.home()],
  about: [publicPaths.profile()],
  music: [publicPaths.tracks(1), publicPaths.albums()],
  videos: [publicPaths.videos(1)],
  gallery: [publicPaths.gallery(1)],
  events: [publicPaths.events(1, 'upcoming')],
  contact: [publicPaths.profile()],
};

async function writePage(path: string, html: string): Promise<void> {
  const file =
    path === '/' ? join(distDir, 'index.html') : join(distDir, path.slice(1), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

async function main(): Promise<void> {
  const baseHtml = await readFile(join(distDir, 'index.html'), 'utf8');
  const fontPreloads = (await readdir(join(distDir, 'assets')))
    .filter((file) => CRITICAL_FONTS.test(file))
    .map((file) => `/assets/${file}`);
  // Vite's build manifest (deleted later by check-bundle.ts).
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(distDir, '.vite', 'manifest.json'), 'utf8')),
  );

  if (siteUrl.startsWith('http://localhost')) {
    console.warn(
      'postbuild-seo: VITE_SITE_URL points at localhost; set the real address for production builds.',
    );
  }

  let data: SiteData | undefined;
  let ctx: SeoContext | undefined;
  if (apiUrl && cloudName) {
    // When the API is configured, failing to read it fails the build: shipping without link
    // previews would otherwise go unnoticed.
    data = await loadSiteData();
    ctx = { siteUrl, urls: createMediaUrls(cloudName) };
  } else {
    console.warn(
      'postbuild-seo: SEO_BUILD_API_URL or VITE_CLOUDINARY_CLOUD_NAME is not set; pages get titles and descriptions only.',
    );
  }

  const image = data && ctx ? shareImage(data.profile, ctx) : undefined;
  const pages = Object.keys(PAGE_SEO).filter((key): key is PageKey => key in PAGE_SEO);
  for (const page of pages) {
    const meta = PAGE_SEO[page];
    // The profile's search title/description override the home page's (plan §17).
    const overrides =
      page === 'home' && data
        ? {
            fullTitle: data.profile.seo.metaTitle,
            description: data.profile.seo.metaDescription ?? meta.description,
          }
        : {};
    const seo = resolveSeo({ ...meta, ...overrides, ...(image ? { image } : {}) }, siteUrl);
    const extra = data && ctx ? contentOptions(page, data, ctx) : {};
    const modulePreloads = pageModules(manifest, meta.path);
    const dataPreloads = FIRST_REQUESTS[page].map((path) => `${browserApiBase}${path}`);
    await writePage(
      meta.path,
      renderPage(baseHtml, headTags({ seo, dataPreloads, fontPreloads, modulePreloads, ...extra })),
    );
  }

  // Every other address (album pages, the admin, unknown paths) gets a neutral page without a
  // canonical URL; the app then renders the right tags (vercel.json rewrites to it).
  const fallback = resolveSeo({ path: '/', ...(image ? { image } : {}) }, siteUrl);
  await writeFile(
    join(distDir, 'spa.html'),
    renderPage(baseHtml, headTags({ seo: fallback, fontPreloads, withoutCanonical: true })),
  );

  await writeFile(
    join(distDir, 'sitemap.xml'),
    sitemapXml(
      pages.map((page) => ({
        url: resolveSeo(PAGE_SEO[page], siteUrl).url,
        lastmod: lastModified(page, data),
      })),
    ),
  );
  const robots = await readFile(join(distDir, 'robots.txt'), 'utf8');
  await writeFile(join(distDir, 'robots.txt'), robotsTxt(robots, siteUrl));

  console.info(
    `postbuild-seo: ${String(pages.length)} pages, sitemap and robots.txt written for ${siteUrl}${
      data ? ' with live content' : ''
    }.`,
  );
}

await main();

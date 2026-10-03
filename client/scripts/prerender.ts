// Pure HTML/XML generation for postbuild-seo.ts (plan §17). Kept free of file and network access
// so it can be unit-tested.

import type { ResolvedSeo } from '../src/components/seo/site';
import { SITE_NAME } from '../src/components/seo/site';
import {
  jsonLdDocument,
  serializeJsonLd,
  type JsonLdObject,
} from '../src/components/seo/structuredData';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Removes index.html's placeholder tags (marked `data-prerender`) before the page's own go in. */
export function stripPrerenderTags(html: string): string {
  return html
    .replace(/[ \t]*<title\b[^>]*\bdata-prerender\b[^>]*>[^<]*<\/title>\s*\n?/g, '')
    .replace(/[ \t]*<meta\b[^>]*\bdata-prerender\b[^>]*>\s*\n?/g, '');
}

export interface ImagePreload {
  srcSet: string;
  sizes: string;
  /** Set when phones get a different image. */
  media?: string;
}

export interface HeadOptions {
  seo: ResolvedSeo;
  /** Replaced at startup by the page's live data (data-prerender). */
  jsonLd?: JsonLdObject[];
  /** Kept for the life of the page: the page has no runtime copy (e.g. Person on Home). */
  staticJsonLd?: JsonLdObject[];
  imagePreloads?: ImagePreload[];
  /**
   * The page's first API requests (e.g. "/api/home"), started while the JavaScript downloads. The
   * app's own fetch then picks up the preloaded response (same URL, mode and credentials).
   */
  dataPreloads?: string[];
  /** Font files (e.g. "/assets/inter-latin-wght-normal-abc.woff2") to fetch early. */
  fontPreloads?: string[];
  /**
   * The page's own JavaScript chunks, fetched alongside the entry instead of after it: the router
   * would otherwise only request them once the entry has run.
   */
  modulePreloads?: string[];
  /** Leave out the canonical URL (the shared fallback page serves many addresses). */
  withoutCanonical?: boolean;
}

function tag(
  name: string,
  attributes: Record<string, string | undefined>,
  prerender = true,
): string {
  const attrs = Object.entries(attributes)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`);
  return `<${name}${prerender ? ' data-prerender' : ''} ${attrs.join(' ')} />`;
}

function jsonLdScript(items: JsonLdObject[], prerender: boolean): string {
  return `<script type="application/ld+json"${prerender ? ' data-prerender' : ''}>${serializeJsonLd(
    jsonLdDocument(items),
  )}</script>`;
}

/**
 * The head tags for one page. Everything React re-renders at runtime is marked `data-prerender`,
 * so main.tsx can remove it before React adds the live version.
 */
export function headTags(options: HeadOptions): string[] {
  const { seo } = options;
  const tags = [
    `<title data-prerender>${escapeHtml(seo.title)}</title>`,
    tag('meta', { name: 'description', content: seo.description }),
    ...(options.withoutCanonical ? [] : [tag('link', { rel: 'canonical', href: seo.url })]),
    tag('meta', { property: 'og:site_name', content: SITE_NAME }),
    tag('meta', { property: 'og:title', content: seo.title }),
    tag('meta', { property: 'og:description', content: seo.description }),
    tag('meta', { property: 'og:type', content: seo.type }),
    ...(options.withoutCanonical ? [] : [tag('meta', { property: 'og:url', content: seo.url })]),
    ...(seo.image
      ? [
          tag('meta', { property: 'og:image', content: seo.image.url }),
          tag('meta', { property: 'og:image:alt', content: seo.image.alt }),
        ]
      : []),
    tag('meta', { name: 'twitter:card', content: seo.image ? 'summary_large_image' : 'summary' }),
  ];
  if (seo.noindex) tags.push(tag('meta', { name: 'robots', content: 'noindex, nofollow' }));
  for (const preload of options.imagePreloads ?? []) {
    tags.push(
      tag(
        'link',
        {
          rel: 'preload',
          as: 'image',
          imagesrcset: preload.srcSet,
          imagesizes: preload.sizes,
          media: preload.media,
          fetchpriority: 'high',
        },
        false,
      ),
    );
  }
  for (const href of options.dataPreloads ?? []) {
    tags.push(tag('link', { rel: 'preload', as: 'fetch', href, crossorigin: '' }, false));
  }
  for (const href of options.modulePreloads ?? []) {
    tags.push(tag('link', { rel: 'modulepreload', crossorigin: '', href }, false));
  }
  for (const href of options.fontPreloads ?? []) {
    tags.push(
      tag('link', { rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: '' }, false),
    );
  }
  if (options.jsonLd?.length) tags.push(jsonLdScript(options.jsonLd, true));
  if (options.staticJsonLd?.length) tags.push(jsonLdScript(options.staticJsonLd, false));
  return tags;
}

/** index.html with its placeholder tags replaced by `tags`, just before `</head>`. */
export function renderPage(baseHtml: string, tags: string[]): string {
  const html = stripPrerenderTags(baseHtml);
  const index = html.indexOf('</head>');
  if (index === -1) throw new Error('index.html has no </head>');
  return `${html.slice(0, index)}    ${tags.join('\n    ')}\n  ${html.slice(index)}`;
}

export interface SitemapEntry {
  url: string;
  /** ISO date or date-time of the latest change; omitted when unknown. */
  lastmod?: string;
}

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : '';
    return `  <url><loc>${escapeHtml(entry.url)}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** The static robots.txt plus the sitemap's absolute address. */
export function robotsTxt(base: string, siteUrl: string): string {
  const lines = base
    .split('\n')
    .filter((line) => !line.startsWith('#') && !/^sitemap:/i.test(line));
  return `${lines.join('\n').trim()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

/** The newest of several ISO timestamps, or undefined if there are none. */
export function latest(dates: (string | undefined)[]): string | undefined {
  return dates.reduce<string | undefined>(
    (newest, date) =>
      date !== undefined && (newest === undefined || date > newest) ? date : newest,
    undefined,
  );
}

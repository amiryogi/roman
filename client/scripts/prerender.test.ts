import { describe, expect, it } from 'vitest';

import { resolveSeo } from '../src/components/seo/site';

import {
  headTags,
  latest,
  renderPage,
  robotsTxt,
  sitemapXml,
  stripPrerenderTags,
} from './prerender';

const BASE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title data-prerender>Placeholder</title>
    <meta
      data-prerender
      name="description"
      content="Placeholder description"
    />
  </head>
  <body><div id="root"></div></body>
</html>`;

const SITE = 'https://example.test';

describe('prerendered head', () => {
  it('replaces the placeholders with the page’s own tags', () => {
    const seo = resolveSeo(
      {
        path: '/about',
        title: 'About',
        description: 'Fish & "chips" <here>',
        type: 'profile',
        image: { url: 'https://res.example/og.jpg', alt: 'Portrait' },
      },
      SITE,
    );
    const html = renderPage(BASE_HTML, headTags({ seo, fontPreloads: ['/assets/inter.woff2'] }));

    expect(html).not.toContain('Placeholder');
    expect(html).toContain('<meta charset="UTF-8" />');
    expect(html).toContain('<title data-prerender>About — Roman Budhathoki, Violinist</title>');
    expect(html).toContain('content="Fish &amp; &quot;chips&quot; &lt;here&gt;"');
    expect(html).toContain(
      '<link data-prerender rel="canonical" href="https://example.test/about" />',
    );
    expect(html).toContain('property="og:type" content="profile"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    // Font preloads stay after startup; only data-prerender tags are replaced by React.
    expect(html).toContain(
      '<link rel="preload" as="font" type="font/woff2" href="/assets/inter.woff2" crossorigin="" />',
    );
    expect(html.indexOf('rel="canonical"')).toBeLessThan(html.indexOf('</head>'));
  });

  it('marks live structured data for replacement and keeps static data', () => {
    const seo = resolveSeo({ path: '/' }, SITE);
    const tags = headTags({
      seo,
      jsonLd: [{ '@type': 'MusicEvent', name: '</script><b>' }],
      staticJsonLd: [{ '@type': 'Person', name: 'Test' }],
      imagePreloads: [{ srcSet: 'a.jpg 320w', sizes: '100vw', media: '(max-width: 767px)' }],
    });

    expect(tags).toContainEqual(
      '<script type="application/ld+json" data-prerender>{"@context":"https://schema.org","@type":"MusicEvent","name":"\\u003c/script>\\u003cb>"}</script>',
    );
    expect(tags).toContainEqual(
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Test"}</script>',
    );
    expect(tags).toContainEqual(
      '<link rel="preload" as="image" imagesrcset="a.jpg 320w" imagesizes="100vw" media="(max-width: 767px)" fetchpriority="high" />',
    );
    expect(tags).toContainEqual(
      '<link data-prerender rel="canonical" href="https://example.test" />',
    );
  });

  it('preloads the page’s own chunks', () => {
    const tags = headTags({
      seo: resolveSeo({ path: '/music' }, SITE),
      modulePreloads: ['/assets/MusicPage-abc.js'],
    });
    expect(tags).toContainEqual(
      '<link rel="modulepreload" crossorigin="" href="/assets/MusicPage-abc.js" />',
    );
  });

  it('starts the page’s first API request early', () => {
    const tags = headTags({ seo: resolveSeo({ path: '/' }, SITE), dataPreloads: ['/api/home'] });
    expect(tags).toContainEqual(
      '<link rel="preload" as="fetch" href="/api/home" crossorigin="" />',
    );
  });

  it('leaves out the canonical URL on the shared fallback page', () => {
    const tags = headTags({ seo: resolveSeo({ path: '/' }, SITE), withoutCanonical: true });
    expect(tags.join('\n')).not.toMatch(/canonical|og:url/);
  });

  it('removes only data-prerender tags', () => {
    expect(stripPrerenderTags('<title>Keep</title>\n<title data-prerender>Drop</title>\n')).toBe(
      '<title>Keep</title>\n',
    );
  });
});

describe('sitemap and robots.txt', () => {
  it('lists absolute URLs with the date of the latest change', () => {
    const xml = sitemapXml([
      { url: 'https://example.test', lastmod: '2026-10-03T08:00:00.000Z' },
      { url: 'https://example.test/gallery' },
    ]);
    expect(xml).toContain(
      '<url><loc>https://example.test</loc><lastmod>2026-10-03</lastmod></url>',
    );
    expect(xml).toContain('<url><loc>https://example.test/gallery</loc></url>');
  });

  it('adds the sitemap address to robots.txt', () => {
    expect(robotsTxt('# comment\nUser-agent: *\nAllow: /\nDisallow: /admin\n', SITE)).toBe(
      'User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: https://example.test/sitemap.xml\n',
    );
  });

  it('finds the newest timestamp', () => {
    expect(latest(['2026-01-02T00:00:00.000Z', undefined, '2026-03-01T00:00:00.000Z'])).toBe(
      '2026-03-01T00:00:00.000Z',
    );
    expect(latest([])).toBeUndefined();
  });
});

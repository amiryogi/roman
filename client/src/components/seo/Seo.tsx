import { env } from '@/lib/env';

import { resolveSeo, SITE_NAME, type SeoInput } from './site';

/**
 * Per-page head tags. React 19 moves <title>, <meta> and <link> into <head>, so they stay correct
 * during client-side navigation. Crawlers that don't run JavaScript get the same tags from the
 * prerendered HTML (scripts/postbuild-seo.ts), computed by the same `resolveSeo`.
 */
export function Seo(props: SeoInput) {
  const seo = resolveSeo(props, env.siteUrl);

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {/* A page kept out of search results (e.g. the 404 page) has no canonical address. */}
      {seo.noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <link rel="canonical" href={seo.url} />
      )}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:type" content={seo.type} />
      {!seo.noindex && <meta property="og:url" content={seo.url} />}
      {seo.image && <meta property="og:image" content={seo.image.url} />}
      {seo.image && <meta property="og:image:alt" content={seo.image.alt} />}
      <meta name="twitter:card" content={seo.image ? 'summary_large_image' : 'summary'} />
    </>
  );
}

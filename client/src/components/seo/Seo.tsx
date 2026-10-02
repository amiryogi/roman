import { env } from '@/lib/env';

import { DEFAULT_DESCRIPTION, pageTitle, SITE_NAME } from './site';

interface SeoProps {
  /** The page's name, e.g. "About". Omit on the home page. */
  title?: string;
  description?: string;
  /** Path for the canonical URL, e.g. "/about". Query strings are never canonical. */
  path: string;
  type?: 'website' | 'profile';
  /** For pages that shouldn't appear in search results. */
  noindex?: boolean;
}

/**
 * Per-page head tags. React 19 moves <title>, <meta> and <link> into <head>, so they stay correct
 * during client-side navigation. Crawlers that don't run JavaScript get prerendered HTML instead
 * (Phase 10).
 */
export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  type = 'website',
  noindex = false,
}: SeoProps) {
  const fullTitle = pageTitle(title);
  // Absolute, without a trailing slash (plan §17).
  const url = path === '/' ? env.siteUrl : `${env.siteUrl}${path}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary" />
    </>
  );
}

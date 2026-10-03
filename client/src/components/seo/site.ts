export const SITE_NAME = 'Roman Budhathoki';

const HOME_TITLE = 'Roman Budhathoki — Violinist, Kathmandu';

/** Describes Roman using facts from the CV only (plan §0.3, §17). Pages may pass their own. */
export const DEFAULT_DESCRIPTION =
  'Roman Budhathoki is a violinist and music educator based in Kathmandu, Nepal, with more than ' +
  '15 years of experience in performance and music education.';

/** `{Page} — Roman Budhathoki, Violinist`; the home page has its own title (plan §17). */
export function pageTitle(title?: string): string {
  return title ? `${title} — ${SITE_NAME}, Violinist` : HOME_TITLE;
}

export interface SeoImage {
  url: string;
  alt: string;
}

export interface SeoInput {
  path: string;
  /** The page's name, e.g. "About". Omit on the home page. */
  title?: string;
  /** A complete title that replaces the pattern (the profile's search title, home page only). */
  fullTitle?: string;
  description?: string;
  type?: 'website' | 'profile';
  image?: SeoImage;
  noindex?: boolean;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  /** Absolute canonical URL, without a trailing slash or query string (plan §17). */
  url: string;
  type: 'website' | 'profile';
  image?: SeoImage;
  noindex: boolean;
}

/** The head metadata for a page, as both the runtime <Seo> and the build-time prerender emit it. */
export function resolveSeo(input: SeoInput, siteUrl: string): ResolvedSeo {
  return {
    title: input.fullTitle ?? pageTitle(input.title),
    description: input.description ?? DEFAULT_DESCRIPTION,
    url: input.path === '/' ? siteUrl : `${siteUrl}${input.path}`,
    type: input.type ?? 'website',
    ...(input.image ? { image: input.image } : {}),
    noindex: input.noindex ?? false,
  };
}

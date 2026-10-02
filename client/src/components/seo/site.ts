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

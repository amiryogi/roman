import { DEFAULT_DESCRIPTION } from './site';

// Head metadata for each public page, shared by the runtime <Seo> and the build-time prerender
// (scripts/postbuild-seo.ts), so the two can't drift apart. Descriptions use CV facts only
// (plan §0.3, §17). No app imports: this module also runs in Node.

export interface PageSeo {
  path: string;
  /** Omit on the home page, which has its own title pattern. */
  title?: string;
  description: string;
  type: 'website' | 'profile';
}

export const PAGE_SEO = {
  home: { path: '/', description: DEFAULT_DESCRIPTION, type: 'profile' },
  about: {
    path: '/about',
    title: 'About',
    description:
      'Biography, training, teaching and performance experience of Roman Budhathoki, violinist and music educator based in Kathmandu, Nepal.',
    type: 'profile',
  },
  music: {
    path: '/music',
    title: 'Music',
    description:
      'Listen to recordings by Roman Budhathoki, violinist and music educator in Kathmandu, Nepal.',
    type: 'website',
  },
  videos: {
    path: '/videos',
    title: 'Videos',
    description: 'Videos of Roman Budhathoki, violinist and music educator in Kathmandu, Nepal.',
    type: 'website',
  },
  gallery: {
    path: '/gallery',
    title: 'Gallery',
    description:
      'Photographs of Roman Budhathoki, violinist and music educator in Kathmandu, Nepal.',
    type: 'website',
  },
  events: {
    path: '/events',
    title: 'Performances',
    description:
      'Upcoming and past performances by Roman Budhathoki, violinist in Kathmandu, Nepal.',
    type: 'website',
  },
  contact: {
    path: '/contact',
    title: 'Contact & Booking',
    description:
      'Book Roman Budhathoki, violinist in Kathmandu, for weddings, concerts, events, studio recordings and violin lessons.',
    type: 'website',
  },
} as const satisfies Record<string, PageSeo>;

export type PageKey = keyof typeof PAGE_SEO;

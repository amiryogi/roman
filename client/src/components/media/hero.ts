// The hero's art direction, shared by <HeroPicture> and the build-time preload in
// scripts/postbuild-seo.ts: the preload only helps if it asks for exactly the same image.

/** Below this width the mobile image is used (Tailwind's `md` breakpoint). */
export const HERO_MOBILE_QUERY = '(max-width: 767px)';

/** The hero spans the full width at every breakpoint. */
export const HERO_SIZES = '100vw';

// The hero's art direction, shared by <HeroPicture> and the build-time preload in
// scripts/postbuild-seo.ts: the preload only helps if it asks for exactly the same image.

import type { ImageCrop } from './imageAttributes';

/** Below this width the mobile image is used (Tailwind's `md` breakpoint). */
export const HERO_MOBILE_QUERY = '(max-width: 767px)';

/** The hero spans the full width at every breakpoint. */
export const HERO_SIZES = '100vw';

/**
 * The hero photo fills the screen (2026-10 revamp, superseding the uncropped hero of plan §0.4).
 * Cloudinary crops it around the subject: landscape for wider screens, a tall portrait for phones,
 * both from the same upload unless the owner sets a separate mobile image.
 */
export const HERO_DESKTOP_CROP: ImageCrop = { aspect: 16 / 9, gravity: 'auto' };
export const HERO_MOBILE_CROP: ImageCrop = { aspect: 1 / 2, gravity: 'auto' };

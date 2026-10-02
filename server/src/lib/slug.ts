import { SLUG_MAX_LENGTH, slugify } from '@roman/shared';

/**
 * Generates a slug from a title that is not yet taken: "title", then "title-2", "title-3"…
 * The unique index remains the final guard against races; callers map a duplicate-key error to 409.
 */
export async function generateUniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
  fallback = 'untitled',
): Promise<string> {
  const base = slugify(title) || fallback;
  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix < 1000; suffix++) {
    const tail = `-${String(suffix)}`;
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - tail.length).replace(/-+$/, '')}${tail}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Could not generate a unique slug for "${title}"`);
}

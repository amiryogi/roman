// Pure helpers for check-bundle.ts, kept separate so they can be unit-tested.

import { z } from 'zod';

/** 160 KB, counted in KiB as every measurement since Phase 5 has been. */
export const BUDGET_BYTES = 160 * 1024;

/** Each public page and the module the router loads for it (Home is part of the entry). */
export const PUBLIC_PAGES: Record<string, string | undefined> = {
  '/': undefined,
  '/about': 'src/features/about/AboutPage.tsx',
  '/music': 'src/features/music/MusicPage.tsx',
  '/videos': 'src/features/videos/VideosPage.tsx',
  '/gallery': 'src/features/gallery/GalleryPage.tsx',
  '/events': 'src/features/events/EventsPage.tsx',
  '/contact': 'src/features/contact/ContactPage.tsx',
};

/** API response validation, loaded lazily but preloaded on every public page (postbuild-seo.ts). */
export const VALIDATION_MODULE = 'src/lib/api/validation.ts';

export const manifestSchema = z.record(
  z.string(),
  z.object({ file: z.string(), imports: z.array(z.string()).optional() }),
);
export type BuildManifest = z.infer<typeof manifestSchema>;

/** Files loaded before a page renders: the chunks and their static imports, not dynamic ones. */
export function initialFiles(manifest: BuildManifest, keys: string[]): string[] {
  const files = new Set<string>();
  const seen = new Set<string>();
  const queue = [...keys];
  for (let key = queue.pop(); key !== undefined; key = queue.pop()) {
    if (seen.has(key)) continue;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`${key} is not in the build manifest`);
    if (chunk.file.endsWith('.js')) files.add(chunk.file);
    queue.push(...(chunk.imports ?? []));
  }
  return [...files];
}

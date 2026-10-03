// Runs at the end of `npm run build`: fails the build when a public page's initial JavaScript
// (the entry, the page's own chunk, the preloaded validation code and their static imports,
// gzipped) exceeds the budget (plan §16).
// Uses Vite's build manifest, then deletes it so it isn't deployed.

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import {
  BUDGET_BYTES,
  initialFiles,
  manifestSchema,
  PUBLIC_PAGES,
  VALIDATION_MODULE,
} from './bundle';

async function main(): Promise<void> {
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  const manifestPath = join(dist, '.vite', 'manifest.json');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  await rm(join(dist, '.vite'), { recursive: true, force: true });

  const sizes = new Map<string, number>();
  async function gzipped(file: string): Promise<number> {
    const known = sizes.get(file);
    if (known !== undefined) return known;
    const size = gzipSync(await readFile(join(dist, file)), { level: 9 }).length;
    sizes.set(file, size);
    return size;
  }

  let failed = false;
  for (const [path, page] of Object.entries(PUBLIC_PAGES)) {
    // Everything fetched up front: the entry, the page's chunks and the preloaded validation code.
    const modules = ['index.html', VALIDATION_MODULE, ...(page ? [page] : [])];
    const files = initialFiles(manifest, modules);
    let total = 0;
    for (const file of files) total += await gzipped(file);
    const over = total > BUDGET_BYTES;
    failed ||= over;
    console.info(
      `${over ? '✗' : '✓'} ${path.padEnd(9)} ${(total / 1024).toFixed(1).padStart(6)} KiB JS fetched up front (gzip)`,
    );
  }
  if (failed) {
    console.error(
      `check-bundle: a public page is over the ${String(BUDGET_BYTES / 1024)} KiB budget.`,
    );
    process.exitCode = 1;
  }
}

await main();

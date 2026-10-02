// Guards against an npm bug (npm/cli#4828): adding or removing packages can drop the optional,
// platform-specific native bindings from package-lock.json. Vite/Vitest (Rolldown) and Tailwind
// then fail with "Cannot find native binding", locally and in CI.
// Fix when this fails: delete node_modules and package-lock.json, then run `npm install`.
import { readFileSync } from 'node:fs';

const REQUIRED_BINDINGS = [
  '@rolldown/binding-linux-x64-gnu', // CI (ubuntu) and Render/Vercel builds
  '@rolldown/binding-win32-x64-msvc', // local development on Windows
  '@tailwindcss/oxide-linux-x64-gnu',
  '@tailwindcss/oxide-win32-x64-msvc',
];

const lock: unknown = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const packages =
  typeof lock === 'object' && lock !== null && 'packages' in lock ? lock.packages : undefined;

const missing = REQUIRED_BINDINGS.filter(
  (name) =>
    typeof packages !== 'object' || packages === null || !(`node_modules/${name}` in packages),
);

if (missing.length > 0) {
  console.error('package-lock.json is missing native bindings (npm/cli#4828):');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('Fix: delete node_modules and package-lock.json, then run `npm install`.');
  process.exit(1);
}

console.info('check:lockfile passed: native bindings present for linux-x64 and win32-x64.');

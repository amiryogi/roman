// Fails if client code (or the client build) mentions server-only secrets (plan §21.1).
// Everything in the browser bundle is public, so these names must never appear there.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const FORBIDDEN = /CLOUDINARY_API_(?:SECRET|KEY)|api_secret|JWT_[A-Z_]+|MONGODB_[A-Z_]+/;
const ROOTS = [
  'client/src',
  'client/index.html',
  'client/public',
  'client/.env.example',
  'client/dist',
];
const SKIP_DIRS = new Set(['node_modules']);

function* files(target: string): Generator<string> {
  if (!existsSync(target)) return;
  if (statSync(target).isFile()) {
    yield target;
    return;
  }
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    yield* files(path.join(target, entry.name));
  }
}

const offences: string[] = [];
for (const root of ROOTS) {
  for (const file of files(root)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        const match = FORBIDDEN.exec(line);
        if (match) offences.push(`${file}:${String(index + 1)}: ${match[0]}`);
      });
  }
}

if (offences.length > 0) {
  console.error('Server-only secrets are referenced in client code (plan §21.1):');
  for (const offence of offences) console.error(`  ${offence}`);
  process.exit(1);
}
console.info('check:client-secrets passed: no server secrets referenced by the client.');

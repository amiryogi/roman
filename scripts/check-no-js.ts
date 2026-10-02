// CI guard (plan §14): the project is TypeScript-only. Fails if any JavaScript
// source or config file is tracked or about to be committed.
import { execFileSync } from 'node:child_process';

const JS_EXTENSIONS = /\.(?:js|jsx|cjs|mjs)$/i;
const ALLOWED_DIRS = /(?:^|\/)(?:node_modules|dist|coverage)\//;

const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
});

const offenders = output
  .split('\n')
  .map((line) => line.trim())
  .filter((file) => file !== '' && JS_EXTENSIONS.test(file) && !ALLOWED_DIRS.test(file));

if (offenders.length > 0) {
  console.error('JavaScript files are not allowed in this project (TypeScript only):');
  for (const file of offenders) console.error(`  - ${file}`);
  process.exit(1);
}

console.info('check:no-js passed: no JavaScript files found.');

// Lighthouse budgets (plan §16): runs Lighthouse (mobile) on each page in lighthouse-budgets.json and
// fails when a category score or metric misses its budget.
//
//   npm run lighthouse                 # against http://localhost:4173 (`vite preview` + the API)
//   npm run lighthouse -- https://…    # against another address
//
// Needs Chrome and a site with real content: an empty or failing API makes the numbers meaningless.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { z } from 'zod';

const budgetsSchema = z.object({
  paths: z.array(z.string().startsWith('/')).min(1),
  categories: z.record(z.string(), z.number().min(0).max(1)),
  metrics: z.record(z.string(), z.number().min(0)),
});

const reportSchema = z.object({
  categories: z.record(z.string(), z.object({ score: z.number().nullable() })),
  audits: z.record(z.string(), z.object({ numericValue: z.number().optional() })),
  runtimeError: z.object({ message: z.string() }).optional(),
});

const budgets = budgetsSchema.parse(JSON.parse(readFileSync('lighthouse-budgets.json', 'utf8')));
const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/+$/, '');
const outDir = mkdtempSync(join(tmpdir(), 'lighthouse-'));
// The CLI's own entry point, run with this Node: no shell, so arguments are passed as they are.
const cli = join('node_modules', 'lighthouse', 'cli', 'index.js');

let failures = 0;
try {
  for (const path of budgets.paths) {
    const url = `${base}${path}`;
    const output = join(outDir, `report-${String(budgets.paths.indexOf(path))}.json`);
    execFileSync(
      process.execPath,
      [
        cli,
        url,
        '--quiet',
        '--output=json',
        `--output-path=${output}`,
        '--chrome-flags=--headless=new',
        '--only-categories=performance,accessibility,best-practices,seo',
      ],
      { stdio: 'inherit' },
    );
    const report = reportSchema.parse(JSON.parse(readFileSync(output, 'utf8')));
    if (report.runtimeError) throw new Error(`${url}: ${report.runtimeError.message}`);

    const results: string[] = [];
    for (const [category, minimum] of Object.entries(budgets.categories)) {
      const score = report.categories[category]?.score ?? 0;
      const ok = score >= minimum;
      if (!ok) failures++;
      results.push(`${ok ? '✓' : '✗'} ${category} ${String(Math.round(score * 100))}`);
    }
    for (const [metric, maximum] of Object.entries(budgets.metrics)) {
      const value = report.audits[metric]?.numericValue;
      const ok = value !== undefined && value <= maximum;
      if (!ok) failures++;
      const shown =
        value === undefined
          ? 'n/a'
          : metric.includes('layout-shift')
            ? value.toFixed(3)
            : `${String(Math.round(value))} ms`;
      results.push(`${ok ? '✓' : '✗'} ${metric} ${shown}`);
    }
    console.info(`${path}\n  ${results.join('\n  ')}`);
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`lighthouse: ${String(failures)} budget(s) missed.`);
  process.exitCode = 1;
}

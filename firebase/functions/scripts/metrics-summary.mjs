#!/usr/bin/env node
/**
 * Summarize firebase/functions/dev-metrics.jsonl (written when SHIFTTEA_FIRESTORE_METRICS=1 + emulators).
 * Usage: node scripts/metrics-summary.mjs [path/to/file.jsonl]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.join(__dirname, '..', 'dev-metrics.jsonl');
const file = process.argv[2] ?? defaultFile;

if (!fs.existsSync(file)) {
  console.log(`No metrics file at ${file}.\n`);
  console.log(
    'Firestore metrics are written by the Cloud Functions emulator only. Next.js env files ' +
      '(e.g. shifttea/.env.development.local) are not passed to functions.\n',
  );
  console.log('Enable metrics, then restart dev and use the app:\n');
  console.log('  • From repo root:     npm run dev:metrics');
  console.log('  • Or create           firebase/functions/.env.local');
  console.log('    with a line:        SHIFTTEA_FIRESTORE_METRICS=1');
  console.log('    (copy from         firebase/functions/.env.example)\n');
  console.log('Then trigger callables (submit review, places search, etc.). The log file is created at:');
  console.log(`  ${file}\n`);
  process.exit(0);
}

const raw = fs.readFileSync(file, 'utf8').trim();
if (!raw) {
  console.log('Metrics file is empty.');
  process.exit(0);
}

/** @typedef {{ function: string; reads: number; writes: number; ms: number; ok: boolean }} Row */

/** @type {Map<string, { count: number; reads: number; writes: number; ms: number; errors: number }>} */
const byFn = new Map();

for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }
  const name = row.function;
  if (!name) continue;
  const cur = byFn.get(name) ?? { count: 0, reads: 0, writes: 0, ms: 0, errors: 0 };
  cur.count += 1;
  cur.reads += Number(row.reads) || 0;
  cur.writes += Number(row.writes) || 0;
  cur.ms += Number(row.ms) || 0;
  if (row.ok === false) cur.errors += 1;
  byFn.set(name, cur);
}

console.log(`ShiftTea function metrics (from ${file})\n`);
console.log(
  ['Function'.padEnd(28), 'Calls', 'Total R', 'Total W', 'Avg ms', 'Errs'].join('  '),
);
console.log('-'.repeat(72));

const sorted = [...byFn.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [name, s] of sorted) {
  const avgMs = s.count ? (s.ms / s.count).toFixed(1) : '0';
  console.log(
    [
      name.slice(0, 28).padEnd(28),
      String(s.count).padStart(5),
      String(s.reads).padStart(8),
      String(s.writes).padStart(8),
      avgMs.padStart(7),
      String(s.errors).padStart(5),
    ].join('  '),
  );
}

const totals = [...byFn.values()].reduce(
  (a, s) => ({
    count: a.count + s.count,
    reads: a.reads + s.reads,
    writes: a.writes + s.writes,
    ms: a.ms + s.ms,
    errors: a.errors + s.errors,
  }),
  { count: 0, reads: 0, writes: 0, ms: 0, errors: 0 },
);
console.log('-'.repeat(72));
console.log(
  [
    'TOTAL'.padEnd(28),
    String(totals.count).padStart(5),
    String(totals.reads).padStart(8),
    String(totals.writes).padStart(8),
    (totals.count ? (totals.ms / totals.count).toFixed(1) : '0').padStart(7),
    String(totals.errors).padStart(5),
  ].join('  '),
);

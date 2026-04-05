import fs from 'node:fs';
import path from 'node:path';

export interface InvocationRecord {
  function: string;
  reads: number;
  writes: number;
  ms: number;
  ok: boolean;
  error?: string;
}

const PREFIX = '[ShiftTea:FirestoreMetrics]';

function logPath(): string {
  return path.join(process.cwd(), 'dev-metrics.jsonl');
}

/**
 * Append one JSON line (and echo a single console line for tailing emulator output).
 */
export function recordInvocation(rec: InvocationRecord): void {
  const line = JSON.stringify({ ...rec, ts: new Date().toISOString() });
  console.info(`${PREFIX} ${line}`);
  try {
    fs.appendFileSync(logPath(), line + '\n', 'utf8');
  } catch (e) {
    console.warn(`${PREFIX} could not append dev-metrics.jsonl`, e);
  }
}

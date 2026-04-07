import { AsyncLocalStorage } from 'node:async_hooks';
import { isFirestoreMetricsEnabled } from './config.js';
import { recordInvocation } from './sink.js';

export interface MetricsStore {
  reads: number;
  writes: number;
}

const als = new AsyncLocalStorage<MetricsStore>();

export function bumpReads(n: number): void {
  const s = als.getStore();
  if (s) s.reads += n;
}

export function bumpWrites(n: number): void {
  const s = als.getStore();
  if (s) s.writes += n;
}

/**
 * Run `fn` inside a metrics scope. When metrics are disabled, runs `fn` with no overhead
 * beyond one boolean check.
 */
export async function runWithMetrics<T>(functionName: string, fn: () => Promise<T>): Promise<T> {
  if (!isFirestoreMetricsEnabled()) {
    return fn();
  }
  const store: MetricsStore = { reads: 0, writes: 0 };
  const t0 = Date.now();
  return als.run(store, async () => {
    try {
      const result = await fn();
      recordInvocation({
        function: functionName,
        reads: store.reads,
        writes: store.writes,
        ms: Date.now() - t0,
        ok: true,
      });
      return result;
    } catch (err) {
      recordInvocation({
        function: functionName,
        reads: store.reads,
        writes: store.writes,
        ms: Date.now() - t0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}

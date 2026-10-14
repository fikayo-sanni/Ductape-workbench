/**
 * Traffic, latency and throughput for one function, read from the product's recorded operations.
 * Everything here is arithmetic on recorded numbers; nothing is estimated or filled in.
 */

export interface OperationStat {
  type?: string;
  operation?: string;
  calls?: number;
  failures?: number;
  averageLatencyMs?: number | null;
  p95LatencyMs?: number | null;
  maxLatencyMs?: number | null;
}

export interface FunctionTraffic {
  calls: number;
  failures: number;
  errorRatePercent: number;
  averageLatencyMs: number | null;
  /** Absent until the logs service reports it. */
  p95LatencyMs: number | null;
  maxLatencyMs: number | null;
  /** Calls per minute averaged over the whole window. */
  callsPerMinute: number;
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Traffic for one function tag, or null when nothing was recorded for it in the window. */
export function trafficFor(operations: OperationStat[], tag: string, windowMs: number): FunctionTraffic | null {
  const rows = operations.filter(row => String(row.type).toLowerCase() === 'functions' && row.operation === tag);
  const calls = rows.reduce((sum, row) => sum + (finite(row.calls) ?? 0), 0);
  if (!calls) return null;
  const failures = rows.reduce((sum, row) => sum + (finite(row.failures) ?? 0), 0);

  // The log type and the function tag can both produce a row for one function; weight averages by calls.
  let weighted = 0;
  let weightedCalls = 0;
  for (const row of rows) {
    const average = finite(row.averageLatencyMs);
    const count = finite(row.calls) ?? 0;
    if (average !== null && count > 0) {
      weighted += average * count;
      weightedCalls += count;
    }
  }
  const p95s = rows.map(row => finite(row.p95LatencyMs)).filter((value): value is number => value !== null);
  const maxes = rows.map(row => finite(row.maxLatencyMs)).filter((value): value is number => value !== null);

  return {
    calls,
    failures,
    errorRatePercent: (failures / calls) * 100,
    averageLatencyMs: weightedCalls ? weighted / weightedCalls : null,
    p95LatencyMs: p95s.length ? Math.max(...p95s) : null,
    maxLatencyMs: maxes.length ? Math.max(...maxes) : null,
    callsPerMinute: windowMs > 0 ? calls / (windowMs / 60_000) : 0,
  };
}

/** "12 / min" when busy, "3 / hour" or "1 / day" when quiet, so small numbers are not shown as 0.00. */
export function formatThroughput(callsPerMinute: number): string {
  if (callsPerMinute >= 10) return `${Math.round(callsPerMinute).toLocaleString()} / min`;
  if (callsPerMinute >= 1) return `${callsPerMinute.toFixed(1)} / min`;
  const perHour = callsPerMinute * 60;
  if (perHour >= 1) return `${perHour >= 10 ? Math.round(perHour) : perHour.toFixed(1)} / hour`;
  const perDay = perHour * 24;
  return `${perDay >= 10 ? Math.round(perDay) : perDay.toFixed(1)} / day`;
}

export function formatLatencyMs(value: number | null): string {
  if (value === null) return '-';
  if (value < 1) return '<1 ms';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`;
}

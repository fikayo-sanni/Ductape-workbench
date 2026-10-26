import { deltaOf, cacheHitRate, formatBytes, formatCount, formatDuration, formatPercent, type HealthTone, type IBreakdownRow, type IDelta, type IPeriodStats, type ISystemHealth, type ITimelinePoint } from '@/utils/platformHealth';

/** What the Metrics tab shows beyond the workspace totals, worked out from the platform health read. Nothing here touches the network or the screen. */

/** Calls and failures per bucket across every system, so one chart tells the story of the whole workspace. Latency is weighted by calls. */
export function aggregateTimeline(systems: Array<Pick<ISystemHealth, 'timeline'>>): ITimelinePoint[] {
  const byDate = new Map<string, { count: number; failures: number; latencySum: number; latencyCalls: number }>();
  for (const system of systems) {
    for (const point of system.timeline) {
      const entry = byDate.get(point.date) ?? { count: 0, failures: 0, latencySum: 0, latencyCalls: 0 };
      entry.count += point.count;
      entry.failures += point.failures;
      if (point.avgLatencyMs !== null && point.count > 0) {
        entry.latencySum += point.avgLatencyMs * point.count;
        entry.latencyCalls += point.count;
      }
      byDate.set(point.date, entry);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({
      date,
      count: entry.count,
      failures: entry.failures,
      avgLatencyMs: entry.latencyCalls > 0 ? entry.latencySum / entry.latencyCalls : null,
    }));
}

export interface IOperationRow extends IBreakdownRow {
  systemId: string;
  systemLabel: string;
}

const operationRows = (systems: Array<Pick<ISystemHealth, 'id' | 'label' | 'topOperations'>>): IOperationRow[] =>
  systems.flatMap((system) => system.topOperations.map((row) => ({ ...row, systemId: system.id, systemLabel: system.label })));

/** The operations used most, across every system. An operation name can repeat between systems, so the system is part of the row. */
export function topOperations(systems: Array<Pick<ISystemHealth, 'id' | 'label' | 'topOperations'>>, limit = 8): IOperationRow[] {
  return operationRows(systems)
    .filter((row) => row.calls > 0)
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** The slowest operations by p95, among those with enough calls for a p95 to mean something. */
export function slowestOperations(systems: Array<Pick<ISystemHealth, 'id' | 'label' | 'topOperations'>>, limit = 5, minCalls = 5): IOperationRow[] {
  return operationRows(systems)
    .filter((row) => row.calls >= minCalls && row.p95LatencyMs !== null)
    .sort((a, b) => (b.p95LatencyMs ?? 0) - (a.p95LatencyMs ?? 0))
    .slice(0, limit);
}

/** The share of calls that worked, or null when there were no calls to judge by. */
export function successRate(stats: Pick<IPeriodStats, 'total' | 'failures'>): number | null {
  return stats.total > 0 ? ((stats.total - stats.failures) / stats.total) * 100 : null;
}

export interface IMetricTile {
  id: string;
  label: string;
  value: string;
  /** A short second line: what the value is out of, or what it is made of. */
  sub?: string;
  delta?: IDelta;
  tone?: HealthTone;
}

/** The headline numbers for the period, each with how it moved since the period before. Tiles with nothing to say (no cache reads, nothing stored) are left out. */
export function periodTiles({ current, previous }: { current: IPeriodStats; previous: IPeriodStats }): IMetricTile[] {
  const success = successRate(current);
  const previousSuccess = successRate(previous);
  const tiles: IMetricTile[] = [
    { id: 'calls', label: 'Calls', value: formatCount(current.total), sub: `${formatCount(previous.total)} in the period before`, delta: deltaOf(current.total, previous.total, 'count') },
    {
      id: 'success',
      label: 'Success rate',
      value: success === null ? '-' : formatPercent(success),
      sub: `${formatCount(current.failures)} failed`,
      delta: success === null || previousSuccess === null ? undefined : deltaOf(100 - success, 100 - previousSuccess, 'rate'),
      tone: success === null ? 'neutral' : current.errorRatePercent >= 5 ? 'bad' : current.errorRatePercent >= 1 ? 'warn' : 'good',
    },
    { id: 'latency', label: 'Average latency', value: formatDuration(current.avgLatencyMs), sub: `median ${formatDuration(current.p50LatencyMs)}`, delta: deltaOf(current.avgLatencyMs, previous.avgLatencyMs, 'latency') },
    { id: 'p95', label: 'p95 latency', value: formatDuration(current.p95LatencyMs), sub: `p99 ${formatDuration(current.p99LatencyMs)}, slowest ${formatDuration(current.maxLatencyMs)}`, delta: deltaOf(current.p95LatencyMs, previous.p95LatencyMs, 'latency') },
  ];
  const hits = cacheHitRate(current);
  if (hits !== null) tiles.push({ id: 'cache', label: 'Cache hit rate', value: formatPercent(hits), sub: `${formatCount(current.cacheHits)} hits, ${formatCount(current.cacheMisses)} misses` });
  if (current.storageBytes > 0) tiles.push({ id: 'storage', label: 'Written to storage', value: formatBytes(current.storageBytes), delta: deltaOf(current.storageBytes, previous.storageBytes, 'count') });
  if (current.overageCalls > 0) tiles.push({ id: 'overage', label: 'Calls over plan', value: formatCount(current.overageCalls), tone: 'warn' });
  return tiles;
}

export interface IBusiest { date: string; count: number; failures: number }

/** The bucket with the most calls, and how many of them failed: "Tuesday was the busiest day". Null when nothing ran. */
export function busiestBucket(points: ITimelinePoint[]): IBusiest | null {
  let best: ITimelinePoint | null = null;
  for (const point of points) if (point.count > 0 && (best === null || point.count > best.count)) best = point;
  return best ? { date: best.date, count: best.count, failures: best.failures } : null;
}

/** Each product's share of all calls, most used first. The workspace itself (calls tied to no product) is kept; the caller names it. */
export function productShares(rows: IBreakdownRow[], total: number): Array<IBreakdownRow & { share: number }> {
  return [...rows]
    .filter((row) => row.calls > 0)
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name))
    .map((row) => ({ ...row, share: total > 0 ? Math.min(100, (row.calls / total) * 100) : 0 }));
}

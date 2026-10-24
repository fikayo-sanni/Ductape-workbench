/** The platform health read, and the small rules the dashboard needs to show it. Nothing here touches the network or the screen. */

export type Severity = 'critical' | 'warning' | 'info';
export type SystemStatus = 'healthy' | 'degraded' | 'down' | 'idle';
export type HealthTone = 'good' | 'bad' | 'warn' | 'info' | 'neutral';

export interface IPeriodStats {
  total: number;
  failures: number;
  errorRatePercent: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  maxLatencyMs: number | null;
  cost: number;
  storageBytes: number;
  overageCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface IBreakdownRow {
  name: string;
  calls: number;
  failures: number;
  errorRatePercent: number;
  p95LatencyMs: number | null;
  cost: number;
}

export interface ITimelinePoint { date: string; count: number; failures: number; avgLatencyMs: number | null }

export interface ISystemHealth {
  id: string;
  label: string;
  types: string[];
  status: SystemStatus;
  current: IPeriodStats;
  previous: IPeriodStats;
  timeline: ITimelinePoint[];
  topErrors: Array<{ message: string; count: number; lastSeen: string }>;
  topOperations: IBreakdownRow[];
  topProducts: IBreakdownRow[];
}

export interface IHealthAlert { id: string; severity: Severity; system: string; systemLabel: string; title: string; detail: string }

export interface IRecentError {
  id: string;
  at: string | null;
  system: string;
  systemLabel: string;
  type: string;
  product: string | null;
  env: string | null;
  operation: string | null;
  message: string;
  latencyMs: number | null;
  processId: string | null;
}

export interface IPlatformHealth {
  window: { start: string; end: string; previousStart: string; bucket: 'hour' | 'day' | 'week' };
  generatedAt: string;
  overall: { current: IPeriodStats; previous: IPeriodStats };
  products: IBreakdownRow[];
  systems: ISystemHealth[];
  alerts: IHealthAlert[];
  recentErrors: IRecentError[];
}

/** 1,234 stays whole; 12,345 is 12.3k; 1,234,567 is 1.2M. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 10_000) return `${trim(value / 1_000)}k`;
  return Math.round(value).toLocaleString('en-US');
}

const trim = (value: number): string => Number(value.toFixed(1)).toString();

/** A duration in the unit a person reads: 840 ms, 1.2 s, 2m 5s. Nothing measured is a dash, never a zero. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '-';
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${trim(ms / 1000)} s`;
  const minutes = Math.floor(ms / 60_000);
  return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value >= 10 || value === 0 ? Math.round(value) : Number(value.toFixed(1))}%`;
}

export interface IDelta {
  /** What to print: "+12%", "-3 pts", "new", or "" when there is nothing to compare. */
  text: string;
  direction: 'up' | 'down' | 'flat' | 'none';
  /** Whether the change is good, bad or neutral for what is measured. */
  tone: HealthTone;
}

/**
 * How a number changed since the period before. `kind` says which way is good: more calls is neutral, more errors and
 * slower calls are bad. Differences too small to mean anything are flat.
 */
export function deltaOf(current: number | null, previous: number | null, kind: 'count' | 'latency' | 'rate'): IDelta {
  const none: IDelta = { text: '', direction: 'none', tone: 'neutral' };
  if (current === null || previous === null || !Number.isFinite(current) || !Number.isFinite(previous)) return none;
  if (kind === 'rate') {
    const points = current - previous;
    if (Math.abs(points) < 0.5) return { text: 'no change', direction: 'flat', tone: 'neutral' };
    return { text: `${points > 0 ? '+' : '-'}${trim(Math.abs(points))} pts`, direction: points > 0 ? 'up' : 'down', tone: points > 0 ? 'bad' : 'good' };
  }
  if (previous === 0) return current === 0 ? { text: 'no change', direction: 'flat', tone: 'neutral' } : { text: 'new', direction: 'up', tone: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 5) return { text: 'no change', direction: 'flat', tone: 'neutral' };
  const text = `${change > 0 ? '+' : '-'}${formatPercent(Math.abs(change))}`;
  if (kind === 'count') return { text, direction: change > 0 ? 'up' : 'down', tone: 'neutral' };
  return { text, direction: change > 0 ? 'up' : 'down', tone: change > 0 ? 'bad' : 'good' };
}

export const STATUS_TONE: Record<SystemStatus, HealthTone> = { healthy: 'good', degraded: 'warn', down: 'bad', idle: 'neutral' };
export const STATUS_LABEL: Record<SystemStatus, string> = { healthy: 'Healthy', degraded: 'Degraded', down: 'Failing', idle: 'No activity' };
export const SEVERITY_TONE: Record<Severity, HealthTone> = { critical: 'bad', warning: 'warn', info: 'info' };
export const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critical', warning: 'Warning', info: 'Notice' };

const STATUS_ORDER: Record<SystemStatus, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

/** The systems a person should look at first: failing ones, then degraded, then by use. Idle ones go last. */
export function orderSystems<T extends Pick<ISystemHealth, 'status' | 'label' | 'current'>>(systems: T[]): T[] {
  return [...systems].sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.current.total - a.current.total || a.label.localeCompare(b.label));
}

export interface ISystemCounts { down: number; degraded: number; healthy: number; idle: number }

export function countStatuses(systems: Array<Pick<ISystemHealth, 'status'>>): ISystemCounts {
  const counts: ISystemCounts = { down: 0, degraded: 0, healthy: 0, idle: 0 };
  for (const system of systems) counts[system.status] += 1;
  return counts;
}

/** The one sentence at the top: how the platform is, in words. */
export function summarize(health: IPlatformHealth): { tone: HealthTone; title: string; detail: string } {
  const counts = countStatuses(health.systems);
  const active = counts.down + counts.degraded + counts.healthy;
  if (active === 0) return { tone: 'neutral', title: 'No activity in this period', detail: 'Nothing has run yet. Calls to your systems will show up here as they happen.' };
  const critical = health.alerts.filter((alert) => alert.severity === 'critical').length;
  const warnings = health.alerts.filter((alert) => alert.severity === 'warning').length;
  if (counts.down > 0) {
    return { tone: 'bad', title: `${counts.down} ${counts.down === 1 ? 'system is' : 'systems are'} failing`, detail: `${critical} critical and ${warnings} other ${warnings === 1 ? 'alert' : 'alerts'}, across ${active} active ${active === 1 ? 'system' : 'systems'}.` };
  }
  if (counts.degraded > 0) {
    return { tone: 'warn', title: `${counts.degraded} ${counts.degraded === 1 ? 'system is' : 'systems are'} degraded`, detail: `${warnings} ${warnings === 1 ? 'warning' : 'warnings'} across ${active} active ${active === 1 ? 'system' : 'systems'}.` };
  }
  return { tone: 'good', title: 'Every system is healthy', detail: `${active} active ${active === 1 ? 'system' : 'systems'}, none over its error or latency limits.` };
}

export interface ISparkBar { x: number; height: number; failedHeight: number }

/**
 * Geometry for a small bar chart of calls over time, with the failed share of each bar drawn on top. Heights are fractions of the
 * chart (0 to 1) so the screen decides the size. A bucket with calls always shows at least a sliver, so a quiet hour is not mistaken for none.
 */
export function sparkBars(points: ITimelinePoint[]): ISparkBar[] {
  if (points.length === 0) return [];
  const max = Math.max(...points.map((point) => point.count), 0);
  if (max === 0) return points.map((_, index) => ({ x: index / points.length, height: 0, failedHeight: 0 }));
  return points.map((point, index) => {
    const height = point.count === 0 ? 0 : Math.max(point.count / max, 0.06);
    const failedHeight = point.failures === 0 ? 0 : Math.min(height, Math.max((point.failures / max), 0.04));
    return { x: index / points.length, height, failedHeight };
  });
}

/** How long ago, in words a person says: "just now", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} d ago`;
}

/** What opening a system's logs should filter to: a single log type when it has one, and failures when asked. */
export function logsFilterFor(system: Pick<ISystemHealth, 'types'> | undefined, failuresOnly: boolean): { component: string; status: string } {
  return { component: system && system.types.length === 1 ? system.types[0] : 'all', status: failuresOnly ? 'fail' : 'all' };
}

/** A size in bytes, as a person reads it. Nothing written is a dash. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${unit === 0 ? Math.round(value) : Number(value.toFixed(value >= 100 ? 0 : 1))} ${units[unit]}`;
}

/** What something cost. Nothing charged is a dash; very small amounts keep enough digits to be seen. */
export function formatCost(amount: number | null | undefined): string {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return '-';
  const digits = amount >= 100 ? 0 : amount >= 1 ? 2 : amount >= 0.01 ? 3 : 4;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: digits === 0 ? 0 : Math.min(digits, 2), maximumFractionDigits: digits })}`;
}

/** The share of cache reads answered from the cache, or null when there were no reads to judge by. */
export function cacheHitRate(stats: Pick<IPeriodStats, 'cacheHits' | 'cacheMisses'>): number | null {
  const reads = stats.cacheHits + stats.cacheMisses;
  return reads > 0 ? (stats.cacheHits / reads) * 100 : null;
}

/** A system's share of all calls, 0 to 100. */
export function shareOfCalls(calls: number, total: number): number {
  return total > 0 ? Math.min(100, (calls / total) * 100) : 0;
}

/** The inventory the workspace dashboard counts (databases, buckets, caches, queues), and the system each one belongs to. */
export const INVENTORY_SYSTEM: Record<string, string> = { database: 'databases', storage: 'storage', cache: 'cache', queue: 'events' };

export interface IInventoryItem { name: string; count: number; type: string }

/** How many of a system's resources exist, from the inventory, or null when the inventory does not count that kind. */
export function provisionedFor(systemId: string, inventory: IInventoryItem[]): { count: number; name: string } | null {
  const item = inventory.find((entry) => INVENTORY_SYSTEM[String(entry.type).toLowerCase()] === systemId);
  return item ? { count: item.count, name: item.name } : null;
}

/**
 * The one extra fact worth showing for a system beyond calls, errors and latency, if it has one: what was written to storage, how
 * well the cache worked, or how many calls went past the plan. Plain text, empty when there is nothing to say.
 */
export function usageDetail(system: Pick<ISystemHealth, 'id' | 'current'>): string {
  const { current } = system;
  const parts: string[] = [];
  if (system.id === 'storage' && current.storageBytes > 0) parts.push(`${formatBytes(current.storageBytes)} written`);
  if (system.id === 'cache') {
    const rate = cacheHitRate(current);
    if (rate !== null) parts.push(`${formatPercent(rate)} hit rate`);
  }
  if (current.overageCalls > 0) parts.push(`${formatCount(current.overageCalls)} over plan`);
  return parts.join(' · ');
}

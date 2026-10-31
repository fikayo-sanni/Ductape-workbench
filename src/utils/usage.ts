/** A workspace's measured log usage, as GET /pricing/v1/usage/:workspace_id returns it. Measured only, not billed. */
export interface IWorkspaceUsage {
  workspace_id: string;
  metric: string;
  period: { from: string; to: string; basis: 'billing_period' | 'calendar_month' | 'requested' };
  total: { bytes: number; logs: number };
  byDay: Array<{ day: string; bytes: number; logs: number }>;
  byProject: Array<{ product_tag: string | null; env: string | null; bytes: number; logs: number }>;
  /** Log bytes kept stored, from the latest daily snapshot in the period (absent from older pricing versions). */
  stored?: { day: string; bytes: number; logs: number } | null;
}

/** Bytes as people read them: 0 B, 812 B, 4.2 KB, 13 MB, 1.06 GB (powers of 1024). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${Number(value.toFixed(digits))} ${units[unit]}`;
}

/** "1 Oct to 31 Oct 2026", and where the period comes from. */
export function describePeriod(period: IWorkspaceUsage['period']): { range: string; basis: string } {
  const fmt = (day: string, withYear: boolean) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  const sameYear = period.from.slice(0, 4) === period.to.slice(0, 4);
  const range = `${fmt(period.from, !sameYear)} to ${fmt(period.to, true)}`;
  const basis = period.basis === 'billing_period' ? 'This billing period' : period.basis === 'calendar_month' ? 'This month' : 'Selected days';
  return { range, basis };
}

/** The projects and environments that sent the most, largest first, with each one's share of the total. */
export function topSources(usage: IWorkspaceUsage, limit = 5) {
  const total = usage.total.bytes || 1;
  return usage.byProject.slice(0, limit).map((p) => ({
    label: `${p.product_tag ?? 'No project'}${p.env ? ` / ${p.env}` : ''}`,
    bytes: p.bytes,
    logs: p.logs,
    share: Math.round((p.bytes / total) * 1000) / 10,
  }));
}

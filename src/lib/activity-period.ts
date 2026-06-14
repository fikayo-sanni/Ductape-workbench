import { formatActivityDateLabel } from '@/lib/utils';

export type ActivityPeriodPreset = '7d' | '1m' | '6m' | 'custom';

export type ActivityGroupBy = 'hour' | 'day' | 'week' | 'month';

export interface ActivityDateRange {
  startDate: string;
  endDate: string;
  groupBy: ActivityGroupBy;
  label: string;
}

const formatYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function pickGroupBy(daySpan: number): ActivityGroupBy {
  if (daySpan <= 2) return 'hour';
  if (daySpan <= 45) return 'day';
  if (daySpan <= 120) return 'week';
  return 'month';
}

export function resolveActivityPeriod(
  preset: ActivityPeriodPreset,
  customStart?: string,
  customEnd?: string,
): ActivityDateRange {
  const end = customEnd ? new Date(`${customEnd}T23:59:59`) : new Date();
  const start = new Date(end);

  if (preset === '7d') {
    start.setDate(end.getDate() - 6);
    return {
      startDate: formatYmd(start),
      endDate: formatYmd(end),
      groupBy: 'day',
      label: 'Last 7 days',
    };
  }

  if (preset === '1m') {
    start.setDate(end.getDate() - 29);
    return {
      startDate: formatYmd(start),
      endDate: formatYmd(end),
      groupBy: 'day',
      label: 'Last 30 days',
    };
  }

  if (preset === '6m') {
    start.setMonth(end.getMonth() - 6);
    start.setDate(start.getDate() + 1);
    return {
      startDate: formatYmd(start),
      endDate: formatYmd(end),
      groupBy: 'week',
      label: 'Last 6 months',
    };
  }

  const customStartDate = customStart ? new Date(`${customStart}T00:00:00`) : new Date(end);
  const customEndDate = customEnd ? new Date(`${customEnd}T23:59:59`) : end;
  const spanDays = Math.max(
    1,
    Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
  return {
    startDate: formatYmd(customStartDate),
    endDate: formatYmd(customEndDate),
    groupBy: pickGroupBy(spanDays),
    label: `${formatActivityDateLabel(formatYmd(customStartDate))} – ${formatActivityDateLabel(formatYmd(customEndDate))}`,
  };
}

export interface ActivityTimelinePoint {
  date: string;
  label: string;
  count: number;
  avgLatencyMs: number | null;
  successful: number;
  failed: number;
}

export function logOutcome(log: {
  successful_execution?: boolean;
  failed_execution?: boolean;
  status?: string;
}): 'success' | 'fail' | 'unknown' {
  if (log.successful_execution === true || log.status === 'success') return 'success';
  if (log.failed_execution === true || log.status === 'fail') return 'fail';
  return 'unknown';
}

function bucketKey(ts: Date, groupBy: ActivityGroupBy): string {
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');
  if (groupBy === 'hour') {
    const h = String(ts.getHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}`;
  }
  if (groupBy === 'day') return `${y}-${m}-${d}`;
  if (groupBy === 'month') return `${y}-${m}`;
  const day = ts.getDay();
  const diff = ts.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(ts);
  weekStart.setDate(diff);
  return formatYmd(weekStart);
}

/** Align API bucket keys (e.g. 2026-05-21-14) with client keys (2026-05-21T14). */
export function normalizeTimelineDateKey(key: string, groupBy: ActivityGroupBy): string {
  if (groupBy === 'hour' && /^\d{4}-\d{2}-\d{2}-\d{1,2}$/.test(key)) {
    const parts = key.split('-');
    const h = parts.pop()!.padStart(2, '0');
    return `${parts.join('-')}T${h}`;
  }
  return key;
}

export function activityBucketLabel(key: string, groupBy: ActivityGroupBy): string {
  const normalized = normalizeTimelineDateKey(key, groupBy);
  if (groupBy === 'hour' && normalized.includes('T')) {
    const [datePart, hour] = normalized.split('T');
    return `${formatActivityDateLabel(datePart)} ${hour}:00`;
  }
  if (groupBy === 'hour' && /^\d{4}-\d{2}-\d{2}-\d{1,2}$/.test(key)) {
    const parts = key.split('-');
    const h = parts.pop()!.padStart(2, '0');
    return `${formatActivityDateLabel(parts.join('-'))} ${h}:00`;
  }
  if (groupBy === 'month' && normalized.length === 7) {
    const [y, m] = normalized.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return formatActivityDateLabel(normalized.slice(0, 10));
}

function iterateBuckets(
  startDate: string,
  endDate: string,
  groupBy: ActivityGroupBy,
  cb: (key: string) => void,
): void {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const cursor = new Date(start);

  if (groupBy === 'hour') {
    while (cursor <= end) {
      cb(bucketKey(cursor, groupBy));
      cursor.setHours(cursor.getHours() + 1);
    }
    return;
  }

  if (groupBy === 'day') {
    while (cursor <= end) {
      cb(bucketKey(cursor, groupBy));
      cursor.setDate(cursor.getDate() + 1);
    }
    return;
  }

  if (groupBy === 'week') {
    const seen = new Set<string>();
    while (cursor <= end) {
      const key = bucketKey(cursor, groupBy);
      if (!seen.has(key)) {
        seen.add(key);
        cb(key);
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return;
  }

  const seenMonths = new Set<string>();
  while (cursor <= end) {
    const key = bucketKey(cursor, groupBy);
    if (!seenMonths.has(key)) {
      seenMonths.add(key);
      cb(key);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
}

/** Fill missing buckets with zero counts for charts */
export function normalizeActivityPoints(
  startDate: string,
  endDate: string,
  groupBy: ActivityGroupBy,
  raw: Map<
    string,
    { count: number; latencySum: number; latencyN: number; successful: number; failed: number }
  >,
): ActivityTimelinePoint[] {
  const points: ActivityTimelinePoint[] = [];
  iterateBuckets(startDate, endDate, groupBy, (key) => {
    const bucket = raw.get(key);
    const count = bucket?.count ?? 0;
    const avgLatencyMs =
      bucket && bucket.latencyN > 0 ? Math.round(bucket.latencySum / bucket.latencyN) : null;
    points.push({
      date: key,
      label: activityBucketLabel(key, groupBy),
      count,
      avgLatencyMs,
      successful: bucket?.successful ?? 0,
      failed: bucket?.failed ?? 0,
    });
  });
  return points;
}

export function bucketLogTimestamp(
  timestamp: string | Date | undefined,
  groupBy: ActivityGroupBy,
): string | null {
  if (!timestamp) return null;
  const ts = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (Number.isNaN(ts.getTime())) return null;
  return bucketKey(ts, groupBy);
}

export function logLatencyMs(log: {
  latency?: number;
  start?: number;
  end?: number;
}): number | null {
  if (typeof log.latency === 'number' && log.latency >= 0) return log.latency;
  if (typeof log.start === 'number' && typeof log.end === 'number' && log.end >= log.start) {
    return log.end - log.start;
  }
  return null;
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Day order for last 7 days (Mon–Sun) so activity timelines are consistent across explorers */
export const ACTIVITY_TIMELINE_DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Normalize API activity timeline to always 7 days (Mon–Sun) with 0 for days that have no activity.
 * Use for Activity Timeline widgets so they all show last 7 days; missing days display 0.
 */
export function getLast7DaysNormalized<T extends { date?: string; day?: string }>(
  apiData: T[] | undefined | null,
  getValue: (entry: T) => number
): Array<{ date: string; value: number }> {
  const map = new Map<string, number>();
  (apiData ?? []).forEach((entry) => {
    const key = (entry.date ?? entry.day ?? '').trim();
    if (key) map.set(key, (map.get(key) ?? 0) + getValue(entry));
  });
  return ACTIVITY_TIMELINE_DAY_ORDER.map((date) => ({
    date,
    value: map.get(date) ?? 0,
  }));
}

/** Format YYYY-MM-DD to short label e.g. "Jan 28" for activity timeline */
export function formatActivityDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Use activity timeline from API as-is (last 7 calendar days from backend).
 * Backend returns { date: YYYY-MM-DD, sessions?: number, operations?: number }[].
 * When API has entries, use them directly (avoids client/server timezone mismatch).
 * When API returns empty, show last 7 calendar days with 0 so the chart still renders.
 */
export function getLast7CalendarDays<T extends { date?: string; day?: string }>(
  apiData: T[] | undefined | null,
  getValue: (entry: T) => number
): Array<{ date: string; label: string; value: number }> {
  const list = apiData ?? [];
  if (list.length > 0) {
    return list.map((entry) => {
      const key = (entry.date ?? entry.day ?? '').trim() || 'Unknown';
      return {
        date: key,
        label: /^\d{4}-\d{2}-\d{2}$/.test(key) ? formatActivityDateLabel(key) : key,
        value: getValue(entry),
      };
    });
  }
  const result: Array<{ date: string; label: string; value: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      label: formatActivityDateLabel(dateStr),
      value: 0,
    });
  }
  return result;
}

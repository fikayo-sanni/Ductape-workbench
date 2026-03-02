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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Always return the last 7 calendar days with activity values. Days present in the API
 * use their value; days without activity show 0. Backend may return
 * { date: YYYY-MM-DD, sessions?: number }[] or { day: "Mon", ... }[].
 * Uses local date for keys so they match typical API responses; also looks up by day name.
 */
export function getLast7CalendarDays<T extends { date?: string; day?: string }>(
  apiData: T[] | undefined | null,
  getValue: (entry: T) => number
): Array<{ date: string; label: string; value: number }> {
  const mapByDate = new Map<string, number>();
  const mapByDayName = new Map<string, number>();
  (apiData ?? []).forEach((entry) => {
    const key = (entry.date ?? entry.day ?? '').trim();
    if (!key) return;
    const val = (mapByDate.get(key) ?? 0) + getValue(entry);
    mapByDate.set(key, val);
    if (DAY_NAMES.includes(key as (typeof DAY_NAMES)[number])) {
      mapByDayName.set(key, (mapByDayName.get(key) ?? 0) + getValue(entry));
    }
  });

  const result: Array<{ date: string; label: string; value: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;
    const dayName = DAY_NAMES[d.getDay()];
    const value = mapByDate.get(dateStr) ?? mapByDayName.get(dayName) ?? 0;
    result.push({
      date: dateStr,
      label: formatActivityDateLabel(dateStr),
      value,
    });
  }
  return result;
}

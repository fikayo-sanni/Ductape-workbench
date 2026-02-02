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

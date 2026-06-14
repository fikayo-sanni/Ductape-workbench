/** Normalize list responses from SDK proxy (array or wrapped payload). */
export function normalizeSdkList<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (record.data && typeof record.data === 'object') {
      const inner = record.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as T[];
    }
  }
  return [];
}

export type ResilienceViewMode = 'overview' | 'list';

export interface ResilienceProductContext {
  tag: string;
  name: string;
  logo?: string;
  envs?: Array<{ slug: string; name?: string }>;
}

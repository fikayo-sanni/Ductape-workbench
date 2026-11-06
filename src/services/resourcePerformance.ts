import apiClient from '@/config/axiosinstance';
export type ResourceKind = 'database' | 'vector' | 'graph' | 'storage' | 'app' | 'message_broker';
export interface PerformanceMeasure {
  calls: number; failures: number; measured: number; slowCalls: number; errorRatePercent: number;
  totalLatencyMs: number; averageLatencyMs: number | null; maxLatencyMs: number | null;
  p50LatencyMs: number | null; p95LatencyMs: number | null; p99LatencyMs: number | null;
}
export interface QueryPerformance extends PerformanceMeasure { operation: string; fingerprint: string | null }
export interface ResourcePerformance {
  window: { start: string; end: string; bucketMs: number; slowMs: number };
  summary: PerformanceMeasure & { callsPerMinute: number }; previous: PerformanceMeasure;
  coverage: { measured: number; missingLatency: number; fingerprinted: number; latestAt: string | null; percentileMethod: string; sampled: boolean; totalQueryGroups: number; rankingLimit: number; slowSampleLimit: number; slowRankingMinimumCalls: number };
  timeline: Array<PerformanceMeasure & { timestamp: string }>;
  rankings: Record<'mostUsed' | 'slowest' | 'mostTime' | 'failing', QueryPerformance[]>;
  histogram: Array<{ _id: number | string; calls: number }>;
  slowSamples: Array<{ timestamp: string; operation: string; fingerprint: string | null; duration: number; failed: number; process_id?: string; trace_id?: string; env?: string }>;
}
export async function fetchResourcePerformance(auth: { workspace: string; user: string; publicKey: string }, scope: { product: string; kind: ResourceKind; resource: string }, filters: { start_date: string; end_date: string; slow_ms: number; env?: string; operation?: string; query_fingerprint?: string; unfingerprinted?: boolean }): Promise<ResourcePerformance> {
  const query = new URLSearchParams({ user_id: auth.user, public_key: auth.publicKey });
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
  const { data } = await apiClient.get<{ data: ResourcePerformance }>(`/log/v1/products/${encodeURIComponent(scope.product)}/resources/${scope.kind}/${encodeURIComponent(scope.resource)}/performance/${auth.workspace}?${query}`);
  return data.data;
}

export async function fetchAppPerformance(auth: { workspace: string; user: string; publicKey: string }, appId: string, filters: { product_tag?: string; app_env?: string; start_date: string; end_date: string; slow_ms: number; operation?: string }): Promise<ResourcePerformance> {
  const query = new URLSearchParams({ user_id: auth.user, public_key: auth.publicKey, app_id: appId });
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
  const { data } = await apiClient.get<{ data: ResourcePerformance }>(`/log/v1/app/performance/${encodeURIComponent(auth.workspace)}?${query}`);
  return data.data;
}

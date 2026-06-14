import { formatDistanceToNow } from 'date-fns';

export type HealthcheckViewMode = 'overview' | 'status' | 'list';
export type StatusFilter = 'all' | 'healthy' | 'unhealthy';

export function formatAgo(timestamp?: string | Date): string {
  if (!timestamp) return 'never';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'never';
  }
}

export function parseLatency(latency: string): number {
  if (!latency) return 0;
  const match = latency.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export function getEnvStatusForSlug<T extends { slug: string }>(
  healthcheck: { envs?: T[] },
  envSlug: string
) {
  return healthcheck.envs?.find((e) => e.slug === envSlug);
}

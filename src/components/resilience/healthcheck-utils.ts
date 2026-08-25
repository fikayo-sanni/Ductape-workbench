import { formatDistanceToNow } from 'date-fns';

export function formatAgo(timestamp?: string | Date): string {
  if (!timestamp) return 'never';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'never';
  }
}

export function parseLatency(latency: string): number {
  const match = latency?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : 0;
}

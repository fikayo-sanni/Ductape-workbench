import { useQuery } from '@tanstack/react-query';
import { fetchPlatformHealth } from '@/services/logsServices';
import type { IPlatformHealth } from '@/utils/platformHealth';

export interface IPlatformHealthQuery {
  workspaceId: string;
  userId: string;
  publicKey: string;
  timeRange: string;
  productTag?: string;
  appId?: string;
}

/**
 * The state of every system for the period. Everything on the dashboard that needs it (the product cards, the activity chart, the health
 * and usage sections) reads it through this one query key, so the server is asked once and every part shows the same numbers.
 */
export function usePlatformHealth({ workspaceId, userId, publicKey, timeRange, productTag, appId }: IPlatformHealthQuery) {
  return useQuery<IPlatformHealth>({
    queryKey: ['platform-health', workspaceId, timeRange, productTag, appId],
    queryFn: () => fetchPlatformHealth(workspaceId, userId, publicKey, { time_range: timeRange, product_tag: productTag, app_id: appId }),
    enabled: !!workspaceId && !!userId && !!publicKey,
    refetchInterval: 30_000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { isSelfHosted } from '@/helpers/env';
import { useAuth } from '@/store/useAuth';
import marketplaceServices from '@/services/marketplaceServices';
import type { OriginSummary } from '@/services/remoteMarketplaceServices';

export const appOriginQueryKey = (appId: string | undefined) => ['app-origin', appId] as const;

/**
 * The hosted-marketplace origin of an app, or null when the app was not imported (or this is the hosted cloud).
 * Apps opened by tag do not carry `origin`, so it is read from the app record itself; `initial` is used until then.
 */
export function useAppOrigin(appId: string | undefined, initial?: OriginSummary | null): OriginSummary | null {
  const { user } = useAuth();
  const enabled = isSelfHosted() && !!appId && !!user?._id && !!user?.public_key;

  const { data } = useQuery({
    queryKey: appOriginQueryKey(appId),
    queryFn: async (): Promise<OriginSummary | null> => {
      const res = await marketplaceServices.fetchApp({
        app_id: appId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      });
      const origin = (res.data as { origin?: OriginSummary } | undefined)?.origin;
      return origin?.kind === 'remote_marketplace' ? origin : null;
    },
    enabled,
    staleTime: 1000 * 30,
  });

  if (!isSelfHosted()) return null;
  if (data !== undefined) return data;
  return initial?.kind === 'remote_marketplace' ? initial : null;
}

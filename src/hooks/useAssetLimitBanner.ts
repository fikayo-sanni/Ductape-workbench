import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import workspaceServices from '@/services/workspaceServices';
import type { AssetLimitKey, WorkbenchAssetType } from '@/types/asset-limits';

export function mapWorkbenchAssetToLimitKey(assetType: WorkbenchAssetType): AssetLimitKey {
  switch (assetType) {
    case 'product':
      return 'product';
    case 'app':
      return 'app';
    case 'graph':
    case 'vector':
    case 'database':
      return 'database';
    case 'cache':
      return 'cache';
    case 'storage':
      return 'storage';
    case 'message-broker':
      return 'messageBroker';
    case 'notifier':
      return 'notifier';
    case 'session':
      return 'storage';
    default:
      return 'product';
  }
}

export function useAssetLimitBanner(assetType: WorkbenchAssetType) {
  const { user, currentWorkspaceId } = useAuth();
  const limitKey = mapWorkbenchAssetToLimitKey(assetType);

  const { data, isLoading } = useQuery({
    queryKey: ['asset-limits', currentWorkspaceId],
    queryFn: () =>
      workspaceServices.fetchAssetLimits({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
      }),
    enabled: Boolean(user?._id && currentWorkspaceId),
    staleTime: 60_000,
  });

  const limits = data?.data;
  const asset = limits?.assets?.[limitKey];
  const showBanner = Boolean(limits && !limits.unlimited && asset?.atLimit);

  return { showBanner, asset, limits, isLoading, limitKey };
}

import { useMemo } from 'react';
import { connectDuctapeWorkspace, SDKProxyService } from '@/helpers/ductape';
import { useAuth } from '@/store/useAuth';

/** Full SDK proxy (fallback, quotas, health modules live on workspace builder). */
export function useResilienceProxy(): SDKProxyService | null {
  const { user, currentWorkspaceId } = useAuth();

  return useMemo(() => {
    if (!currentWorkspaceId || !user?._id || !user?.auth_token || !user?.public_key) {
      return null;
    }
    return connectDuctapeWorkspace({
      workspace_id: currentWorkspaceId,
      user_id: user._id,
      token: user.auth_token,
      public_key: user.public_key,
    });
  }, [currentWorkspaceId, user?._id, user?.auth_token, user?.public_key]);
}

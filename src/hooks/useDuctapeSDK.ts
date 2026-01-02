/**
 * useDuctapeSDK Hook
 * React hook that provides access to all SDK operations through the secure proxy
 *
 * This replaces direct SDK usage in the browser with server-side proxied calls
 * All operations are encrypted and routed through the backend
 */

import { useMemo } from 'react';
import { SDKProxyService, SDKProxyConfig } from '@/services/sdkProxy';
import { useAuth } from '@/store/useAuth';

/**
 * Hook to get a configured SDK proxy service
 * Returns null if not all required config is available
 *
 * @param workspaceId - The workspace ID
 * @param publicKey - The product's public key
 */
export function useDuctapeSDK(
  workspaceId: string | null,
  publicKey: string | null
): SDKProxyService | null {
  const { user } = useAuth();

  const sdk = useMemo(() => {
    if (!user?._id || !user?.auth_token || !workspaceId || !publicKey) {
      return null;
    }

    const config: SDKProxyConfig = {
      workspace_id: workspaceId,
      user_id: user._id,
      public_key: publicKey,
      token: user.auth_token,
    };

    return new SDKProxyService(config);
  }, [user?._id, user?.auth_token, workspaceId, publicKey]);

  return sdk;
}

/**
 * Hook to get a configured SDK proxy service with explicit config
 * Use this when you need to specify a different product's public_key
 */
export function useDuctapeSDKWithConfig(
  workspaceId: string | null,
  publicKey: string | null
): SDKProxyService | null {
  const { user } = useAuth();

  const sdk = useMemo(() => {
    if (!user?._id || !user?.auth_token || !workspaceId || !publicKey) {
      return null;
    }

    const config: SDKProxyConfig = {
      workspace_id: workspaceId,
      user_id: user._id,
      public_key: publicKey,
      token: user.auth_token,
    };

    return new SDKProxyService(config);
  }, [user?._id, user?.auth_token, workspaceId, publicKey]);

  return sdk;
}

/**
 * Hook to create SDK proxy service with full custom config
 */
export function useDuctapeSDKCustom(config: SDKProxyConfig | null): SDKProxyService | null {
  const sdk = useMemo(() => {
    if (!config?.workspace_id || !config?.user_id || !config?.token || !config?.public_key) {
      return null;
    }

    return new SDKProxyService(config);
  }, [config?.workspace_id, config?.user_id, config?.token, config?.public_key]);

  return sdk;
}

export default useDuctapeSDK;

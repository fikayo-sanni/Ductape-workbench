import { useMemo } from 'react';
import { SDKProxyService } from '@/services/sdkProxy';

export interface DuctapeVectorConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
}

/**
 * Hook to get the Ductape vector service for vector database operations
 *
 * IMPORTANT: This uses SDKProxyService which executes vector database
 * operations through the backend endpoint. Vector database drivers
 * cannot run in browsers, so we proxy all operations through a secure backend API.
 *
 * The interface is identical to ductape.vector, so existing code
 * will work without changes.
 */
export function useDuctapeVector(config: DuctapeVectorConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    // Use the SDKProxyService which proxies operations through the backend
    const proxyService = new SDKProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });

    // Return the vector interface from the proxy service
    // This matches the SDK's ductape.vector interface
    return proxyService.vector;
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

/**
 * Hook to get the full SDK proxy instance for advanced operations
 *
 * This returns the SDKProxyService which proxies all SDK operations
 * through the backend.
 */
export function useDuctapeVectorInstance(config: DuctapeVectorConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    return new SDKProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

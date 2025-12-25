import { useMemo } from 'react';
import { GraphProxyService } from '@/services/graphProxy';
import { SDKProxyService } from '@/services/sdkProxy';

export interface DuctapeGraphConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
}

/**
 * Hook to get the Ductape graph service for graph operations
 *
 * IMPORTANT: This uses GraphProxyService which executes graph
 * operations through the backend endpoint. The SDK's native graph drivers
 * (neo4j-driver, etc.) cannot run in browsers, so we proxy all operations
 * through a secure backend API.
 *
 * The interface is identical to ductape.graph, so existing code
 * will work without changes.
 */
export function useDuctapeGraph(config: DuctapeGraphConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    // Use the GraphProxyService which proxies operations through the backend
    const proxyService = new GraphProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });

    // Return the graph interface from the proxy service
    // This matches the SDK's ductape.graph interface
    return proxyService.graph;
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

/**
 * Hook to get the full SDK proxy instance for advanced operations
 *
 * This returns the SDKProxyService which proxies all SDK operations
 * through the backend.
 */
export function useDuctapeGraphInstance(config: DuctapeGraphConfig) {
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

/**
 * Hook to get the GraphProxyService directly
 * Useful when you need the full proxy service instance
 */
export function useGraphProxy(config: DuctapeGraphConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    return new GraphProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

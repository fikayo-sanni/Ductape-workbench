import { useMemo } from 'react';
import { DatabaseProxyService } from '@/services/databaseProxy';
import { SDKProxyService } from '@/services/sdkProxy';

export interface DuctapeDatabaseConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
}

/**
 * Hook to get the Ductape database service for database operations
 *
 * IMPORTANT: This uses DatabaseProxyService which executes database
 * operations through the backend endpoint. The SDK's native database drivers
 * (pg, mongodb, mysql2) cannot run in browsers, so we proxy all operations
 * through a secure backend API.
 *
 * The interface is identical to ductape.databases, so existing code
 * will work without changes.
 */
export function useDuctapeDatabase(config: DuctapeDatabaseConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    // Use the DatabaseProxyService which proxies operations through the backend
    const proxyService = new DatabaseProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });

    // Return the databases interface from the proxy service
    // This matches the SDK's ductape.databases interface
    return proxyService.databases;
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

/**
 * Hook to get the full SDK proxy instance for advanced operations
 *
 * This returns the SDKProxyService which proxies all SDK operations
 * through the backend. Use this for operations like sessions, features,
 * notifications, storage, etc.
 */
export function useDuctapeInstance(config: DuctapeDatabaseConfig) {
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
 * Hook to get the DatabaseProxyService directly
 * Useful when you need the full proxy service instance
 */
export function useDatabaseProxy(config: DuctapeDatabaseConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    return new DatabaseProxyService({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
    });
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

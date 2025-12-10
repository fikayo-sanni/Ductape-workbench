import { useMemo } from 'react';
import Ductape from '@ductape/sdk';
import { getEnvironmentType } from '@/helpers/index';
import { EnvType } from '@ductape/sdk/dist/types';

export interface DuctapeDatabaseConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
  env_type?: EnvType;
}

/**
 * Hook to get the Ductape database service for database operations
 * Returns the full Ductape instance's database service
 */
export function useDuctapeDatabase(config: DuctapeDatabaseConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    const ductape = new Ductape({
      workspace_id: config.workspace_id,
      user_id: config.user_id
    });
    ductape.setPublicKey(config.public_key);
    ductape.setToken(config.token);

    // Return the database service
    return ductape.databases;
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

/**
 * Hook to get the full Ductape instance for advanced operations
 */
export function useDuctapeInstance(config: DuctapeDatabaseConfig) {
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    const ductape = new Ductape({
      workspace_id: config.workspace_id,
      user_id: config.user_id
    });
    ductape.setPublicKey(config.public_key);
    ductape.setToken(config.token);

    return ductape;
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key]);
}

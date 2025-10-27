import { useMemo } from 'react';
import { connectDuctape } from '@/helpers/ductape';
import { getEnvironmentType } from '@/helpers/index';
import { EnvType } from '@ductape/sdk/dist/types';

export interface DuctapeConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
  env_type?: EnvType;
  type: 'product' | 'app';
}

export function useDuctape(config: DuctapeConfig) {
  // Validate required fields - return null if invalid (like frontend-app does)
  const isValidConfig = config.workspace_id && config.user_id && config.token && config.public_key;

  return useMemo(() => {
    if (!isValidConfig) {
      return null;
    }

    return connectDuctape({
      workspace_id: config.workspace_id,
      user_id: config.user_id,
      token: config.token,
      public_key: config.public_key,
      env_type: config.env_type || getEnvironmentType(),
      type: config.type,
    });
  }, [isValidConfig, config.workspace_id, config.user_id, config.token, config.public_key, config.env_type, config.type]);
}

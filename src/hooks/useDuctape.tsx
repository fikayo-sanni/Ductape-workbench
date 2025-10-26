import { useMemo } from 'react';
import { connectDuctape } from '@/helpers/ductape';
import { EnvType } from '@ductape/sdk/dist/types';

export interface DuctapeConfig {
  workspace_id: string;
  user_id: string;
  token: string;
  public_key: string;
  env_type?: EnvType;
  type: 'product' | 'app';
}

const getEnvironmentType = (): EnvType => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'dev' as EnvType;
  }

  if (hostname.includes('staging') || hostname.includes('stg')) {
    return 'stg' as EnvType;
  }

  return 'prd' as EnvType;
};

export function useDuctape(config: DuctapeConfig) {
  // Validate required fields
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

import { EnvType } from '@ductape/sdk/dist/types';

export const getEnvironmentType = () => {
  const env = import.meta.env.VITE_APP_ENV as EnvType;

  const envMap = {
    staging: EnvType.STAGING,
    production: EnvType.PRODUCTION,
  } as { [key: string]: EnvType };

  return envMap[env] || EnvType.LOCAL;
};

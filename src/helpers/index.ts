import { EnvType } from '@ductape/sdk/dist/types';

export const getEnvironmentType = () => {
  const env = import.meta.env.VITE_APP_ENV;

  const envMap = {
    production: EnvType.PRODUCTION,
    local: EnvType.SELF,
    self: EnvType.SELF,
  } as { [key: string]: EnvType };

  return envMap[env] || EnvType.PRODUCTION;
};

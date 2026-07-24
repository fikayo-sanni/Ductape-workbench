import { EnvType } from '@ductape/sdk/dist/types';

export const getEnvironmentType = () => {
  const env = import.meta.env.VITE_APP_ENV;

  return env === 'local' || env === 'self'
    ? EnvType.LOCAL
    : EnvType.PRODUCTION;
};

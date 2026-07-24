export const isSelfHosted = () => import.meta.env.VITE_APP_ENV === 'self';
export const appVersion = () => import.meta.env.VITE_APP_VERSION as string | undefined;

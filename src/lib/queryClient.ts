import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared instance so non-React modules (e.g. the auth store, to wipe
 * cached data on account switch) can reach it without a React context.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

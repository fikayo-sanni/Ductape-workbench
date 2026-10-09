import type { ReactNode } from 'react';

/** Reserve counter space while its source is loading; a real zero remains visible. */
export function LoadingValue({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading
    ? <span role="status" aria-label="Loading value" className="inline-block h-4 w-6 animate-pulse rounded bg-grey-300/60 align-middle dark:bg-grey-400/40" />
    : <>{children}</>;
}

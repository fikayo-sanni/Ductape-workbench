import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SDKProxyService } from '@/services/sdkProxy';
import {
  isLocalDevApiHost,
  resolveApiHostAddresses,
  resolveWorkbenchApiHostname,
} from '@/utils/cloudApiHost';

export function useDuctapeApiProxyIps(sdkProxy: SDKProxyService | null | undefined) {
  const apiHostname = useMemo(() => resolveWorkbenchApiHostname(), []);

  const query = useQuery({
    queryKey: ['cloud-networking-resolve-host', apiHostname],
    queryFn: () => resolveApiHostAddresses(apiHostname, sdkProxy!),
    enabled: Boolean(apiHostname && sdkProxy),
    staleTime: 1000 * 60 * 10,
  });

  const addresses =
    query.data?.addresses ||
    [];

  return {
    apiHostname,
    addresses,
    isLocalApi: isLocalDevApiHost(apiHostname),
    resolvingHost: query.isFetching,
    resolveHostError: query.isError,
    refetchHost: query.refetch,
  };
}

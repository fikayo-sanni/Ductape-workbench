import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { fetchConnectionBuilds, fetchConnectionDeployments, fetchProductDeployments, fetchProductEnvironments, type IDeployAuth } from '@/services/deployServices';
import { isBuildInFlight, isInFlight } from '@/utils/deployments';

const POLL_MS = 5000;

/** The signed-in person's access to the deploy control plane in the current workspace, or undefined when nobody is signed in. */
export function useDeployAuth(): IDeployAuth | undefined {
  const { user, currentWorkspaceId } = useAuth();
  return currentWorkspaceId && user?._id && user.public_key ? { workspaceId: currentWorkspaceId, userId: user._id, publicKey: user.public_key } : undefined;
}

/**
 * Every deployment of a product. The Deployments section and the product's side nav read it through the same query key, so the
 * counters and the list never disagree and the server is asked once. A deployment that is still moving is re-read until it settles.
 */
export function useProductDeployments(productTag: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deployments', auth?.workspaceId, productTag],
    queryFn: () => fetchProductDeployments(auth!, productTag!),
    enabled: Boolean(auth && productTag),
    refetchInterval: (query) => ((query.state.data ?? []).some((d) => isInFlight(d.state)) ? POLL_MS : false),
  });
}

export function useProductEnvironments(productTag: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deployment-environments', auth?.workspaceId, productTag],
    queryFn: () => fetchProductEnvironments(auth!, productTag!),
    enabled: Boolean(auth && productTag),
  });
}

/** What was applied through one cloud connection: its deployments, and the builds that ran through it. Re-read while either is moving. */
export function useConnectionDeployActivity(connectionTag: string | undefined, enabled: boolean) {
  const auth = useDeployAuth();
  const on = Boolean(auth && connectionTag && enabled);
  const deployments = useQuery({
    queryKey: ['connection-deployments', auth?.workspaceId, connectionTag],
    queryFn: () => fetchConnectionDeployments(auth!, connectionTag!),
    enabled: on,
    refetchInterval: (query) => ((query.state.data ?? []).some((d) => isInFlight(d.state)) ? POLL_MS : false),
  });
  const builds = useQuery({
    queryKey: ['connection-builds', auth?.workspaceId, connectionTag],
    queryFn: () => fetchConnectionBuilds(auth!, connectionTag!),
    enabled: on,
    refetchInterval: (query) => ((query.state.data ?? []).some((b) => isBuildInFlight(b.status)) ? POLL_MS : false),
  });
  return { deployments, builds };
}

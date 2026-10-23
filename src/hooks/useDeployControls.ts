import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useFetchWorkspaces } from '@/hooks/useWorkspaceQueries';
import { useSDKProxy } from '@/services/sdkProxy';
import {
  fetchBuilds, fetchCapabilities, fetchFunctions, fetchPlan, fetchPlans, fetchPolicyChanges, fetchReleases, fetchVersionHistory, fetchVersions,
} from '@/services/deployServices';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { accessLevelFor, type IConnectionLike } from '@/utils/deployControls';
import { cloudConnectionsQueryKey } from '@/utils/cloudConnectionQueryKeys';
import { isBuildInFlight } from '@/utils/deployments';

const POLL_MS = 5000;

/** What this control plane will do. Read once and kept; it only changes when the server is reconfigured. */
export function useDeployCapabilities() {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-capabilities', auth?.workspaceId],
    queryFn: () => fetchCapabilities(auth!),
    enabled: Boolean(auth),
    staleTime: 60_000,
  });
}

/** The signed-in person's access level in the current workspace, or undefined while it is not known. Never guessed. */
export function useWorkspaceAccessLevel(): string | undefined {
  const { user, currentWorkspaceId } = useAuth();
  const workspaces = useFetchWorkspaces({ user_id: user?._id ?? '', public_key: user?.public_key ?? '' });
  return accessLevelFor(workspaces.data, currentWorkspaceId);
}

export function useProductPlans(productTag: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-plans', auth?.workspaceId, productTag],
    queryFn: () => fetchPlans(auth!, { product: productTag }),
    enabled: Boolean(auth && productTag),
  });
}

export function usePlanDetail(planId: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-plan', auth?.workspaceId, planId],
    queryFn: () => fetchPlan(auth!, planId!),
    enabled: Boolean(auth && planId),
  });
}

export function useProductReleases(productTag: string | undefined, enabled = true) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-releases', auth?.workspaceId, productTag],
    queryFn: () => fetchReleases(auth!, productTag!),
    enabled: Boolean(auth && productTag && enabled),
  });
}

export function useProductFunctions(productTag: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-functions', auth?.workspaceId, productTag],
    queryFn: () => fetchFunctions(auth!, productTag!),
    enabled: Boolean(auth && productTag),
  });
}

export function useFunctionVersions(productTag: string | undefined, name: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-versions', auth?.workspaceId, productTag, name],
    queryFn: () => fetchVersions(auth!, productTag!, name!),
    enabled: Boolean(auth && productTag && name),
  });
}

export function useVersionHistory(productTag: string, name: string, version: string, enabled: boolean) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-version-history', auth?.workspaceId, productTag, name, version],
    queryFn: () => fetchVersionHistory(auth!, productTag, name, version),
    enabled: Boolean(auth && enabled),
  });
}

export function usePolicyHistory(productTag: string, env: string, enabled: boolean) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-policy-changes', auth?.workspaceId, productTag, env],
    queryFn: () => fetchPolicyChanges(auth!, productTag, env),
    enabled: Boolean(auth && enabled),
  });
}

/** The product's builds, re-read while any is still moving. */
export function useProductBuilds(productTag: string | undefined) {
  const auth = useDeployAuth();
  return useQuery({
    queryKey: ['deploy-builds', auth?.workspaceId, productTag],
    queryFn: () => fetchBuilds(auth!, productTag!),
    enabled: Boolean(auth && productTag),
    refetchInterval: (query) => ((query.state.data ?? []).some((b) => isBuildInFlight(b.status)) ? POLL_MS : false),
  });
}

/** The workspace's cloud connections, for choosing where a plan goes. Same list and key the Cloud section uses. */
export function useCloudConnectionsForDeploy(enabled = true) {
  const { user, currentWorkspaceId } = useAuth();
  const proxyConfig = currentWorkspaceId && user?._id
    ? { workspace_id: currentWorkspaceId, user_id: user._id, token: user.auth_token || '', public_key: user.public_key || '' }
    : null;
  const sdkProxy = useSDKProxy(proxyConfig);
  return useQuery({
    queryKey: cloudConnectionsQueryKey(currentWorkspaceId),
    queryFn: async (): Promise<IConnectionLike[]> => {
      if (!sdkProxy) return [];
      const res = await sdkProxy.cloud.connections.list();
      const rows = Array.isArray(res) ? res : (res as { data?: unknown[] } | undefined)?.data ?? [];
      return rows as IConnectionLike[];
    },
    enabled: Boolean(sdkProxy && currentWorkspaceId && enabled),
    staleTime: 30_000,
  });
}

const DEPLOY_KEYS = [
  'deployments', 'deployment-environments', 'deployment-journal', 'connection-deployments', 'connection-builds',
  'deploy-plans', 'deploy-plan', 'deploy-versions', 'deploy-functions', 'deploy-version-history', 'deploy-builds', 'deploy-policy-changes',
];

/** After any change, every list that could show it is read again, so no screen keeps showing what was true a moment ago. */
export function useRefreshDeploy(): () => Promise<void> {
  const client = useQueryClient();
  return async () => { await Promise.all(DEPLOY_KEYS.map((key) => client.invalidateQueries({ queryKey: [key] }))); };
}

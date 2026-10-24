import { useQuery } from '@tanstack/react-query';
import { fetchCapabilities, fetchPlans, fetchWorkspaceBuilds, fetchWorkspaceDeployments } from '@/services/deployServices';
import { useCloudConnectionsForDeploy } from '@/hooks/useDeployControls';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { isInFlight } from '@/utils/deployments';

const POLL_MS = 5000;

/**
 * What the dashboard's deployment and cloud connection summaries are made from, each read on its own so one failing does not blank the
 * other: the workspace's deployments, the plans waiting on a person, the builds, what the deploy server can do, and the cloud connections.
 * Deployments that are still moving are looked at again until they settle.
 */
export function useInfraSummaryData() {
  const auth = useDeployAuth();
  const deployments = useQuery({
    queryKey: ['deployments', auth?.workspaceId, 'workspace'],
    queryFn: () => fetchWorkspaceDeployments(auth!),
    enabled: Boolean(auth),
    refetchInterval: (query) => ((query.state.data ?? []).some((d) => isInFlight(d.state)) ? POLL_MS : 30_000),
  });
  const plans = useQuery({ queryKey: ['deploy-plans', auth?.workspaceId, 'workspace'], queryFn: () => fetchPlans(auth!, {}), enabled: Boolean(auth), refetchInterval: 30_000 });
  const builds = useQuery({ queryKey: ['deploy-builds', auth?.workspaceId, 'workspace'], queryFn: () => fetchWorkspaceBuilds(auth!), enabled: Boolean(auth), refetchInterval: 30_000 });
  const capabilities = useQuery({ queryKey: ['deploy-capabilities', auth?.workspaceId], queryFn: () => fetchCapabilities(auth!), enabled: Boolean(auth), staleTime: 60_000 });
  const connections = useCloudConnectionsForDeploy(true);
  return { deployments, plans, builds, capabilities, connections };
}

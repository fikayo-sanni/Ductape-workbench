import { useQuery } from '@tanstack/react-query';
import { fetchCapabilities, fetchPlans, fetchWorkspaceBuilds, fetchWorkspaceDeployments } from '@/services/deployServices';
import { useCloudConnectionsForDeploy } from '@/hooks/useDeployControls';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { isInFlight } from '@/utils/deployments';
import { deploymentsIndicator, type ITabIndicator } from '@/utils/dashboardTabs';
import { summarizeConnections, summarizeDeployments } from '@/utils/infraSummary';

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

/** A read that failed. A server that has no such endpoint (404) is not a failure: Deploy is not on every server. */
const readFailed = (query: { isError: boolean; error: unknown }): boolean =>
  query.isError && (query.error as { response?: { status?: number } } | null)?.response?.status !== 404;

/** How the Deployments & Cloud tab is doing, for the dashboard's tab bar, read from the same queries the tab itself uses. */
export function useDeploymentsIndicator(): ITabIndicator {
  const { deployments, plans, builds, capabilities, connections } = useInfraSummaryData();
  const caps = capabilities.data && typeof capabilities.data === 'object' && !Array.isArray(capabilities.data) && 'stepUp' in capabilities.data ? capabilities.data : undefined;
  const deployList = Array.isArray(deployments.data) ? deployments.data : [];
  const deploy = summarizeDeployments(deployList, Array.isArray(plans.data) ? plans.data : [], Array.isArray(builds.data) ? builds.data : []);
  const cloud = summarizeConnections(Array.isArray(connections.data) ? connections.data : [], caps, deployList);
  return deploymentsIndicator({
    deploymentsFailing: deploy.attention,
    failedBuilds: deploy.builds.failed,
    blockedPlans: deploy.plansBlocked,
    plansAwaitingApproval: deploy.plansAwaitingApproval,
    deployments: deploy.total,
    connections: cloud.total,
    connectionsBroken: cloud.rows.filter((row) => row.statusTone === 'bad').length,
    connectionsPending: cloud.rows.filter((row) => row.statusTone === 'warn').length,
    loadFailed: [deployments, plans, builds, connections].some(readFailed),
  });
}

import { useProductDeployments } from './useProductDeployments';
import { useWorkDeployReviews } from './useWorkDeployReviews';
import { deploymentActivity } from '@/utils/deploymentActivity';

/** Sidebar and content observe the same cached queries, including changes made through CLI/MCP. */
export function useDeploymentActivity(productTag?: string) {
  const deployments = useProductDeployments(productTag);
  const { plans } = useWorkDeployReviews(productTag, Boolean(productTag));
  return { ...deploymentActivity(deployments.data ?? [], plans.data ?? []), deployments, plans };
}

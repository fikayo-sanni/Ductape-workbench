import { isInFlight, type IDeployment } from './deployments';
import type { IPlanRow } from './deployControls';

/** Shared by the product navigation and deployment views; expired plans need no action. */
export function deploymentActivity(deployments: IDeployment[], plans: IPlanRow[], now = Date.now()) {
  const pending = plans.filter((plan) => ['pending_approval', 'approved', 'ready'].includes(plan.stage) && (!plan.expiresAt || !(Date.parse(plan.expiresAt) <= now)));
  return {
    pendingPlans: pending.length,
    needsApproval: pending.filter((plan) => plan.stage === 'pending_approval').length,
    readyToApply: pending.filter((plan) => plan.stage === 'approved' || plan.stage === 'ready').length,
    inProgress: deployments.filter((deployment) => isInFlight(deployment.state)).length,
  };
}

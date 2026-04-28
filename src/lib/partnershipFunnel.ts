import type { IPartnership, IOnboardingStep, ISalesFunnelStep } from '@/types/partnership';

/**
 * Funnel steps for UI: prefer `sales_funnels` from the API, otherwise derive from
 * the product brief's `onboarding_steps` (workbench stores funnel shape there
 * and a separate sales_funnels row may not exist).
 */
export function getPartnershipFunnelSteps(partnership: IPartnership): ISalesFunnelStep[] {
  const fromFunnel = partnership.salesFunnel?.steps;
  if (Array.isArray(fromFunnel) && fromFunnel.length > 0) {
    return fromFunnel;
  }
  const ob = partnership.productBrief?.onboarding_steps;
  if (Array.isArray(ob) && ob.length > 0) {
    return (ob as IOnboardingStep[]).map((s, i) => ({
      name: s.name,
      description: s.description,
      message_template: s.message_template ?? '',
      order: i,
    }));
  }
  return [];
}

export function getPartnershipFunnelStepCount(partnership: IPartnership): number {
  return getPartnershipFunnelSteps(partnership).length;
}

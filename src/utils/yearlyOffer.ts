/** Whether and how to offer a workspace that pays monthly the choice to pay yearly. Nothing here touches the network or the screen. */

export interface IYearlyOffer {
  monthly: number;
  /** What is charged up front for twelve months. */
  yearlyTotal: number;
  /** What twelve months of monthly payments would cost, less the yearly total. */
  saving: number;
  discountPercent: number;
}

interface PlanLike { monthlyPrice?: number | null; isPayAsYouGo?: boolean; isEnterprise?: boolean; annualDiscountPercent?: number; annualBillingEnabled?: boolean }
interface SubscriptionLike { billingCycle?: string; status?: string; cancelAtPeriodEnd?: boolean }

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The offer to switch to yearly, or null when there is none to make: the workspace already pays yearly, is not active, has cancelled,
 * is on a plan that is free, by contract or pay as you go, or the plan does not offer yearly billing (the pricing service switches it on per
 * plan once it is ready; a server that does not know about it would reject the request).
 */
export function yearlyOffer(plan: PlanLike | null | undefined, subscription: SubscriptionLike | null | undefined): IYearlyOffer | null {
  if (!plan || !subscription) return null;
  if (subscription.billingCycle === 'annual' || subscription.cancelAtPeriodEnd) return null;
  if (subscription.status && subscription.status !== 'active') return null;
  if (plan.isPayAsYouGo || plan.isEnterprise) return null;
  const monthly = plan.monthlyPrice ?? 0;
  if (!(monthly > 0)) return null;
  if (plan.annualBillingEnabled !== true || typeof plan.annualDiscountPercent !== 'number') return null;
  const yearlyTotal = round2(monthly * 12 * (1 - plan.annualDiscountPercent / 100));
  return { monthly, yearlyTotal, saving: round2(monthly * 12 - yearlyTotal), discountPercent: plan.annualDiscountPercent };
}

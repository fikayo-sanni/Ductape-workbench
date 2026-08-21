// Utility functions for onboarding management

export const markUserAsNew = () => {
  localStorage.setItem('ductape-is-new-user', 'true');
};

export const isNewUser = (): boolean => {
  return localStorage.getItem('ductape-is-new-user') === 'true';
};

export const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem('ductape-onboarding-completed') === 'true';
};

export const resetOnboarding = () => {
  localStorage.removeItem('ductape-onboarding-completed');
  localStorage.removeItem('ductape-is-new-user');
};

export const shouldShowOnboarding = (): boolean => {
  return isNewUser() && !hasCompletedOnboarding();
};

export const markOnboardingCompleted = () => {
  localStorage.setItem('ductape-onboarding-completed', 'true');
  localStorage.removeItem('ductape-is-new-user');
  localStorage.removeItem('ductape-onboarding-step');
  localStorage.removeItem('ductape-onboarding-data');
  clearOnboardingSession();
};

export function clearOnboardingSession() {
  sessionStorage.removeItem('onboardingStep');
  sessionStorage.removeItem('onboardingWorkspaceId');
  sessionStorage.removeItem('onboardingPlanId');
  sessionStorage.removeItem('onboardingPayment');
  sessionStorage.removeItem('pendingPlanId');
  sessionStorage.removeItem('onboardingWorkspaceLocked');
  sessionStorage.removeItem('onboardingFromInvites');
}

export function isOnboardingFromInvites(): boolean {
  return sessionStorage.getItem('onboardingFromInvites') === 'true';
}

export function clearOnboardingFromInvites() {
  sessionStorage.removeItem('onboardingFromInvites');
}

export function isOnboardingWorkspaceLocked(): boolean {
  return sessionStorage.getItem('onboardingWorkspaceLocked') === 'true';
}

export function markOnboardingWorkspaceLocked() {
  sessionStorage.setItem('onboardingWorkspaceLocked', 'true');
}

/** Reset cross-workspace onboarding progress and pin the flow to the selected workspace. */
export function prepareOnboardingForWorkspace(workspaceId: string) {
  clearOnboardingSession();
  sessionStorage.setItem('onboardingWorkspaceId', workspaceId);
  sessionStorage.setItem('onboardingWorkspaceLocked', 'true');
}

export type OnboardingStep = 'workspace' | 'plan' | 'billing' | 'complete' | 'license';

export function getInitialOnboardingStep(): OnboardingStep {
  const saved = sessionStorage.getItem('onboardingStep') as OnboardingStep | null;
  const hasWorkspace =
    Boolean(sessionStorage.getItem('onboardingWorkspaceId')) || isOnboardingWorkspaceLocked();

  if (hasWorkspace) {
    if (saved && saved !== 'workspace') return saved;
    return 'plan';
  }

  return saved || 'workspace';
}

// Trigger onboarding for new users (call this after successful registration)
export const triggerOnboardingForNewUser = () => {
  markUserAsNew();
  localStorage.removeItem('ductape-onboarding-completed');
};

export function isTestPlan(plan: { name?: string; tag?: string }): boolean {
  const name = plan.name?.trim().toLowerCase() ?? '';
  const tag = plan.tag?.trim().toLowerCase() ?? '';
  return name === 'test plan' || tag === 'test-plan' || tag === 'test';
}

// Fixed onboarding display order. The plans API has no sort of its own
// (Mongo returns natural order), so this order must be enforced here.
const ONBOARDING_PLAN_ORDER = ['free', 'beginner', 'startup', 'pay as you go'];

function onboardingPlanRank(plan: { name?: string }): number {
  const name = plan.name?.trim().toLowerCase() ?? '';
  const index = ONBOARDING_PLAN_ORDER.indexOf(name);
  return index === -1 ? ONBOARDING_PLAN_ORDER.length : index;
}

export function filterOnboardingPlans<T extends { name?: string; tag?: string }>(
  plans: T[],
  isAdminWorkspace: boolean,
): T[] {
  return plans
    .filter((plan) => {
      if (plan.name === 'Enterprise Plan') return false;
      if (isTestPlan(plan)) return isAdminWorkspace;
      return true;
    })
    .sort((a, b) => onboardingPlanRank(a) - onboardingPlanRank(b));
}

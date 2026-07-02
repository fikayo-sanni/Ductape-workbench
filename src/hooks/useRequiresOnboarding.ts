import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useFetchWorkspaces } from '@/hooks/useWorkspaceQueries';
import {
  filterAcceptedWorkspaceRows,
  filterPendingWorkspaceRows,
} from '@/services/workspaceServices';
import pricingServices from '@/services/pricingServices';
import { hasCompletedOnboarding, markOnboardingCompleted } from '@/utils/onboarding';
export function useRequiresOnboarding() {
  const { user, currentWorkspaceId } = useAuth();
  const isAuthenticated = Boolean(user?._id && user?.public_key);

  const {
    data: workspacesData,
    isFetched: workspacesFetched,
    isLoading: workspacesLoading,
  } = useFetchWorkspaces({
    user_id: user?._id ?? '',
    public_key: user?.public_key ?? '',
  });

  const allWorkspaces = workspacesData?.data ?? [];

  const acceptedWorkspaces = useMemo(
    () => filterAcceptedWorkspaceRows(allWorkspaces),
    [allWorkspaces],
  );

  const pendingInvites = useMemo(
    () => filterPendingWorkspaceRows(allWorkspaces),
    [allWorkspaces],
  );

  const workspaceId =
    currentWorkspaceId ||
    acceptedWorkspaces.find((w) => w.default)?.workspace_id ||
    acceptedWorkspaces[0]?.workspace_id ||
    null;

  const {
    data: billingReport,
    isFetched: billingFetched,
    isError: billingError,
  } = useQuery({
    queryKey: ['onboarding-billing-report', workspaceId, user?._id],
    queryFn: () =>
      pricingServices.fetchBillingReport({
        user_id: user!._id,
        public_key: user!.public_key,
        workspace_id: workspaceId!,
      }),
    enabled: isAuthenticated && Boolean(workspaceId),
    retry: false,
  });

  const hasSubscription = Boolean(billingReport?.data && billingReport.status);

  // Auto-mark onboarding complete when the API confirms an active subscription.
  // Without this, returning users on a new browser/device (no localStorage flag)
  // get re-routed to the onboarding flow even though they're already subscribed.
  useEffect(() => {
    if (hasSubscription && !hasCompletedOnboarding()) {
      markOnboardingCompleted();
    }
  }, [hasSubscription]);

  if (!isAuthenticated) {
    return {
      isLoading: false,
      needsOnboarding: false,
      needsPendingInvitesScreen: false,
      workspaceId: null,
      acceptedWorkspaces: [],
      pendingInvites: [],
      hasSubscription: false,
      workspacesFetched: false,
      hasWorkspaceAccess: false,
    };
  }

  const isLoading =
    workspacesLoading ||
    !workspacesFetched ||
    (Boolean(workspaceId) && !billingFetched && !billingError);

  const needsPendingInvitesScreen =
    workspacesFetched &&
    acceptedWorkspaces.length === 0 &&
    pendingInvites.length > 0;

  const needsOnboarding =
    workspacesFetched &&
    !needsPendingInvitesScreen &&
    (acceptedWorkspaces.length === 0 ||
      (Boolean(workspaceId) && !billingError && !hasSubscription));

  return {
    isLoading,
    needsOnboarding,
    needsPendingInvitesScreen,
    workspaceId,
    acceptedWorkspaces,
    pendingInvites,
    hasSubscription,
    workspacesFetched,
    hasWorkspaceAccess: acceptedWorkspaces.length > 0,
  };
}

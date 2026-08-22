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
    isError: workspacesError,
    refetch: refetchWorkspaces,
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
    data: subscriptionResponse,
    isFetched: subscriptionFetched,
    isError: subscriptionError,
  } = useQuery({
    queryKey: ['onboarding-workspace-subscription', workspaceId, user?._id],
    queryFn: () =>
      pricingServices.fetchWorkspaceSubscription({
        user_id: user!._id,
        public_key: user!.public_key,
        workspace_id: workspaceId!,
      }),
    enabled: isAuthenticated && Boolean(workspaceId),
    retry: false,
  });

  // Onboarding checks completed setup, not whether usage billing can currently
  // generate a report. A reporting outage must not erase a subscription.
  const hasSubscription = Boolean(subscriptionResponse?.data?.subscription?._id);

  // Auto-mark onboarding complete when the API confirms subscription setup.
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
      hasLoadError: false,
      retryLoad: refetchWorkspaces,
    };
  }

  const isLoading =
    workspacesLoading ||
    !workspacesFetched ||
    (Boolean(workspaceId) && !subscriptionFetched && !subscriptionError);

  const needsPendingInvitesScreen =
    workspacesFetched &&
    !workspacesError &&
    acceptedWorkspaces.length === 0 &&
    pendingInvites.length > 0;

  // A failed workspaces fetch (network/API outage) must not be read as "user has no
  // workspaces" — that would wrongly send an existing, already-onboarded user through
  // onboarding just because their workspace list failed to load.
  const needsOnboarding =
    workspacesFetched &&
    !workspacesError &&
    !needsPendingInvitesScreen &&
    (acceptedWorkspaces.length === 0 ||
      (Boolean(workspaceId) && !subscriptionError && !hasSubscription));

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
    hasLoadError: workspacesFetched && workspacesError,
    retryLoad: refetchWorkspaces,
  };
}

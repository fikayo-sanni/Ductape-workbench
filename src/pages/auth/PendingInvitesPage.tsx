import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader,
  Mail,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import workspaceServices, { type Workspace } from '@/services/workspaceServices';
import { useRequiresOnboarding } from '@/hooks/useRequiresOnboarding';
import RequireAuth from '@/components/auth/RequireAuth';
import { clearOnboardingSession } from '@/utils/onboarding';

function formatAccessLevel(level?: string) {
  if (!level) return 'Member';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function PendingInvitesFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setCurrentWorkspaceId } = useAuth();
  const { pendingInvites, acceptedWorkspaces, isLoading, needsPendingInvitesScreen } =
    useRequiresOnboarding();
  const [enteringWorkspaceId, setEnteringWorkspaceId] = useState<string | null>(null);
  const [recentlyAccepted, setRecentlyAccepted] = useState<Record<string, string>>({});

  const invites = useMemo(() => pendingInvites as Workspace[], [pendingInvites]);

  const respondMutation = useMutation({
    mutationFn: (params: { access_id: string; action: 'accept' | 'reject' }) =>
      workspaceServices.respondToInvite({
        access_id: params.access_id,
        action: params.action,
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', user?._id] });

      if (variables.action === 'accept') {
        const workspaces = response?.data?.workspaces ?? [];
        const acceptedRow = workspaces.find(
          (row) => row._id === variables.access_id && row.accepted !== false,
        );
        const workspaceId =
          acceptedRow?.workspace_id ||
          invites.find((invite) => invite._id === variables.access_id)?.workspace_id;

        if (workspaceId) {
          setRecentlyAccepted((prev) => ({
            ...prev,
            [variables.access_id]: workspaceId,
          }));
        }
        toast.success('Invite accepted');
        return;
      }

      toast.success('Invite declined');
    },
    onError: (error: unknown) => {
      const axiosData = (error as { response?: { data?: Record<string, unknown> } })?.response
        ?.data;
      const message =
        (error instanceof Error && error.message) ||
        (typeof axiosData?.errors === 'string' && axiosData.errors) ||
        (typeof axiosData?.error === 'string' && axiosData.error) ||
        (typeof axiosData?.message === 'string' && axiosData.message) ||
        'Failed to update invite';
      toast.error(message);
    },
  });

  async function handleEnterWorkspace(workspaceId: string) {
    if (!user?._id || !user.public_key) return;

    setEnteringWorkspaceId(workspaceId);
    try {
      await workspaceServices.changeDefaultWorkspace({
        user_id: user._id,
        public_key: user.public_key,
        workspace_id: workspaceId,
      });
      setCurrentWorkspaceId(workspaceId);
      await queryClient.invalidateQueries({ queryKey: ['workspaces', user._id] });
      navigate('/', { replace: true });
    } catch {
      toast.error('Failed to open workspace');
    } finally {
      setEnteringWorkspaceId(null);
    }
  }

  function handleCreateWorkspace() {
    clearOnboardingSession();
    sessionStorage.setItem('onboardingFromInvites', 'true');
    navigate('/onboarding', { replace: true });
  }

  if (!isLoading && !needsPendingInvitesScreen) {
    if (acceptedWorkspaces.length > 0) {
      navigate('/', { replace: true });
      return null;
    }
    navigate('/onboarding', { replace: true });
    return null;
  }

  return (
    <div data-testid="pending-invites-page" className="w-full max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-grey tracking-tight">
          Workspace invitations
        </h1>
        <p className="text-sm sm:text-base text-grey-600 max-w-xl mx-auto">
          You do not have an active workspace yet. Accept an invitation below or create your own
          workspace to get started.
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-xl border border-grey-400 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-grey-600">No pending invitations right now.</p>
          </div>
        ) : (
          invites.map((invite) => {
            const acceptedWorkspaceId = recentlyAccepted[invite._id];
            const isResponding =
              respondMutation.isPending &&
              respondMutation.variables?.access_id === invite._id;

            return (
              <div
                key={invite._id}
                className="rounded-xl border border-grey-400 bg-white p-4 sm:p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-grey truncate">
                        {invite.workspace_name || 'Workspace'}
                      </p>
                      {invite.description ? (
                        <p className="text-sm text-grey-600 mt-0.5 line-clamp-2">
                          {invite.description}
                        </p>
                      ) : null}
                      <p className="text-xs text-grey-600 mt-1">
                        Role: {formatAccessLevel(invite.access_level)}
                      </p>
                    </div>
                  </div>

                  {acceptedWorkspaceId ? (
                    <div className="flex flex-col sm:items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green">
                        <CheckCircle2 className="h-4 w-4" />
                        Accepted
                      </span>
                      <Button
                        onClick={() => handleEnterWorkspace(acceptedWorkspaceId)}
                        disabled={enteringWorkspaceId === acceptedWorkspaceId}
                        className="shadow-sm"
                      >
                        {enteringWorkspaceId === acceptedWorkspaceId ? (
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Open workspace
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        variant="outline"
                        className="border-grey-400"
                        disabled={isResponding}
                        onClick={() =>
                          respondMutation.mutate({
                            access_id: invite._id,
                            action: 'reject',
                          })
                        }
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Decline
                      </Button>
                      <Button
                        disabled={isResponding}
                        onClick={() =>
                          respondMutation.mutate({
                            access_id: invite._id,
                            action: 'accept',
                          })
                        }
                        className="shadow-sm"
                      >
                        {isResponding ? (
                          <Loader className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        )}
                        Accept
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className={cn(
          'rounded-xl border border-dashed border-grey-400 bg-white/80 p-5 sm:p-6 shadow-sm',
          'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
        )}
      >
        <div>
          <p className="font-semibold text-grey">Prefer to start fresh?</p>
          <p className="text-sm text-grey-600 mt-1">
            Create your own workspace and complete setup with plan selection and billing.
          </p>
        </div>
        <Button variant="outline" onClick={handleCreateWorkspace} className="shrink-0 border-primary/40">
          <Plus className="h-4 w-4 mr-2" />
          Create new workspace
        </Button>
      </div>
    </div>
  );
}

export default function PendingInvitesPage() {
  return (
    <RequireAuth>
      <PendingInvitesFlow />
    </RequireAuth>
  );
}

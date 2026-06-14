import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Inbox, Loader } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import appServicesReal from '@/services/appServicesReal';
import ReviewFeedbackPanel from '@/components/marketplace/ReviewFeedbackPanel';
import { buildReviewFeedbackResourcesFromApp } from '@/lib/reviewFeedback';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { IApp } from '@/types/app';

function statusLabel(status?: string) {
  switch (status) {
    case 'pending_review':
      return 'Pending review';
    case 'rejected':
      return 'Rejected';
    default:
      return status ?? 'Unknown';
  }
}

function statusClass(status?: string) {
  switch (status) {
    case 'pending_review':
      return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
    case 'rejected':
      return 'bg-red-500/10 text-red-800 border-red-500/20';
    default:
      return 'bg-grey-100 text-grey-600 border-grey-300';
  }
}

export default function MarketplaceSubmissionsView() {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const { data: pendingRes, status: pendingStatus } = useQuery({
    queryKey: ['marketplace-submissions', currentWorkspaceId, 'pending_review'],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId!,
        status: 'pending_review',
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  const { data: rejectedRes, status: rejectedStatus } = useQuery({
    queryKey: ['marketplace-submissions', currentWorkspaceId, 'rejected'],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId!,
        status: 'rejected',
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  const { data: selectedAppDetails } = useQuery({
    queryKey: ['submission-app-details', selectedAppId, currentWorkspaceId],
    queryFn: () =>
      appServicesReal.fetchApp({
        app_id: selectedAppId!,
        user_id: user!._id,
        public_key: user!.public_key,
      }),
    enabled: !!selectedAppId && !!user?._id && !!user?.public_key,
  });

  const submissions = useMemo(() => {
    const pending = pendingRes?.data ?? [];
    const rejected = rejectedRes?.data ?? [];
    return [...pending, ...rejected].sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0).getTime()
        - new Date(a.updated_at || a.created_at || 0).getTime(),
    );
  }, [pendingRes, rejectedRes]);

  const isLoading = pendingStatus === 'pending' || rejectedStatus === 'pending';
  const selectedApp = submissions.find((app) => app._id === selectedAppId) as IApp | undefined;
  const fullApp = selectedAppDetails?.data ?? selectedApp;
  const resourceOptions = buildReviewFeedbackResourcesFromApp(fullApp);

  const authorName = user
    ? [user.firstname, user.lastname].filter(Boolean).join(' ')
    : 'Workspace member';

  const canPost = selectedApp?.status === 'pending_review' || selectedApp?.status === 'rejected';

  const handleViewApp = async () => {
    if (!selectedApp || !user?._id || !user?.public_key) {
      toast.error('Unable to open app');
      return;
    }

    try {
      const response = selectedAppDetails?.data
        ? { data: selectedAppDetails.data }
        : await appServicesReal.fetchApp({
            app_id: selectedApp._id,
            user_id: user._id,
            public_key: user.public_key,
          });

      if (response?.data) {
        openTab({
          id: `app-${selectedApp._id}`,
          type: 'app',
          title: selectedApp.app_name ?? selectedApp.tag ?? 'App',
          itemId: selectedApp._id,
          data: response.data,
        });
      }
    } catch {
      toast.error('Failed to open app');
    }
  };

  if (!currentWorkspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-grey-600">
        Select a workspace to view your marketplace submissions.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-full max-w-sm border-r border-grey-400/30 bg-white flex flex-col">
        <div className="p-4 border-b border-grey-400/30">
          <h2 className="text-sm font-semibold text-grey">My submissions</h2>
          <p className="text-xs text-grey-600 mt-1">Apps awaiting review or recently rejected</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {submissions.length === 0 ? (
            <div className="m-2 rounded-xl border border-dashed border-grey-400/50 px-4 py-10 text-center">
              <Inbox className="h-8 w-8 mx-auto mb-3 text-grey-600/60" />
              <p className="text-sm font-medium text-grey">No submissions in review</p>
              <p className="text-xs text-grey-600 mt-1">
                When you submit an app for public marketplace listing, it will appear here.
              </p>
            </div>
          ) : (
            submissions.map((app) => {
              const isSelected = selectedAppId === app._id;
              return (
                <button
                  key={app._id}
                  type="button"
                  onClick={() => setSelectedAppId(app._id)}
                  className={cn(
                    'w-full text-left rounded-xl border px-3 py-3 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-grey-400/30 hover:border-primary/30 hover:bg-grey-100/40',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {app.logo ? (
                      <img src={app.logo} alt="" className="h-10 w-10 rounded-lg object-cover border border-grey-400/30" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                        {(app.app_name ?? app.tag ?? '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-grey truncate">{app.app_name ?? app.tag}</p>
                      <span className={cn('inline-flex mt-1 text-[10px] font-medium px-2 py-0.5 rounded border', statusClass(app.status))}>
                        {statusLabel(app.status)}
                      </span>
                      <p className="text-[10px] text-grey-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {format(new Date(app.updated_at || app.created_at || 0), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-grey-100/50">
        {!selectedApp ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-sm font-medium text-grey">Select a submission</p>
              <p className="text-xs text-grey-600 mt-1">
                Choose an app on the left to view review feedback and reply to the admin team.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="rounded-xl border border-grey-400/30 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-grey">{selectedApp.app_name ?? selectedApp.tag}</h2>
                  {selectedApp.description && (
                    <p className="text-sm text-grey-600 mt-1">{selectedApp.description}</p>
                  )}
                </div>
                <span className={cn('text-[10px] font-medium px-2 py-1 rounded border shrink-0', statusClass(selectedApp.status))}>
                  {statusLabel(selectedApp.status)}
                </span>
              </div>
              {selectedApp.status === 'rejected' && (
                <p className="text-xs text-red-700 mt-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                  This submission was rejected. Address the feedback below, update your app, and submit again for review.
                </p>
              )}
            </div>

            <ReviewFeedbackPanel
              appId={selectedApp._id}
              canPost={canPost}
              viewerRole="workspace"
              resourceOptions={resourceOptions}
              onViewApp={() => void handleViewApp()}
              queryKey={['workbench-review-feedback', selectedApp._id, currentWorkspaceId]}
              fetchMessages={async () => {
                const res = await appServicesReal.listReviewFeedback({
                  app_id: selectedApp._id,
                  workspace_id: currentWorkspaceId,
                  user_id: user!._id,
                  public_key: user!.public_key,
                });
                return res.data ?? [];
              }}
              postMessage={async (payload) => {
                await appServicesReal.postReviewFeedback({
                  app_id: selectedApp._id,
                  workspace_id: currentWorkspaceId,
                  user_id: user!._id,
                  public_key: user!.public_key,
                  author_name: authorName,
                  ...payload,
                });
              }}
            />

            {selectedApp.status === 'pending_review' && (
              <p className="text-xs text-grey-600 text-center">
                Your app is in the review queue. An admin will approve or request changes via the feedback thread above.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

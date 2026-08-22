import { Navigate } from 'react-router-dom';
import { useRequiresOnboarding } from '@/hooks/useRequiresOnboarding';
import { Loader, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const { isLoading, needsOnboarding, needsPendingInvitesScreen, hasLoadError, retryLoad } =
    useRequiresOnboarding();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-grey-100">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-grey-100">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm px-4">
          <AlertTriangle className="h-8 w-8 text-red" />
          <p className="text-sm font-medium text-grey">Failed to load your workspace</p>
          <p className="text-xs text-grey-600">
            We couldn't reach Ductape to load your account. Check your connection and try again.
          </p>
          <Button onClick={() => retryLoad()} size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (needsPendingInvitesScreen) {
    return <Navigate to="/pending-invites" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

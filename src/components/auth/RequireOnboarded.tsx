import { Navigate } from 'react-router-dom';
import { useRequiresOnboarding } from '@/hooks/useRequiresOnboarding';
import { Loader } from 'lucide-react';

export default function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const { isLoading, needsOnboarding, needsPendingInvitesScreen } = useRequiresOnboarding();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-grey-100">
        <Loader className="h-8 w-8 animate-spin text-primary" />
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

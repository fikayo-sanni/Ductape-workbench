import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';
import { useRequiresOnboarding } from '@/hooks/useRequiresOnboarding';
import { Loader } from 'lucide-react';

export default function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const { isLoading, needsOnboarding, needsPendingInvitesScreen } = useRequiresOnboarding();

  if (!token || !user) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
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

  return <Navigate to="/" replace />;
}

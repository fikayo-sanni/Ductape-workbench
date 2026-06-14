import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

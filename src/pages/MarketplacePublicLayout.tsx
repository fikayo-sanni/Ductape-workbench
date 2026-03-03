import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useLoginModalStore } from '@/stores/login-modal-store';

export default function MarketplacePublicLayout() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModalStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-grey-100">
      <div className="sticky top-0 z-40 bg-white border-b border-grey-400">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/marketplace" className="flex items-center gap-2 text-grey">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold">Ductape Marketplace</div>
              <div className="text-xs text-grey-600">Discover and share apps</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-grey-600 hover:text-grey">
              Workbench
            </Link>
            {user ? (
              <Button variant="outline" size="sm">
                {user.email}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  localStorage.setItem('postLoginReturnTo', location.pathname + location.search);
                  openLoginModal();
                }}
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}


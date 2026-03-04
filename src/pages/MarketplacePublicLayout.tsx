import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { useLoginModalStore } from '@/stores/login-modal-store';

export default function MarketplacePublicLayout() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModalStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-grey-100 font-sans">
      {/* Workbench-aligned Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-grey-400 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/marketplace" className="flex items-center gap-2 group">
              <div className="w-9 h-9 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                  <path d="M14 10C10 10 8 14 8 18V22C8 24 6 26 6 26C6 26 8 28 8 30V34C8 38 10 42 14 42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="text-primary" />
                  <path d="M34 10C38 10 40 14 40 18V22C40 24 42 26 42 26C42 26 40 28 40 30V34C40 38 38 42 34 42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="text-primary" />
                  <path d="M16 20H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
                  <path d="M16 26H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
                  <path d="M16 32H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
                  <circle cx="16" cy="20" r="2" fill="currentColor" className="text-primary" />
                  <circle cx="32" cy="26" r="2" fill="currentColor" className="text-primary" />
                  <circle cx="16" cy="32" r="2" fill="currentColor" className="text-primary" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-grey text-base">Ductape Marketplace</div>
                <div className="text-[11px] text-grey-600 font-medium">Discover and integrate powerful apps</div>
              </div>
            </Link>

            {location.pathname.startsWith('/marketplace/app/') && (
              <Link
                to="/marketplace"
                className="flex items-center gap-2 text-sm font-semibold text-grey-600 hover:text-primary transition-colors py-1.5 px-3 rounded-md hover:bg-grey-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Store</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-semibold text-grey-600 hover:text-primary transition-colors">
              Workbench
            </Link>
            <div className="h-4 w-[1px] bg-grey-400" />
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-grey-600">{user.email}</span>
                <Button variant="outline" size="sm" className="rounded-md h-8 text-xs font-semibold border-grey-400">
                  Dashboard
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="h-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-xs"
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

      <main className="">
        <Outlet />
      </main>
    </div>
  );
}

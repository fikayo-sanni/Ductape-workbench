import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { DuctapeLogo } from '@/components/auth/DuctapeBrand';
import { Button } from '@/components/ui/button';
import { Store, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/store/useAuth';

export default function MarketplacePublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-grey-100 font-sans">
      {/* Workbench-aligned Header */}
      <div data-testid="marketplace-header" className="sticky top-0 z-50 bg-white border-b border-grey-400 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/marketplace" className="flex items-center gap-2 group">
              <div className="w-9 h-9 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <DuctapeLogo />
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
                  navigate('/login');
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

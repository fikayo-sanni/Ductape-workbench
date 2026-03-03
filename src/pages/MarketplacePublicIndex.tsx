import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, Grid3x3, List, Search, Store } from 'lucide-react';
import marketplaceServices from '@/services/marketplaceServices';
import AppCard from '@/components/marketplace/AppCard';
import MarketplaceSidebar from '@/components/marketplace/MarketplaceSidebar';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';
import { useAuth } from '@/store/useAuth';
import { useLoginModalStore } from '@/stores/login-modal-store';

export default function MarketplacePublicIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModalStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data: domainsRes, status: domainsStatus } = useQuery({
    queryKey: ['marketplace-domains-public'],
    queryFn: () => marketplaceServices.fetchDomains(),
  });
  const domains = domainsRes?.data ?? [];

  const { data: appsRes, status: appsStatus } = useQuery({
    queryKey: ['marketplace-apps-public', selectedDomain],
    queryFn: () =>
      selectedDomain === 'all'
        ? marketplaceServices.fetchAppByDomains('')
        : marketplaceServices.fetchAppByDomains(selectedDomain),
    enabled: true,
  });

  const apps = appsRes?.data ?? [];

  const sortedApps = useMemo(() => {
    const searchLowerCase = search.toLowerCase();
    const filtered = apps.filter((app: any) => {
      const name = (app.app_name ?? '').toLowerCase();
      const domainText = Array.isArray(app.domains) ? app.domains.join(' ') : '';
      const tag = (app.tag ?? '').toLowerCase();
      return (
        name.includes(searchLowerCase) ||
        domainText.toLowerCase().includes(searchLowerCase) ||
        tag.includes(searchLowerCase)
      );
    });

    return [...filtered].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name':
          return (a.app_name || '').localeCompare(b.app_name || '');
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });
  }, [apps, search, sortBy]);

  const openAppDetails = (app: any) => {
    const tag = app.tag || app.domain_name;
    if (!tag) return;
    navigate(`/marketplace/app/${encodeURIComponent(tag)}`);
  };

  const integrateApp = (app: any) => {
    if (!user) {
      openLoginModal();
      return;
    }
    setSelectedApp(app);
    setIntegrationModalOpen(true);
  };

  return (
    <IntegrationProvider>
      <div className="flex bg-white rounded-lg border border-grey-400 overflow-hidden">
        <MarketplaceSidebar
          domains={domains}
          selectedDomain={selectedDomain}
          onDomainSelect={(id) => {
            setSelectedDomain(id);
            setIsMobileSidebarOpen(false);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 md:p-6 border-b border-grey-400">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-grey">
                    Marketplace
                  </h1>
                  <p className="text-sm text-grey-600">
                    Browse apps without logging in. Sign in when you’re ready to integrate.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="md:hidden gap-1.5"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search apps…"
                  className="pl-9"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created">Newest</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border border-grey-400 rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {domainsStatus === 'pending' || appsStatus === 'pending' ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                }
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                }
              >
                {sortedApps.map((app: any) => (
                  <AppCard
                    key={app._id}
                    app={app}
                    domains={domains}
                    viewMode={viewMode}
                    onClick={() => openAppDetails(app)}
                    onIntegrate={() => integrateApp(app)}
                  />
                ))}

                {sortedApps.length === 0 && (
                  <div className="text-center text-grey-600 py-10 col-span-full">
                    No apps found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedApp && (
        <AppIntegrationModal
          app={selectedApp}
          open={integrationModalOpen}
          onOpenChange={(open) => {
            setIntegrationModalOpen(open);
            if (!open) setSelectedApp(null);
          }}
        />
      )}
    </IntegrationProvider>
  );
}


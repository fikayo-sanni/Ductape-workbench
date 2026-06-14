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
import { Badge } from '@/components/ui/badge';
import { Filter, Grid3x3, List, Search, Store } from 'lucide-react';
import marketplaceServices from '@/services/marketplaceServices';
import AppCard from '@/components/marketplace/AppCard';
import MarketplaceSidebar from '@/components/marketplace/MarketplaceSidebar';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';
import { useAuth } from '@/store/useAuth';
import { cn } from '@/lib/utils';

export default function MarketplacePublicIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      navigate('/login');
      return;
    }
    setSelectedApp(app);
    setIntegrationModalOpen(true);
  };

  return (
    <IntegrationProvider>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Normalized Hero Section */}
          <section className="relative overflow-hidden rounded-lg bg-grey py-12 px-8">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl">
              <Badge className="mb-3 bg-white/10 text-white border-white/20 py-0.5 px-2 text-[10px] font-bold tracking-wider uppercase">
                Application Ecosystem
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Connect Your <span className="text-primary italic">Workflow</span>
              </h1>
              <p className="text-base text-grey-600 font-medium leading-relaxed mb-6">
                Empower your workspace with thousands of integrations.
                Built to help you automate and scale effortlessly.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 h-9 text-xs font-bold transition-all">
                  Browse Popular Apps
                </Button>
              </div>
            </div>
          </section>

          <div className="flex bg-white rounded-lg border border-grey-400 overflow-hidden shadow-sm min-h-[600px]">
            <MarketplaceSidebar
              domains={domains}
              selectedDomain={selectedDomain}
              onDomainSelect={(id) => {
                setSelectedDomain(id || 'all');
                setIsMobileSidebarOpen(false);
              }}
              isMobileOpen={isMobileSidebarOpen}
              onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <div className="p-4 md:p-6 border-b border-grey-400 bg-white/50">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-grey">
                      App Discovery
                    </h2>
                    <p className="text-grey-600 text-xs font-medium mt-0.5">
                      {sortedApps.length} tools for your workbench
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden rounded-md px-3 h-8 border-grey-400 font-semibold text-xs"
                    onClick={() => setIsMobileSidebarOpen(true)}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filter
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                    <Input
                      data-testid="marketplace-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search apps..."
                      className="pl-9 h-9 rounded-md border-grey-400 bg-white focus-visible:ring-primary/20 focus-visible:border-primary text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[150px] h-9 rounded-md border-grey-400 bg-white text-xs font-bold">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name" className="text-xs font-semibold">Alphabetical</SelectItem>
                        <SelectItem value="created" className="text-xs font-semibold">Newest</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex bg-grey-100 p-0.5 rounded-md border border-grey-400">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-sm transition-all",
                          viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-grey-600 hover:text-grey"
                        )}
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 rounded-sm transition-all",
                          viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-grey-600 hover:text-grey"
                        )}
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
                      <Skeleton key={i} className="h-44 w-full rounded-lg" />
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
                      <div className="text-center py-20 col-span-full">
                        <div className="w-12 h-12 bg-grey-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Store className="h-6 w-6 text-grey-600" />
                        </div>
                        <h3 className="text-sm font-bold text-grey">No apps found</h3>
                        <p className="text-grey-600 text-xs mt-1">Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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


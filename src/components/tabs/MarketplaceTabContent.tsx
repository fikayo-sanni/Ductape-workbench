import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
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
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Store,
  Loader,
} from 'lucide-react';
import marketplaceServices from '@/services/marketplaceServices';
import appServicesReal from '@/services/appServicesReal';
import { toast } from 'react-hot-toast';
import AppCard from '@/components/marketplace/AppCard';
import MarketplaceSidebar from '@/components/marketplace/MarketplaceSidebar';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';

export default function MarketplaceTabContent() {
  const { openTab } = useWorkbenchStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isLoadingAppDetails, setIsLoadingAppDetails] = useState(false);

  // Fetch domains
  const { data: domainsRes, status: domainsStatus } = useQuery({
    queryKey: ['marketplace-domains'],
    queryFn: () => marketplaceServices.fetchDomains(),
  });

  const domains = domainsRes?.data ?? [];

  // Fetch apps based on selected domain
  const { data: apps, status: appsStatus } = useQuery({
    queryKey: ['marketplace-apps', selectedDomain],
    queryFn: () =>
      selectedDomain === 'all'
        ? marketplaceServices.fetchAppByDomains('')
        : marketplaceServices.fetchAppByDomains(selectedDomain),
    enabled: !!domains.length,
  });

  const appsToDisplay = apps?.data ?? [];

  // Filter and sort apps
  const searchLowerCase = search.toLowerCase();
  const filteredApps = appsToDisplay.filter(app => {
    const appName = app.app_name?.toLowerCase() || '';
    const domainName = app.domain_name?.toLowerCase() || '';
    return (
      appName.includes(searchLowerCase) ||
      domainName.includes(searchLowerCase)
    );
  });

  // Sort apps based on selected criteria
  const sortedApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.app_name.localeCompare(b.app_name);
      case 'domain':
        return a.domain_name.localeCompare(b.domain_name);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const handleAppClick = async (app: any) => {
    // Fetch full app details before opening tab
    if (!user?._id || !user?.public_key) {
      toast.error('Authentication required');
      return;
    }

    try {
      setIsLoadingAppDetails(true);

      // Fetch full app data using the app's tag
      const appTag = app.domain_name || app.tag;
      const appDetailsResponse = await appServicesReal.fetchAppByTag({
        tag: appTag,
        user_id: user._id,
        public_key: user.public_key,
      });

      if (appDetailsResponse?.data) {
        // Open app details in a new tab with full data
        openTab({
          id: `marketplace-app-${app._id}-${Date.now()}`,
          type: 'app',
          title: app.app_name,
          itemId: app._id,
          data: { ...appDetailsResponse.data, isMarketplaceApp: true },
        });
      } else {
        toast.error('Failed to load app details');
      }
    } catch (error) {
      console.error('Error fetching app details:', error);
      toast.error('Failed to load app details');
    } finally {
      setIsLoadingAppDetails(false);
    }
  };

  const handleIntegrateApp = (app: any) => {
    setSelectedApp(app);
    setIntegrationModalOpen(true);
  };

  const getCurrentDomainName = () => {
    if (selectedDomain === 'all') return 'All Applications';
    const domain = domains.find(d => d._id === selectedDomain);
    return domain ? `${domain.domain_name.replace('-', ' ')} Applications` : 'All Applications';
  };

  if (domainsStatus === 'pending') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-grey-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-grey-100">
      {/* Sidebar */}
      <MarketplaceSidebar
        domains={domains}
        selectedDomain={selectedDomain}
        onDomainSelect={setSelectedDomain}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-grey-400 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-grey">
                  {getCurrentDomainName()}
                </h1>
                <p className="text-sm text-grey-600">
                  Discover and integrate applications
                </p>
              </div>
            </div>

            {/* Mobile sidebar toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="domain">Sort by Domain</SelectItem>
                <SelectItem value="created">Sort by Created</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border border-grey-400 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {appsStatus === 'pending' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-grey-400 p-6">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : sortedApps.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-grey-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-grey mb-2">No applications found</h3>
              <p className="text-grey-600">
                {search ? 'Try adjusting your search terms' : 'No applications available in this category'}
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {sortedApps.map((app) => (
                <AppCard
                  key={app._id}
                  app={app}
                  domains={domains}
                  onClick={() => handleAppClick(app)}
                  onIntegrate={() => handleIntegrateApp(app)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Integration Modal */}
      {selectedApp && (
        <IntegrationProvider>
          <AppIntegrationModal
            app={selectedApp}
            open={integrationModalOpen}
            onOpenChange={setIntegrationModalOpen}
          />
        </IntegrationProvider>
      )}
    </div>
  );
}

import MarketplaceHeader, { MarketplaceLayoutControl } from '@/components/marketplace/MarketplaceHeader';
import type { MarketplaceApp } from '@/services/marketplaceServices';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, Store, Loader, RefreshCw, X } from 'lucide-react';
import marketplaceServices from '@/services/marketplaceServices';
import appServicesReal from '@/services/appServicesReal';
import { toast } from 'react-hot-toast';
import AppCard from '@/components/marketplace/AppCard';
import MarketplaceSidebar, { type MarketplaceViewMode } from '@/components/marketplace/MarketplaceSidebar';
import MarketplaceSubmissionsView from '@/components/marketplace/MarketplaceSubmissionsView';
import AppIntegrationModal from '@/components/marketplace/AppIntegrationModal';
import { IntegrationProvider } from '@/context/integration-context';
import { isSelfHosted } from '@/helpers/env';
import { cn } from '@/lib/utils';
import HostedMarketplaceView from '@/components/marketplace/HostedMarketplaceView';

export function InstanceMarketplaceView() {
  const { openTab } = useWorkbenchStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [layoutView, setLayoutView] = useState<'grid' | 'list'>('grid');
  const [marketplaceSection, setMarketplaceSection] = useState<MarketplaceViewMode>('browse');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [isLoadingAppDetails, setIsLoadingAppDetails] = useState(false);

  // Fetch domains
  const { data: domainsRes, status: domainsStatus, refetch: refetchDomains } = useQuery({
    queryKey: ['marketplace-domains'],
    queryFn: () => marketplaceServices.fetchDomains(),
  });

  const domains = domainsRes?.data ?? [];

  // Fetch apps based on selected domain
  const { data: apps, status: appsStatus, isFetching: appsFetching, refetch: refetchApps } = useQuery({
    queryKey: ['marketplace-apps', selectedDomain],
    queryFn: () =>
      selectedDomain === 'all'
        ? marketplaceServices.fetchAppByDomains('')
        : marketplaceServices.fetchAppByDomains(selectedDomain),
    enabled: domainsStatus === 'success' && marketplaceSection === 'browse',
  });

  const appsToDisplay = apps?.data ?? [];

  // Filter and sort apps
  const searchLowerCase = search.trim().toLowerCase();
  const filteredApps = appsToDisplay.filter(app => {
    const appName = app.app_name?.toLowerCase() || '';
    const domainName = app.domain_name?.toLowerCase() || '';
    return (
      appName.includes(searchLowerCase) || domainName.includes(searchLowerCase) ||
      (app.description ?? '').toLowerCase().includes(searchLowerCase) ||
      (app.domains ?? []).some(id => (domains.find(domain => domain._id === id)?.domain_name ?? id).replace(/-/g, ' ').toLowerCase().includes(searchLowerCase))
    );
  });

  // Sort apps based on selected criteria
  const sortedApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.app_name || '').localeCompare(b.app_name || '');
      case 'domain':
        return (a.domain_name || '').localeCompare(b.domain_name || '');
      case 'created':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  const handleAppClick = async (app: MarketplaceApp) => {
    // Fetch full app details before opening tab
    if (!user?._id || !user?.public_key) {
      toast.error('Authentication required');
      return;
    }

    try {
      setIsLoadingAppDetails(true);

      // Fetch full app data using the app's tag
      const appTag = app.domain_name || app.tag;
      if (!appTag) throw new Error('This integration does not have an application tag.');
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
          data: { ...appDetailsResponse.data, isMarketplaceApp: true, appViewMode: 'general' as const },
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

  const handleIntegrateApp = (app: MarketplaceApp) => {
    setSelectedApp(app);
    setIntegrationModalOpen(true);
  };

  const categoryLabel = selectedDomain === 'all' ? 'All integrations' : (domains.find(domain => domain._id === selectedDomain)?.domain_name ?? 'Integrations').replace(/-/g, ' ');

  if (domainsStatus === 'pending') return <div className="flex h-full items-center justify-center bg-grey-100" role="status"><Loader className="mr-2 h-5 w-5 animate-spin text-primary" /><p className="text-sm text-grey/70">Loading marketplace…</p></div>;
  if (domainsStatus === 'error') return <div role="alert" className="flex h-full items-center justify-center bg-grey-100 p-6"><div className="max-w-md rounded-xl border border-grey-400 bg-white p-6 text-center shadow-sm"><Store className="mx-auto mb-3 h-7 w-7 text-grey/50" /><h2 className="text-base font-semibold text-grey">Marketplace could not be loaded</h2><p className="mt-2 text-sm text-grey/70">Check your connection and try again.</p><Button className="mt-4" size="sm" variant="outline" onClick={() => void refetchDomains()}>Try again</Button></div></div>;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-grey-100 text-grey">
      <MarketplaceSidebar domains={domains} selectedDomain={selectedDomain} onDomainSelect={id => setSelectedDomain(id || 'all')} viewMode={marketplaceSection} onViewModeChange={setMarketplaceSection} isMobileOpen={isMobileSidebarOpen} onMobileToggle={() => setIsMobileSidebarOpen(open => !open)} />
      {marketplaceSection === 'submissions' ? <div className="flex min-w-0 flex-1 flex-col"><div className="border-b border-grey-400 bg-white p-3 md:hidden"><Button variant="outline" size="sm" onClick={() => setIsMobileSidebarOpen(true)}>Marketplace navigation</Button></div><MarketplaceSubmissionsView /></div> : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" aria-busy={isLoadingAppDetails}>
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="mx-auto max-w-6xl">
              <MarketplaceHeader description="Your next integration, a click away." search={search} onSearch={setSearch}
                actions={<><Button size="sm" variant="outline" className="gap-1.5 md:hidden" onClick={() => setIsMobileSidebarOpen(true)}><Filter className="h-3.5 w-3.5" />Categories</Button><Button size="icon" variant="ghost" className="h-8 w-8" disabled={appsFetching} aria-label="Refresh catalogue" onClick={() => { void refetchDomains(); void refetchApps(); }}><RefreshCw className={cn('h-4 w-4 text-grey/60', appsFetching && 'animate-spin')} /></Button></>}>
                <select aria-label="Sort integrations" value={sortBy} onChange={event => setSortBy(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-grey-400 bg-white px-2 text-xs text-grey sm:w-36 sm:flex-none"><option value="name">Name: A–Z</option><option value="domain">Domain</option><option value="created">Newest first</option></select>
                <MarketplaceLayoutControl value={layoutView} onChange={setLayoutView} />
              </MarketplaceHeader>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold capitalize text-grey">{categoryLabel}</h2>{appsStatus === 'success' && <span className="rounded-full bg-grey-400/20 px-2 py-0.5 text-[11px] tabular-nums text-grey/70">{sortedApps.length} {sortedApps.length === 1 ? 'integration' : 'integrations'}</span>}{selectedDomain !== 'all' && <button type="button" aria-label="Clear category" onClick={() => setSelectedDomain('all')} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/10">Clear category<X className="h-3 w-3" /></button>}</div>{isLoadingAppDetails ? <p role="status" className="text-xs text-grey/70">Opening integration…</p> : appsFetching && appsStatus !== 'pending' ? <p role="status" className="text-xs text-grey/70">Refreshing catalogue…</p> : null}</div>
              {appsStatus === 'pending' ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading integrations">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-xl border border-grey-400 bg-white p-5"><Skeleton className="mb-4 h-11 w-11 rounded-xl" /><Skeleton className="mb-2 h-4 w-2/3" /><Skeleton className="mb-5 h-12 w-full" /><Skeleton className="h-7 w-full" /></div>)}</div> : appsStatus === 'error' ? <div role="alert" className="rounded-xl border border-grey-400 bg-white p-8 text-center"><h3 className="text-sm font-semibold">Integrations could not be loaded</h3><p className="mt-1 text-xs text-grey/70">Your selection is kept. Try loading the catalogue again.</p><Button size="sm" variant="outline" className="mt-4" onClick={() => void refetchApps()}>Try again</Button></div> : !sortedApps.length ? <div className="rounded-xl border border-dashed border-grey-400 bg-white px-5 py-12 text-center"><SearchEmpty /><h3 className="mt-3 text-base font-semibold">No integrations found</h3><p className="mt-1 text-sm text-grey/70">{search ? `Nothing matches “${search}” in this category.` : 'There are no integrations in this category yet.'}</p>{(search || selectedDomain !== 'all') && <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setSelectedDomain('all'); }}>Reset filters</Button>}</div> : <div className={layoutView === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>{sortedApps.map(app => <AppCard key={app._id} app={app} domains={domains} viewMode={layoutView} onClick={() => void handleAppClick(app)} onIntegrate={() => handleIntegrateApp(app)} />)}</div>}
            </div>
          </div>
        </div>
      )}
      {selectedApp && <IntegrationProvider><AppIntegrationModal app={{ ...selectedApp, domain_name: selectedApp.domain_name || selectedApp.tag || '' }} open={integrationModalOpen} onOpenChange={setIntegrationModalOpen} /></IntegrationProvider>}
    </div>
  );
}
function SearchEmpty() { return <Store className="mx-auto h-8 w-8 text-grey/40" />; }

type MarketplaceSource = 'instance' | 'hosted';

const SOURCES: Array<{ id: MarketplaceSource; label: string }> = [
  { id: 'instance', label: 'This instance' },
  { id: 'hosted', label: 'Hosted marketplace' },
];

/**
 * On self-hosted instances the marketplace has two sources: apps published on this instance, and the hosted
 * Ductape marketplace (import only). The hosted cloud only has its own marketplace, so nothing changes there.
 */
export default function MarketplaceTabContent() {
  const [source, setSource] = useState<MarketplaceSource>('instance');

  if (!isSelfHosted()) return <InstanceMarketplaceView />;

  return (
    <div className="h-full flex flex-col bg-grey-100">
      <div className="bg-white border-b border-grey-400 px-4 py-2 flex items-center">
        <div className="inline-flex rounded-lg border border-grey-400 bg-white p-0.5" role="tablist" aria-label="Marketplace source">
          {SOURCES.map((item) => (
            <Button
              key={item.id}
              role="tab"
              aria-selected={source === item.id}
              variant={source === item.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSource(item.id)}
              className="h-7 rounded-md px-3 text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {source === 'instance' ? (
          <div className="flex-1 min-h-0">
            <InstanceMarketplaceView />
          </div>
        ) : (
          <HostedMarketplaceView />
        )}
      </div>
    </div>
  );
}

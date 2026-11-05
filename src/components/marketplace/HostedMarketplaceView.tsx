import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Store } from 'lucide-react';
import MarketplaceCard from './MarketplaceCard';
import MarketplaceHeader, { MarketplaceLayoutControl } from './MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/useAuth';
import remoteMarketplaceServices, {
  toRemoteError,
  type RemoteCatalogApp,
} from '@/services/remoteMarketplaceServices';
import RemoteAppDetailDialog from './RemoteAppDetailDialog';

const PAGE_SIZE = 12;

/** The hosted marketplace catalogue, browsed through this instance, with import into the current workspace. */
export default function HostedMarketplaceView() {
  const { user, currentWorkspaceId } = useAuth();
  const auth = { user_id: user?._id || '', public_key: user?.public_key || '' };
  const canCall = !!auth.user_id && !!auth.public_key;

  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const scope = [auth.user_id, auth.public_key, currentWorkspaceId];
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RemoteCatalogApp | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: status,
    error: statusError,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['remote-marketplace', 'status', ...scope],
    queryFn: () => remoteMarketplaceServices.fetchStatus(auth),
    enabled: canCall,
    staleTime: 1000 * 30,
  });

  const {
    data: catalog,
    error: catalogError,
    isLoading: catalogLoading,
    isFetching: catalogFetching,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['remote-marketplace', 'catalog', ...scope, search, page],
    queryFn: () => remoteMarketplaceServices.fetchCatalog(auth, { search, page, limit: PAGE_SIZE }),
    enabled: canCall && !!status?.enabled,
    staleTime: 1000 * 30,
  });

  // The open dialog should reflect imports/updates made while it is open.
  const selectedLive = selected
    ? catalog?.apps.find((a) => a.remote_app_id === selected.remote_app_id) ?? selected
    : null;

  const apps = catalog?.apps ?? [];
  const pages = catalog?.pages ?? 1;

  const renderBody = () => {
    if (!canCall) return <p className="py-12 text-center text-sm text-grey/70">Sign in to browse the hosted marketplace.</p>;
    if (statusLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (statusError) {
      return (
        <div className="max-w-xl mx-auto text-center py-12">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-grey mb-2">Hosted marketplace unavailable</h3>
          <p className="text-grey-600 mb-4 break-words">{toRemoteError(statusError).message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetchStatus()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Try again
          </Button>
        </div>
      );
    }

    if (status && !status.enabled) {
      return (
        <div className="max-w-xl mx-auto text-center py-12">
          <Store className="h-10 w-10 text-grey-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-grey mb-2">Importing from the hosted marketplace is not enabled</h3>
          <p className="text-grey-600 break-words">
            {status.reason || 'This instance cannot import apps from the hosted marketplace.'}
          </p>
        </div>
      );
    }

    if (catalogLoading) {
      return (
        <div className={layout === 'grid' ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-grey-400 p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      );
    }

    if (catalogError) {
      return (
        <div className="max-w-xl mx-auto text-center py-12">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-grey mb-2">Could not load the catalogue</h3>
          <p className="text-grey-600 mb-4 break-words">{toRemoteError(catalogError).message}</p>
          <Button variant="outline" size="sm" onClick={() => void refetchCatalog()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Try again
          </Button>
        </div>
      );
    }

    if (apps.length === 0) {
      return (
        <div className="text-center py-12">
          <Store className="h-12 w-12 text-grey-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-grey mb-2">No applications found</h3>
          <p className="text-grey-600">
            {search ? 'Try adjusting your search terms' : 'The hosted marketplace has no applications yet'}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className={layout === 'grid' ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-3"}>
          {apps.map((app) => (
            <MarketplaceCard key={app.remote_app_id} name={app.app_name} description={app.description} logo={app.logo} publisher={app.publisher} categories={app.domains} version={app.latest_version} imported={app.imported} updateAvailable={app.update_available} viewMode={layout} onInspect={() => setSelected(app)} actionLabel={app.imported ? (app.update_available ? "View update" : "View details") : "View import options"} />
          ))}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1 || catalogFetching} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-grey-600">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages || catalogFetching}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        <MarketplaceHeader title="Hosted marketplace" description="Discover integrations from Ductape and import them into your workspace." search={searchInput} onSearch={setSearchInput} disabled={!canCall || (!!status && !status.enabled)} actions={status?.enabled && <Badge variant="outline" className="font-normal text-grey/70">{status.max_apps === null ? `${status.imported} apps imported` : `${status.imported} of ${status.max_apps} apps imported`}</Badge>}>
          <MarketplaceLayoutControl value={layout} onChange={setLayout} />
          <Button variant="outline" size="icon" aria-label="Refresh catalogue" disabled={statusLoading || catalogFetching || !canCall} onClick={() => { void refetchStatus(); if (status?.enabled) void refetchCatalog(); }}><RefreshCw className="h-4 w-4" /></Button>
        </MarketplaceHeader>
        {status?.enabled && <div className="flex items-center justify-between text-xs text-grey/60"><span>{catalog?.total ?? 0} integrations{search ? ` matching “${search}”` : ''}</span>{catalogFetching && <span role="status">Updating catalogue…</span>}</div>}
        {renderBody()}
      </div>

      <RemoteAppDetailDialog
        app={selectedLive}
        status={status}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

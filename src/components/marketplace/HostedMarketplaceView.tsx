import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

function RemoteAppCard({ app, onOpen }: { app: RemoteCatalogApp; onOpen: () => void }) {
  const initials = (app.app_name || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="group relative flex flex-col p-5 bg-white rounded-lg border border-grey-400 hover:border-primary/50 transition-all cursor-pointer shadow-sm h-full"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="w-14 h-14 rounded-lg bg-grey-100 flex items-center justify-center border border-grey-400 p-2 group-hover:border-primary/30 transition-colors flex-shrink-0">
          {app.logo ? (
            <img src={app.logo} alt={app.app_name} className="w-10 h-10 object-cover rounded-sm" />
          ) : (
            <div className="text-primary font-bold text-xl">{initials}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {app.imported && (
            <Badge className="bg-green/10 text-green border-green/20 text-[10px] font-bold px-2 h-5">Imported</Badge>
          )}
          {app.imported && app.update_available && (
            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] font-bold px-2 h-5">
              Update available
            </Badge>
          )}
          {app.latest_version && (
            <Badge className="bg-green/10 text-green border-green/20 text-[10px] font-bold px-2 h-5">
              v{app.latest_version}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold text-grey mb-0.5 group-hover:text-primary transition-colors break-words">
          {app.app_name}
        </h3>
        {app.publisher && <p className="text-[11px] text-grey-600 font-medium mb-2">By {app.publisher}</p>}
        <p className="text-xs text-grey-600 font-medium leading-relaxed line-clamp-3 mb-4">
          {app.description || 'No description available for this application yet.'}
        </p>
      </div>

      {app.domains?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {app.domains.slice(0, 2).map((d) => (
            <Badge
              key={d}
              variant="outline"
              className="text-[10px] font-bold text-grey-600 border-grey-400 py-0 px-2 h-4 rounded-full"
            >
              {d}
            </Badge>
          ))}
          {app.domains.length > 2 && (
            <span className="text-[10px] font-bold text-grey-600">+{app.domains.length - 2}</span>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-grey-400 mt-auto">
        <Button
          size="sm"
          className="w-full rounded-md h-8 bg-primary hover:bg-primary/90 text-white text-xs font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {app.imported ? (app.update_available ? 'View update' : 'View') : 'Import'}
        </Button>
      </div>
    </div>
  );
}

/** The hosted marketplace catalogue, browsed through this instance, with import into the current workspace. */
export default function HostedMarketplaceView() {
  const { user } = useAuth();
  const auth = { user_id: user?._id || '', public_key: user?.public_key || '' };
  const canCall = !!auth.user_id && !!auth.public_key;

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
    queryKey: ['remote-marketplace', 'status'],
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
    queryKey: ['remote-marketplace', 'catalog', search, page],
    queryFn: () => remoteMarketplaceServices.fetchCatalog(auth, { search, page, limit: PAGE_SIZE }),
    enabled: canCall && !!status?.enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });

  // The open dialog should reflect imports/updates made while it is open.
  const selectedLive = selected
    ? catalog?.apps.find((a) => a.remote_app_id === selected.remote_app_id) ?? selected
    : null;

  const apps = catalog?.apps ?? [];
  const pages = catalog?.pages ?? 1;

  const renderBody = () => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <RemoteAppCard key={app.remote_app_id} app={app} onOpen={() => setSelected(app)} />
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
      <div className="bg-white border-b border-grey-400 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-grey">Hosted marketplace</h1>
              <p className="text-sm text-grey-600">Import applications from the Ductape cloud marketplace</p>
            </div>
          </div>
          {status?.enabled && (
            <Badge variant="outline" className="flex-shrink-0">
              {status.max_apps === null
                ? `${status.imported} apps imported`
                : `${status.imported} of ${status.max_apps} apps imported`}
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search the hosted marketplace..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            disabled={!!status && !status.enabled}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">{renderBody()}</div>

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

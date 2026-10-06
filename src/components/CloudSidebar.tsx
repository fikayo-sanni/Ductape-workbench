import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cloud, Loader2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useSDKProxy } from '@/services/sdkProxy';
import { Input } from './ui/input';
import SidebarRefreshButton from './SidebarRefreshButton';
import { Button } from './ui/button';
import { cloudTabTitle } from '@/components/cloud/CloudConnectionTagBadge';
import CloudProviderIcon from '@/components/cloud/CloudProviderIcon';
import {
  connectionNeedsSetup,
  connectionStatusMeta,
} from '@/components/cloud/cloudConnection.constants';
import type { CloudProvider } from '@/components/cloud/cloudConnection.constants';
import NewCloudConnectionModal from './modals/NewCloudConnectionModal';
import { cloudConnectionsQueryKey } from '@/utils/cloudConnectionQueryKeys';

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  mongodb_atlas: 'Atlas',
  neo4j_aura: 'Aura',
};

function providerBadgeClass(provider: string) {
  switch (provider) {
    case 'aws':
      return 'bg-orange-500/10 text-orange-700';
    case 'gcp':
      return 'bg-blue-500/10 text-blue-700';
    case 'azure':
      return 'bg-sky-500/10 text-sky-700';
    case 'mongodb_atlas':
      return 'bg-emerald-500/10 text-emerald-700';
    case 'neo4j_aura':
      return 'bg-lime-500/10 text-lime-800';
    default:
      return 'bg-grey-100 text-grey-600';
  }
}

export default function CloudSidebar() {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab, setSidebarCollapsed, cloudAddConnectionModalOpen, setCloudAddConnectionModalOpen } =
    useWorkbenchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const proxyConfig =
    currentWorkspaceId && user?._id
      ? {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null;
  const sdkProxy = useSDKProxy(proxyConfig);

  const { data: connections = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: cloudConnectionsQueryKey(currentWorkspaceId),
    queryFn: async () => {
      if (!sdkProxy) return [];
      const res = await sdkProxy.cloud.connections.list();
      return Array.isArray(res) ? res : [];
    },
    enabled: Boolean(sdkProxy && currentWorkspaceId),
    staleTime: 0,
  });

  useEffect(() => {
    setSelectedConnectionId(null);
    setSearchQuery('');
  }, [currentWorkspaceId]);

  const filtered = connections.filter(
    (c: { display_name?: string; provider?: string; tag?: string }) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.tag || '').toLowerCase().includes(q) ||
        (c.provider || '').toLowerCase().includes(q)
      );
    },
  );

  const handleConnectionClick = (connection: {
    id: string;
    display_name?: string;
    tag?: string;
    provider?: string;
    status?: string;
  }) => {
    setSelectedConnectionId(connection.id);
    openTab({
      id: `cloud-${connection.id}`,
      type: 'cloud',
      title: cloudTabTitle(connection),
      itemId: connection.id,
      data: {
        ...connection,
        isSetup: connectionNeedsSetup(connection.status),
      },
    });
    setSidebarCollapsed(true);
  };

  const handleAddConnection = () => {
    setCloudAddConnectionModalOpen(true);
  };

  if (!sdkProxy) {
    return (
      <div className="h-full flex flex-col bg-white border-r border-grey-400 p-4">
        <p className="text-sm text-grey-600">Sign in with a workspace to manage cloud connections.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400" data-intro="cloud-view">
      <div className="p-4 border-b border-grey-400">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-grey">Cloud</h2>
          <div className="flex items-center gap-1">
            <SidebarRefreshButton label="cloud connections" isFetching={isFetching}
              onRefresh={() => refetch({ throwOnError: true })} />
            <Button size="sm" variant="outline" onClick={handleAddConnection} className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-grey-600">
          AWS, GCP, Azure, MongoDB Atlas, and Neo4j Aura
        </p>
      </div>
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search by tag or name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-2">
            <Cloud className="h-8 w-8 text-grey-400 mx-auto mb-2" />
            <p className="text-sm text-grey-600">
              {searchQuery ? 'No matching connections' : 'No connections yet'}
            </p>
            {!searchQuery && (
              <Button size="sm" variant="outline" className="mt-3" onClick={handleAddConnection}>
                Add connection
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((c: {
              id: string;
              display_name?: string;
              tag?: string;
              provider?: string;
              status?: string;
            }) => {
              const statusMeta = connectionStatusMeta(c.status);
              const isSelected = selectedConnectionId === c.id;
              const needsAttention = c.status === 'pending' || c.status === 'error';

              return (
                <div
                  key={c.id}
                  onClick={() => handleConnectionClick(c)}
                  className={cn(
                    'group p-2.5 rounded-lg border transition-all flex items-center gap-2.5 cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-grey-300 hover:border-primary/50 hover:bg-grey-100/80',
                  )}
                >
                  <CloudProviderIcon
                    provider={(c.provider || 'aws') as CloudProvider}
                    size="sm"
                    showActiveRing={c.status === 'active'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-mono font-medium text-grey truncate">
                        {c.tag || c.display_name}
                      </h3>
                      {needsAttention && (
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusMeta.dotClassName)}
                        />
                      )}
                    </div>
                    {c.tag && c.display_name && c.tag !== c.display_name ? (
                      <p className="text-[11px] text-grey-600 truncate mt-0.5">{c.display_name}</p>
                    ) : null}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          providerBadgeClass(c.provider || ''),
                        )}
                      >
                        {PROVIDER_LABELS[c.provider || ''] || c.provider}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize',
                          statusMeta.className,
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewCloudConnectionModal
        open={cloudAddConnectionModalOpen}
        onOpenChange={setCloudAddConnectionModalOpen}
      />
    </div>
  );
}

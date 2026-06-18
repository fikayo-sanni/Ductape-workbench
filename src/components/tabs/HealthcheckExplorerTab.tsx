import { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { normalizeSdkList } from '@/components/resilience-explorer/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { IHealthCheck } from '@/types/healthcheck';
import { HealthcheckExplorerSidebar } from '@/components/healthcheck-explorer/HealthcheckExplorerSidebar';
import { HealthcheckExplorerOverview } from '@/components/healthcheck-explorer/HealthcheckExplorerOverview';
import { HealthcheckExplorerStatusView } from '@/components/healthcheck-explorer/HealthcheckExplorerStatusView';
import { HealthcheckExplorerListView } from '@/components/healthcheck-explorer/HealthcheckExplorerListView';
import { HealthcheckExplorerDetailPanel } from '@/components/healthcheck-explorer/HealthcheckExplorerDetailPanel';
import {
  HealthcheckViewMode,
  StatusFilter,
  parseLatency,
  getEnvStatusForSlug,
} from '@/components/healthcheck-explorer/utils';

interface HealthcheckExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
  initialHealthcheckTag?: string;
  initialEnv?: string;
  /** When true, explorer is scoped to a single healthcheck (from env chip on product page). */
  scopedToComponent?: boolean;
}

export default function HealthcheckExplorerTab({
  product,
  initialHealthcheckTag,
  initialEnv,
  scopedToComponent = false,
}: HealthcheckExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const proxy = useResilienceProxy();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<HealthcheckViewMode>(
    scopedToComponent ? 'status' : 'overview',
  );
  const [selectedHealthcheck, setSelectedHealthcheck] = useState<IHealthCheck | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string>(
    initialEnv || product.envs?.[0]?.slug || 'prd'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [healthcheckToDelete, setHealthcheckToDelete] = useState<IHealthCheck | null>(null);

  const { data: healthchecks, isLoading: isLoadingHealthchecks, refetch: refetchHealthchecks } = useQuery({
    queryKey: ['healthchecks', product.tag],
    queryFn: async () => {
      if (!proxy || !product.tag) return [];
      await proxy.product.init(product.tag);
      const result = await proxy.health.list(product.tag);
      return normalizeSdkList<IHealthCheck>(result);
    },
    enabled: !!proxy && !!product.tag,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const list = healthchecks || [];
  const scopedList = useMemo(() => {
    if (!scopedToComponent || !initialHealthcheckTag) return list;
    return list.filter((h) => h.tag === initialHealthcheckTag);
  }, [list, scopedToComponent, initialHealthcheckTag]);

  useEffect(() => {
    if (!initialHealthcheckTag || scopedList.length === 0) return;
    const match = scopedList.find((h) => h.tag === initialHealthcheckTag);
    if (match) {
      setSelectedHealthcheck(match);
      if (scopedToComponent) setViewMode('status');
      else setViewMode('list');
    }
  }, [initialHealthcheckTag, scopedList, scopedToComponent]);

  const activeList = scopedToComponent ? scopedList : list;

  const metrics = useMemo(() => {
    let healthy = 0;
    let unhealthy = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let recentlyChecked = 0;
    const byEnv: Record<string, { healthy: number; unhealthy: number }> = {};

    activeList.forEach((h) => {
      (h.envs || []).forEach((env) => {
        if (!byEnv[env.slug]) byEnv[env.slug] = { healthy: 0, unhealthy: 0 };
        if (env.status === 'healthy') {
          healthy++;
          byEnv[env.slug].healthy++;
        } else {
          unhealthy++;
          byEnv[env.slug].unhealthy++;
        }
        const lat = parseLatency(env.averageLatency);
        if (lat > 0) {
          totalLatency += lat;
          latencyCount++;
        }
        if (env.lastChecked) {
          const t = new Date(env.lastChecked).getTime();
          if (t > Date.now() - 5 * 60 * 1000) recentlyChecked++;
        }
      });
    });

    return {
      total: activeList.length,
      healthy,
      unhealthy,
      avgLatency: latencyCount > 0 ? `${Math.round(totalLatency / latencyCount)}ms` : '0ms',
      byEnv,
      recentlyChecked,
    };
  }, [activeList]);

  const getIsHealthy = (h: IHealthCheck) => getEnvStatusForSlug(h, selectedEnv)?.status === 'healthy';

  const filteredHealthchecks = useMemo(() => {
    let filtered = activeList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (h) => h.name?.toLowerCase().includes(q) || h.tag?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((h) => {
        const healthy = getIsHealthy(h);
        return statusFilter === 'healthy' ? healthy : !healthy;
      });
    }
    return filtered;
  }, [activeList, searchQuery, statusFilter, selectedEnv]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchHealthchecks();
    setIsRefreshing(false);
    toast.success('Healthchecks refreshed');
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== '';

  const deleteHealthcheckMutation = useMutation({
    mutationFn: async (healthcheck: IHealthCheck) => {
      if (!proxy || !product.tag) throw new Error('SDK not initialized');
      await proxy.product.init(product.tag);
      return proxy.health.delete(product.tag, healthcheck.tag);
    },
    onSuccess: () => {
      toast.success('Healthcheck deleted');
      queryClient.invalidateQueries({ queryKey: ['healthchecks', product.tag] });
      setShowDeleteDialog(false);
      setHealthcheckToDelete(null);
      setSelectedHealthcheck(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete healthcheck');
    },
  });

  const handleViewHealthcheck = (healthcheck: IHealthCheck) => {
    openTab({
      id: `healthcheck-${healthcheck.tag}`,
      type: 'healthcheck',
      title: healthcheck.name,
      itemId: healthcheck.tag,
      data: {
        ...healthcheck,
        name: healthcheck.name,
        tag: healthcheck.tag,
        componentType: 'healthcheck',
        productName: product.name,
        productTag: product.tag,
        productLogo: product.logo,
        productEnvironments: product.envs || [],
      },
    });
  };

  const handleCreateHealthcheck = () => {
    openTab({
      id: `new-healthcheck-${Date.now()}`,
      type: 'new-healthcheck',
      title: 'New Healthcheck',
      itemId: 'new',
      data: {
        productId: product.tag,
        productTag: product.tag,
        productName: product.name,
        productLogo: product.logo,
        productEnvs: product.envs,
        isNew: true,
      },
      isDirty: true,
    });
  };

  const generateCodeSections = (language: string, env?: string) => {
    if (!selectedHealthcheck) return [];
    const envSlug = env || selectedEnv || 'prd';
    if (language === 'javascript' || language === 'typescript') {
      const imp = language === 'typescript' ? `import Ductape from "@ductape/sdk";\n\n` : '';
      return [
        {
          title: 'Check status',
          code: `${imp}const status = await ductape.health.check({
  product: '${product.tag}',
  healthcheck: '${selectedHealthcheck.tag}',
  env: '${envSlug}'
});`,
        },
      ];
    }
    return [];
  };

  const handleViewModeChange = (mode: HealthcheckViewMode) => {
    setViewMode(mode);
    if ((mode === 'list' || mode === 'status') && list.length > 0 && !selectedHealthcheck) {
      setSelectedHealthcheck(list[0]);
    }
  };

  const handleSelectHealthcheck = (h: IHealthCheck) => {
    setSelectedHealthcheck(h);
    if (viewMode === 'overview') setViewMode('list');
  };

  if (isLoadingHealthchecks) {
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading healthchecks…</p>
        </div>
      </div>
    );
  }

  const toolbarTitle = scopedToComponent
    ? selectedHealthcheck
      ? `${selectedHealthcheck.name} · ${selectedEnv}`
      : initialHealthcheckTag
        ? `${initialHealthcheckTag} · ${selectedEnv}`
        : 'Healthcheck activity'
    : viewMode === 'overview'
      ? 'Overview'
      : viewMode === 'status'
        ? 'Live status'
        : selectedHealthcheck
          ? selectedHealthcheck.name
          : 'All healthchecks';

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      <HealthcheckExplorerSidebar
        productName={product.name}
        productTag={product.tag}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        totalCount={metrics.total}
        healthyCount={metrics.healthy}
        unhealthyCount={metrics.unhealthy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedEnv={selectedEnv}
        onEnvChange={setSelectedEnv}
        productEnvs={product.envs || []}
        envMetrics={metrics.byEnv}
        filteredHealthchecks={filteredHealthchecks}
        selectedTag={selectedHealthcheck?.tag ?? null}
        onSelectHealthcheck={handleSelectHealthcheck}
        onCreate={scopedToComponent ? undefined : handleCreateHealthcheck}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        getIsHealthy={getIsHealthy}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-shrink-0 h-12 border-b border-grey-300 bg-white px-4 flex items-center justify-between">
          <p className="text-sm text-grey-600 truncate">{toolbarTitle}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {!scopedToComponent ? (
              <Button type="button" size="sm" className="h-8 gap-1.5 bg-rose-600 hover:bg-rose-700" onClick={handleCreateHealthcheck}>
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            ) : null}
          </div>
        </div>

        {viewMode === 'overview' && (
          <HealthcheckExplorerOverview
            metrics={metrics}
            healthchecks={list}
            selectedEnv={selectedEnv}
            onViewAll={() => {
              setViewMode('list');
              if (list.length > 0) setSelectedHealthcheck(list[0]);
            }}
            onSelect={handleSelectHealthcheck}
          />
        )}

        {viewMode === 'status' && (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <HealthcheckExplorerStatusView
                healthchecks={filteredHealthchecks}
                selectedEnv={selectedEnv}
                onSelect={handleSelectHealthcheck}
              />
            </div>
            <div className="hidden md:flex w-[360px] flex-shrink-0 border-l border-grey-300">
              <HealthcheckExplorerDetailPanel
                healthcheck={selectedHealthcheck ?? undefined}
                selectedEnv={selectedEnv}
                onOpenTab={() => selectedHealthcheck && handleViewHealthcheck(selectedHealthcheck)}
                onViewCode={() => selectedHealthcheck && setShowCodeSidebar(true)}
                onDelete={() => {
                  if (selectedHealthcheck) {
                    setHealthcheckToDelete(selectedHealthcheck);
                    setShowDeleteDialog(true);
                  }
                }}
              />
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <HealthcheckExplorerListView
                data={filteredHealthchecks}
                selectedEnv={selectedEnv}
                isRefreshing={isRefreshing}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onRowClick={handleSelectHealthcheck}
                onView={handleViewHealthcheck}
                onCode={(h) => {
                  setSelectedHealthcheck(h);
                  setShowCodeSidebar(true);
                }}
                onDelete={(h) => {
                  setHealthcheckToDelete(h);
                  setShowDeleteDialog(true);
                }}
              />
            </div>
            <div className="hidden lg:flex w-[360px] flex-shrink-0 border-l border-grey-300">
              <HealthcheckExplorerDetailPanel
                healthcheck={selectedHealthcheck ?? undefined}
                selectedEnv={selectedEnv}
                onOpenTab={() => selectedHealthcheck && handleViewHealthcheck(selectedHealthcheck)}
                onViewCode={() => selectedHealthcheck && setShowCodeSidebar(true)}
                onDelete={() => {
                  if (selectedHealthcheck) {
                    setHealthcheckToDelete(selectedHealthcheck);
                    setShowDeleteDialog(true);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {showCodeSidebar && selectedHealthcheck && (
        <CodeSidebar
          title={selectedHealthcheck.name}
          subtitle={`Check ${selectedHealthcheck.tag}`}
          tag={selectedHealthcheck.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={product.envs || []}
        />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete healthcheck</DialogTitle>
            <DialogDescription>
              Delete &quot;{healthcheckToDelete?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => healthcheckToDelete && deleteHealthcheckMutation.mutate(healthcheckToDelete)}
              disabled={deleteHealthcheckMutation.isPending}
            >
              {deleteHealthcheckMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

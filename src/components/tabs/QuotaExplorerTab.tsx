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
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { normalizeSdkList, ResilienceViewMode } from '@/components/resilience-explorer/utils';
import { QuotaExplorerSidebar } from '@/components/quota-explorer/QuotaExplorerSidebar';
import { QuotaExplorerOverview } from '@/components/quota-explorer/QuotaExplorerOverview';
import { QuotaExplorerDetailPanel } from '@/components/quota-explorer/QuotaExplorerDetailPanel';
import { ProductQuota } from '@/components/quota-explorer/types';

interface QuotaExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
  initialQuotaTag?: string;
  initialEnv?: string;
  scopedToComponent?: boolean;
}

export default function QuotaExplorerTab({
  product,
  initialQuotaTag,
  initialEnv,
  scopedToComponent = false,
}: QuotaExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const proxy = useResilienceProxy();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const [viewMode, setViewMode] = useState<ResilienceViewMode>(
    scopedToComponent ? 'list' : initialQuotaTag ? 'list' : 'overview',
  );
  const [selectedQuota, setSelectedQuota] = useState<ProductQuota | null>(null);
  const [selectedEnv, setSelectedEnv] = useState(initialEnv || product.envs?.[0]?.slug || 'prd');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<ProductQuota | null>(null);

  const { data: quotas, isLoading, refetch } = useQuery({
    queryKey: ['quotas', product.tag],
    queryFn: async () => {
      if (!proxy || !product.tag) return [];
      await proxy.product.init(product.tag);
      const result = await proxy.quotas.list(product.tag);
      return normalizeSdkList<ProductQuota>(result);
    },
    enabled: !!proxy && !!product.tag,
    staleTime: 30000,
  });

  const list = quotas || [];
  const scopedList = useMemo(() => {
    if (!scopedToComponent || !initialQuotaTag) return list;
    return list.filter((q) => q.tag === initialQuotaTag);
  }, [list, scopedToComponent, initialQuotaTag]);
  const activeList = scopedToComponent ? scopedList : list;

  useEffect(() => {
    if (!initialQuotaTag || activeList.length === 0) return;
    const match = activeList.find((q) => q.tag === initialQuotaTag);
    if (match) {
      setSelectedQuota(match);
      setViewMode('list');
    }
  }, [initialQuotaTag, activeList]);

  const metrics = useMemo(() => {
    let totalOptions = 0;
    let totalQuotaWeight = 0;
    const byType: Record<string, number> = {};
    activeList.forEach((q) => {
      const opts = q.options || [];
      totalOptions += opts.length;
      opts.forEach((opt) => {
        totalQuotaWeight += opt.quota || 0;
        byType[opt.type] = (byType[opt.type] || 0) + 1;
      });
    });
    return { total: activeList.length, options: totalOptions, totalQuotaWeight, byType };
  }, [activeList]);

  const filteredQuotas = useMemo(() => {
    if (!searchQuery) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter(
      (item) => item.name?.toLowerCase().includes(q) || item.tag?.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success('Quotas refreshed');
  };

  const deleteMutation = useMutation({
    mutationFn: async (quota: ProductQuota) => {
      if (!proxy || !product.tag) throw new Error('SDK not initialized');
      await proxy.product.init(product.tag);
      return proxy.quotas.delete(product.tag, quota.tag);
    },
    onSuccess: () => {
      toast.success('Quota deleted');
      queryClient.invalidateQueries({ queryKey: ['quotas', product.tag] });
      setShowDeleteDialog(false);
      setQuotaToDelete(null);
      setSelectedQuota(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete quota');
    },
  });

  const handleViewQuota = (quota: ProductQuota) => {
    openTab({
      id: `quota-flow-${quota.tag}`,
      type: 'resilience-flow',
      title: quota.name,
      itemId: quota.tag,
      data: {
        kind: 'quota',
        component: quota,
        productTag: product.tag,
        productName: product.name,
        productEnvs: product.envs || [],
      },
    });
  };

  const handleCreateQuota = () => {
    openTab({
      id: `new-quota-${Date.now()}`,
      type: 'new-quota',
      title: 'New Quota',
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
    if (!selectedQuota) return [];
    const envSlug = env || selectedEnv;
    if (language === 'javascript' || language === 'typescript') {
      const imp = language === 'typescript' ? `import Ductape from "@ductape/sdk";\n\n` : '';
      return [
        {
          title: 'Check quota',
          code: `${imp}const allowed = await ductape.quotas.check({
  env: '${envSlug}',
  product: '${product.tag}',
  event: '${selectedQuota.tag}',
  input: { /* your input */ }
});`,
        },
        {
          title: 'Consume quota',
          code: `${imp}await ductape.quotas.consume({
  env: '${envSlug}',
  product: '${product.tag}',
  event: '${selectedQuota.tag}',
  input: { /* your input */ }
});`,
        },
      ];
    }
    return [];
  };

  const handleViewModeChange = (mode: ResilienceViewMode) => {
    setViewMode(mode);
    if (mode === 'list' && list.length > 0 && !selectedQuota) {
      setSelectedQuota(list[0]);
    }
  };

  const handleSelectQuota = (q: ProductQuota) => {
    setSelectedQuota(q);
    if (viewMode === 'overview') setViewMode('list');
  };

  if (!product.tag) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-100 p-8">
        <p className="text-sm text-grey-600">Missing product context. Reopen from your product tab.</p>
          </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading quotas…</p>
        </div>
      </div>
    );
  }

  const toolbarTitle =
    viewMode === 'overview' ? 'Overview' : selectedQuota ? selectedQuota.name : 'All quotas';

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      <QuotaExplorerSidebar
        productName={product.name}
        productTag={product.tag}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        totalCount={metrics.total}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedEnv={selectedEnv}
        onEnvChange={setSelectedEnv}
        productEnvs={product.envs || []}
        filteredQuotas={filteredQuotas}
        selectedTag={selectedQuota?.tag ?? null}
        onSelectQuota={handleSelectQuota}
        onCreate={handleCreateQuota}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
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
                <Button
              type="button"
                  size="sm"
              className="h-8 gap-1.5 bg-orange-600 hover:bg-orange-700"
                  onClick={handleCreateQuota}
                >
              <Plus className="h-3.5 w-3.5" />
              New
                </Button>
          </div>
        </div>

        {viewMode === 'overview' ? (
          <QuotaExplorerOverview
            metrics={metrics}
            quotas={list}
            onViewAll={() => {
              setViewMode('list');
              if (list.length > 0) setSelectedQuota(list[0]);
            }}
            onSelect={handleSelectQuota}
          />
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <QuotaExplorerDetailPanel
              quota={selectedQuota ?? undefined}
              selectedEnv={selectedEnv}
              onOpenTab={() => selectedQuota && handleViewQuota(selectedQuota)}
              onViewCode={() => selectedQuota && setShowCodeSidebar(true)}
              onDelete={() => {
                if (selectedQuota) {
                  setQuotaToDelete(selectedQuota);
                  setShowDeleteDialog(true);
                }
              }}
            />
          </div>
        )}
      </div>

      {showCodeSidebar && selectedQuota && (
        <CodeSidebar
          title={selectedQuota.name}
          subtitle={`Quota ${selectedQuota.tag}`}
          tag={selectedQuota.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={product.envs || []}
        />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete quota</DialogTitle>
            <DialogDescription>
              Delete &quot;{quotaToDelete?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => quotaToDelete && deleteMutation.mutate(quotaToDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
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

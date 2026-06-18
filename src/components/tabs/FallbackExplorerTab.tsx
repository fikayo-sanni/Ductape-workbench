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
import { FallbackExplorerSidebar } from '@/components/fallback-explorer/FallbackExplorerSidebar';
import { FallbackExplorerOverview } from '@/components/fallback-explorer/FallbackExplorerOverview';
import { FallbackExplorerDetailPanel } from '@/components/fallback-explorer/FallbackExplorerDetailPanel';
import { ProductFallback } from '@/components/fallback-explorer/types';

interface FallbackExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
  initialFallbackTag?: string;
  initialEnv?: string;
  scopedToComponent?: boolean;
}

export default function FallbackExplorerTab({
  product,
  initialFallbackTag,
  initialEnv,
  scopedToComponent = false,
}: FallbackExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const proxy = useResilienceProxy();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const [viewMode, setViewMode] = useState<ResilienceViewMode>(
    scopedToComponent ? 'list' : initialFallbackTag ? 'list' : 'overview',
  );
  const [selectedFallback, setSelectedFallback] = useState<ProductFallback | null>(null);
  const [selectedEnv, setSelectedEnv] = useState(
    initialEnv || product.envs?.[0]?.slug || 'prd'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fallbackToDelete, setFallbackToDelete] = useState<ProductFallback | null>(null);

  const { data: fallbacks, isLoading, refetch } = useQuery({
    queryKey: ['fallbacks', product.tag],
    queryFn: async () => {
      if (!proxy || !product.tag) return [];
      await proxy.product.init(product.tag);
      const result = await proxy.fallback.list(product.tag);
      return normalizeSdkList<ProductFallback>(result);
    },
    enabled: !!proxy && !!product.tag,
    staleTime: 30000,
  });

  const list = fallbacks || [];
  const scopedList = useMemo(() => {
    if (!scopedToComponent || !initialFallbackTag) return list;
    return list.filter((f) => f.tag === initialFallbackTag);
  }, [list, scopedToComponent, initialFallbackTag]);
  const activeList = scopedToComponent ? scopedList : list;

  useEffect(() => {
    if (!initialFallbackTag || activeList.length === 0) return;
    const match = activeList.find((f) => f.tag === initialFallbackTag);
    if (match) {
      setSelectedFallback(match);
      setViewMode('list');
    }
  }, [initialFallbackTag, activeList]);

  const metrics = useMemo(() => {
    let totalOptions = 0;
    let withHealthcheck = 0;
    const byType: Record<string, number> = {};
    activeList.forEach((f) => {
      const opts = f.options || [];
      totalOptions += opts.length;
      opts.forEach((opt) => {
        if (opt.healthcheck) withHealthcheck++;
        byType[opt.type] = (byType[opt.type] || 0) + 1;
      });
    });
    return { total: activeList.length, options: totalOptions, withHealthcheck, byType };
  }, [activeList]);

  const filteredFallbacks = useMemo(() => {
    if (!searchQuery) return activeList;
    const q = searchQuery.toLowerCase();
    return activeList.filter(
      (f) => f.name?.toLowerCase().includes(q) || f.tag?.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success('Fallbacks refreshed');
  };

  const deleteMutation = useMutation({
    mutationFn: async (fallback: ProductFallback) => {
      if (!proxy || !product.tag) throw new Error('SDK not initialized');
      await proxy.product.init(product.tag);
      return proxy.fallback.delete(product.tag, fallback.tag);
    },
    onSuccess: () => {
      toast.success('Fallback deleted');
      queryClient.invalidateQueries({ queryKey: ['fallbacks', product.tag] });
      setShowDeleteDialog(false);
      setFallbackToDelete(null);
      setSelectedFallback(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete fallback');
    },
  });

  const handleViewFallback = (fallback: ProductFallback) => {
    openTab({
      id: `fallback-${fallback.tag}`,
      type: 'fallback',
      title: fallback.name,
      itemId: fallback.tag,
      data: {
        ...fallback,
        name: fallback.name,
        tag: fallback.tag,
        componentType: 'fallback',
        productName: product.name,
        productTag: product.tag,
        productLogo: product.logo,
        productEnvironments: product.envs || [],
      },
    });
  };

  const handleCreateFallback = () => {
    openTab({
      id: `new-fallback-${Date.now()}`,
      type: 'new-fallback',
      title: 'New Fallback',
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
    if (!selectedFallback) return [];
    const envSlug = env || selectedEnv;
    if (language === 'javascript' || language === 'typescript') {
      const imp = language === 'typescript' ? `import Ductape from "@ductape/sdk";\n\n` : '';
      return [
        {
          title: 'Execute fallback',
          code: `${imp}const result = await ductape.processor.fallback.execute({
  env: '${envSlug}',
  product: '${product.tag}',
  event: '${selectedFallback.tag}',
  input: { /* your input */ },
  retries: 3
});`,
        },
      ];
    }
    return [];
  };

  const handleViewModeChange = (mode: ResilienceViewMode) => {
    setViewMode(mode);
    if (mode === 'list' && list.length > 0 && !selectedFallback) {
      setSelectedFallback(list[0]);
    }
  };

  const handleSelectFallback = (f: ProductFallback) => {
    setSelectedFallback(f);
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
          <Loader2 className="h-8 w-8 animate-spin text-red mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading fallbacks…</p>
        </div>
      </div>
    );
  }

  const toolbarTitle =
    viewMode === 'overview'
      ? 'Overview'
      : selectedFallback
        ? selectedFallback.name
        : 'All fallbacks';

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      <FallbackExplorerSidebar
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
        filteredFallbacks={filteredFallbacks}
        selectedTag={selectedFallback?.tag ?? null}
        onSelectFallback={handleSelectFallback}
        onCreate={handleCreateFallback}
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
            <Button type="button" size="sm" className="h-8 gap-1.5 bg-red hover:bg-red/90" onClick={handleCreateFallback}>
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </div>

        {viewMode === 'overview' ? (
          <FallbackExplorerOverview
            metrics={metrics}
            fallbacks={list}
            onViewAll={() => {
              setViewMode('list');
              if (list.length > 0) setSelectedFallback(list[0]);
            }}
            onSelect={handleSelectFallback}
          />
        ) : (
          <div className="flex-1 flex min-h-0">
            <div className="hidden lg:flex w-full flex-1 min-w-0">
              <FallbackExplorerDetailPanel
                fallback={selectedFallback ?? undefined}
                selectedEnv={selectedEnv}
                onOpenTab={() => selectedFallback && handleViewFallback(selectedFallback)}
                onViewCode={() => selectedFallback && setShowCodeSidebar(true)}
                onDelete={() => {
                  if (selectedFallback) {
                    setFallbackToDelete(selectedFallback);
                    setShowDeleteDialog(true);
                  }
                }}
              />
            </div>
            <div className="lg:hidden flex-1 overflow-auto p-4">
              <FallbackExplorerDetailPanel
                fallback={selectedFallback ?? undefined}
                selectedEnv={selectedEnv}
                onOpenTab={() => selectedFallback && handleViewFallback(selectedFallback)}
                onViewCode={() => selectedFallback && setShowCodeSidebar(true)}
                onDelete={() => {
                  if (selectedFallback) {
                    setFallbackToDelete(selectedFallback);
                    setShowDeleteDialog(true);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {showCodeSidebar && selectedFallback && (
        <CodeSidebar
          title={selectedFallback.name}
          subtitle={`Fallback ${selectedFallback.tag}`}
          tag={selectedFallback.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={product.envs || []}
        />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete fallback</DialogTitle>
            <DialogDescription>
              Delete &quot;{fallbackToDelete?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => fallbackToDelete && deleteMutation.mutate(fallbackToDelete)}
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

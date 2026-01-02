import { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Code,
  Loader2,
  ChevronDownIcon,
  ChevronUpIcon,
  MoreVertical,
  Eye,
  Trash2,
  LayoutDashboard,
  X,
  Zap,
  Database,
  LayoutList,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  createColumnHelper,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useDuctape } from '@/hooks/useDuctape';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import CodeSidebar from '@/components/CodeSidebar';

interface FallbackExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
}

interface FallbackOption {
  type: string;
  app?: string;
  event: string;
  input: Record<string, any>;
  output: Record<string, any>;
  retries: number;
  healthcheck?: string;
}

interface Fallback {
  _id?: string;
  name: string;
  tag: string;
  description?: string;
  input?: Record<string, any>;
  options?: FallbackOption[];
  created_at?: string | Date;
  updated_at?: string | Date;
}

type ViewMode = 'overview' | 'list';

export default function FallbackExplorerTab({ product }: FallbackExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();

  // Collapse workbench sidebar when explorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  const queryClient = useQueryClient();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedFallback, setSelectedFallback] = useState<Fallback | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string>(product.envs?.[0]?.slug || 'prd');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fallbackToDelete, setFallbackToDelete] = useState<Fallback | null>(null);

  // Fetch all fallbacks for the product
  const { data: fallbacks, isLoading: isLoadingFallbacks, refetch: refetchFallbacks } = useQuery({
    queryKey: ['fallbacks', product.tag],
    queryFn: async () => {
      if (!ductape || !product.tag) return [];
      try {
        await ductape.init(product.tag);
        // @ts-ignore - SDK type might not include this
        const result = await ductape.fallbacks.list();
        console.log('[Fallback-Explorer] Fetched fallbacks:', result);
        return result || [];
      } catch (error) {
        console.error('Error fetching fallbacks:', error);
        return [];
      }
    },
    enabled: !!ductape && !!product.tag,
    staleTime: 30000,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!fallbacks) return { total: 0, options: 0, withHealthcheck: 0, byType: {} };

    let totalOptions = 0;
    let withHealthcheck = 0;
    const byType: Record<string, number> = {};

    (fallbacks as Fallback[]).forEach((f) => {
      const opts = f.options || [];
      totalOptions += opts.length;
      opts.forEach((opt: FallbackOption) => {
        if (opt.healthcheck) withHealthcheck++;
        byType[opt.type] = (byType[opt.type] || 0) + 1;
      });
    });

    return {
      total: (fallbacks as Fallback[]).length,
      options: totalOptions,
      withHealthcheck,
      byType,
    };
  }, [fallbacks]);

  // Filter fallbacks based on search
  const filteredFallbacks = useMemo(() => {
    if (!fallbacks) return [];
    if (!searchQuery) return fallbacks as Fallback[];
    return (fallbacks as Fallback[]).filter((f: Fallback) =>
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tag?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fallbacks, searchQuery]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchFallbacks();
    setIsRefreshing(false);
    toast.success('Fallbacks refreshed');
  };

  // Clear filters
  const clearFilters = () => {
    setEnvFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = envFilter !== 'all' || searchQuery !== '';

  // Delete fallback mutation
  const deleteFallbackMutation = useMutation({
    mutationFn: async (fallback: Fallback) => {
      if (!ductape || !product.tag) throw new Error('SDK not initialized');
      await ductape.init(product.tag);
      // @ts-ignore - SDK type might not include this
      return await ductape.fallbacks.delete(fallback.tag);
    },
    onSuccess: () => {
      toast.success('Fallback deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['fallbacks', product.tag] });
      setShowDeleteDialog(false);
      setFallbackToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting fallback:', error);
      toast.error(error.message || 'Failed to delete fallback');
    },
  });

  // Handle delete fallback
  const handleDeleteFallback = (fallback: Fallback) => {
    setFallbackToDelete(fallback);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (fallbackToDelete) {
      deleteFallbackMutation.mutate(fallbackToDelete);
    }
  };

  // Open fallback in view tab
  const handleViewFallback = (fallback: Fallback) => {
    openTab({
      id: `fallback-${fallback._id}-${Date.now()}`,
      type: 'fallback',
      title: fallback.name,
      itemId: fallback._id,
      data: {
        ...fallback,
        productTag: product.tag,
        productName: product.name,
      },
    });
  };

  // Open new fallback creation tab
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

  // Generate code sections for CodeSidebar
  const generateCodeSections = (language: string, env?: string) => {
    if (!selectedFallback) return [];

    const envSlug = env || selectedEnv || 'prd';

    if (language === 'javascript' || language === 'typescript') {
      const importStatement = language === 'typescript'
        ? `import Ductape from "@ductape/sdk"`
        : `const Ductape = require("@ductape/sdk")`;

      const sections = [
        {
          title: 'Init Ductape',
          code: `${importStatement}

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`
        },
        {
          title: 'Execute Fallback',
          code: `// Execute fallback with automatic failover
const result = await ductape.processor.fallback.execute({
  env: '${envSlug}',
  product: '${product.tag}',
  event: '${selectedFallback.tag}',
  input: {
    // Add your input parameters here
${Object.keys(selectedFallback.input || {}).map(key => `    ${key}: 'value'`).join(',\n')}
  },
  retries: 3
});

console.log('Fallback result:', result);`
        }
      ];

      return sections;
    }

    return [];
  };

  // Get icon for option type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <Zap className="h-3 w-3" />;
      case 'db_action':
        return <Database className="h-3 w-3" />;
      case 'feature':
        return <LayoutList className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  // Table columns
  const columnHelper = createColumnHelper<Fallback>();
  const columns = useMemo<ColumnDef<Fallback, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Fallback',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-red" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-grey">{row.original.name}</span>
              <p className="text-xs text-grey-600 truncate">{row.original.tag}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'options',
        header: 'Options',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {(row.original.options || []).slice(0, 3).map((opt, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-grey-100 text-grey-700 border-grey-200"
              >
                {getTypeIcon(opt.type)}
                <span className="ml-1">{opt.event?.split(':').pop() || opt.type}</span>
              </span>
            ))}
            {(row.original.options?.length || 0) > 3 && (
              <span className="text-xs text-grey-600">
                +{(row.original.options?.length || 0) - 3} more
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'inputs',
        header: 'Inputs',
        cell: ({ row }) => {
          const inputCount = Object.keys(row.original.input || {}).length;
          return (
            <Badge variant="outline" className="text-xs">
              {inputCount} input{inputCount !== 1 ? 's' : ''}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-grey-600">
            {row.original.created_at
              ? format(new Date(String(row.original.created_at)), 'MMM dd, yyyy')
              : '-'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4 text-grey-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleViewFallback(row.original);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setSelectedFallback(row.original);
                setShowCodeSidebar(true);
              }}>
                <Code className="h-4 w-4 mr-2" />
                View Code
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFallback(row.original);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [product.tag]
  );

  const table = useReactTable({
    data: filteredFallbacks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: currentPage - 1, pageSize });
        setCurrentPage(newState.pageIndex + 1);
        setPageSize(newState.pageSize);
      }
    },
    manualPagination: false,
  });

  // Loading state
  if (isLoadingFallbacks) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading fallbacks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-red" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{product.name}</h2>
              <p className="text-xs text-grey-600 truncate">Fallbacks</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search fallbacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Overview Link */}
          <div className="mb-2">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'overview'
                  ? 'bg-red/10 text-red'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <LayoutDashboard className={cn(
                'h-4 w-4',
                viewMode === 'overview' ? 'text-red' : 'text-grey-600'
              )} />
              <span className="flex-1 text-left font-medium">Overview</span>
            </button>
          </div>

          {/* All Fallbacks Link */}
          <div className="mb-4">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-red/10 text-red'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <Shield className={cn(
                'h-4 w-4',
                viewMode === 'list' ? 'text-red' : 'text-grey-600'
              )} />
              <span className="flex-1 text-left font-medium">All Fallbacks</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                viewMode === 'list'
                  ? 'bg-red/20 text-red'
                  : 'bg-background-secondary text-grey-600'
              )}>
                {(fallbacks as Fallback[] || []).length}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
              Option Types
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-grey-600 hover:text-red transition-colors"
              title="Refresh fallbacks"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="space-y-0.5">
            {Object.entries(metrics.byType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-2 text-sm text-grey"
              >
                <span className="text-grey-600">
                  {getTypeIcon(type)}
                </span>
                <span className="flex-1 text-left capitalize">{type.replace('_', ' ')}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-grey-600">
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Environment Filter */}
          <div className="mt-4 px-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
              Environment
            </div>
            <Select value={envFilter} onValueChange={setEnvFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                {(product.envs || []).map((env) => (
                  <SelectItem key={env.slug} value={env.slug}>
                    {env.name || env.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-grey-600 hover:text-grey"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="flex-shrink-0 p-4 border-t border-grey-400">
          <Button
            className="w-full bg-red hover:bg-red/90 text-white"
            onClick={handleCreateFallback}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Fallback
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-red" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">Fallbacks</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{product.tag}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full bg-red/10 text-red'
                    )}>
                      {metrics.total} fallback{metrics.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-border text-grey-600 hover:text-grey hover:bg-background-secondary"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="bg-red hover:bg-red/90 text-white"
                  onClick={handleCreateFallback}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Fallback
                </Button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' ? (
          /* Overview Content */
          <div className="flex-1 overflow-auto p-6">
            {/* Metrics Dashboard */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Total Fallbacks */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Fallbacks</span>
                  <Shield className="h-4 w-4 text-red" />
                </div>
                <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                <p className="text-xs text-grey-500 mt-2">{metrics.options} total options</p>
              </div>

              {/* With Healthcheck */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">With Healthcheck</span>
                  <Activity className="h-4 w-4 text-green" />
                </div>
                <p className="text-2xl font-bold text-green">{metrics.withHealthcheck}</p>
                <p className="text-xs text-grey-500 mt-2">options monitored</p>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Actions</span>
                  <Zap className="h-4 w-4 text-blue" />
                </div>
                <p className="text-2xl font-bold text-blue">{metrics.byType['action'] || 0}</p>
                <p className="text-xs text-grey-500 mt-2">action options</p>
              </div>

              {/* Environments */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Environments</span>
                  <LayoutDashboard className="h-4 w-4 text-grey-400" />
                </div>
                <p className="text-2xl font-bold text-grey">{product.envs?.length || 0}</p>
                <p className="text-xs text-grey-500 mt-2">configured</p>
              </div>
            </div>

            {/* All Fallbacks */}
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-grey">All Fallbacks</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="text-red hover:text-red/80 text-xs"
                >
                  View All
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {(fallbacks as Fallback[] || []).length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Shield className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                    <p className="text-sm text-grey-600">No fallbacks yet</p>
                    <p className="text-xs text-grey-500 mt-1">Create a fallback to get started</p>
                  </div>
                ) : (
                  (fallbacks as Fallback[] || []).slice(0, 5).map((fallback) => (
                    <div
                      key={fallback.tag}
                      className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer group"
                      onClick={() => handleViewFallback(fallback)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-4 w-4 text-red" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-grey truncate">{fallback.name}</p>
                          <p className="text-xs text-grey-500 truncate">
                            {fallback.tag} - {fallback.options?.length || 0} options
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(fallback.options || []).slice(0, 2).map((opt, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-grey-100 text-grey-700"
                          >
                            {getTypeIcon(opt.type)}
                          </span>
                        ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4 text-grey-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewFallback(fallback);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFallback(fallback);
                              setShowCodeSidebar(true);
                            }}>
                              <Code className="h-4 w-4 mr-2" />
                              View Code
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFallback(fallback);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronRight className="h-4 w-4 text-grey-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-grey-600">
                    Showing <span className="font-medium text-grey">{filteredFallbacks.length}</span> fallbacks
                  </span>
                  {hasActiveFilters && (
                    <span className="text-xs text-grey-500">(filtered)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                {isRefreshing ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="animate-spin w-8 h-8 text-red mb-4" />
                    <p className="text-sm font-medium text-grey">Loading fallbacks...</p>
                  </div>
                ) : filteredFallbacks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
                      <Shield className="h-8 w-8 text-grey-500" />
                    </div>
                    <p className="text-grey font-medium">No fallbacks found</p>
                    {hasActiveFilters && (
                      <p className="text-grey-600 text-sm mt-1">Try adjusting your filters</p>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-b border-border bg-background-secondary">
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className="text-grey-600 font-medium text-xs uppercase tracking-wider px-6 py-3"
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  {...{
                                    className: header.column.getCanSort()
                                      ? 'cursor-pointer select-none flex items-center hover:text-grey'
                                      : 'flex items-center',
                                    onClick: header.column.getToggleSortingHandler(),
                                  }}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {
                                    {
                                      asc: <ChevronUpIcon className="ml-1 h-4 w-4" />,
                                      desc: <ChevronDownIcon className="ml-1 h-4 w-4" />,
                                    }[header.column.getIsSorted() as string] ?? null
                                  }
                                </div>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="border-b border-border hover:bg-background-secondary transition-colors cursor-pointer"
                          onClick={() => handleViewFallback(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-6 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {viewMode === 'list' && filteredFallbacks.length > 0 && (
          <div className="flex-shrink-0 px-6 py-3 bg-white border-t border-border">
            <div className="flex items-center justify-between text-sm text-grey-600">
              <div className="flex items-center gap-4">
                <span>
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredFallbacks.length)} of {filteredFallbacks.length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 text-xs border border-grey-400 rounded bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs px-2">
                  Page {currentPage} of {Math.ceil(filteredFallbacks.length / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(filteredFallbacks.length / pageSize)}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Code Sidebar */}
      {showCodeSidebar && selectedFallback && (
        <CodeSidebar
          title={selectedFallback.name}
          subtitle={`Execute fallback with automatic failover using ${selectedFallback.tag}`}
          tag={selectedFallback.tag}
          onClose={() => {
            setShowCodeSidebar(false);
          }}
          generateCodeSections={generateCodeSections}
          environments={product.envs || []}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fallback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fallbackToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setFallbackToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteFallbackMutation.isPending}
            >
              {deleteFallbackMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

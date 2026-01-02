import { useState, useEffect, useMemo } from 'react';
import {
  Heart,
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
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
import { IHealthCheck, CheckEnvStatus } from '@/types/healthcheck';

interface HealthcheckExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
}

type ViewMode = 'overview' | 'list' | 'status';
type StatusFilter = 'all' | 'healthy' | 'unhealthy';

function formatAgo(timestamp?: string | Date): string {
  if (!timestamp) return 'never';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'never';
  }
}

function parseLatency(latency: string): number {
  if (!latency) return 0;
  const match = latency.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export default function HealthcheckExplorerTab({ product }: HealthcheckExplorerTabProps) {
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
  const [selectedHealthcheck, setSelectedHealthcheck] = useState<IHealthCheck | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string>(product.envs?.[0]?.slug || 'prd');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [healthcheckToDelete, setHealthcheckToDelete] = useState<IHealthCheck | null>(null);

  // Fetch all healthchecks for the product
  const { data: healthchecks, isLoading: isLoadingHealthchecks, refetch: refetchHealthchecks } = useQuery({
    queryKey: ['healthchecks', product.tag],
    queryFn: async () => {
      if (!ductape || !product.tag) return [];
      try {
        await ductape.init(product.tag);
        // @ts-ignore - SDK type might not include this
        const result = await ductape.healthchecks?.list?.() || [];
        console.log('[Healthcheck-Explorer] Fetched healthchecks:', result);
        return result || [];
      } catch (error) {
        console.error('Error fetching healthchecks:', error);
        return [];
      }
    },
    enabled: !!ductape && !!product.tag,
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every minute for live status
  });

  // Calculate metrics with status breakdown
  const metrics = useMemo(() => {
    if (!healthchecks) return {
      total: 0,
      healthy: 0,
      unhealthy: 0,
      avgLatency: '0ms',
      byEnv: {} as Record<string, { healthy: number; unhealthy: number }>,
      recentlyChecked: 0
    };

    let healthy = 0;
    let unhealthy = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let recentlyChecked = 0;
    const byEnv: Record<string, { healthy: number; unhealthy: number }> = {};

    (healthchecks as IHealthCheck[]).forEach((h) => {
      (h.envs || []).forEach((env: CheckEnvStatus) => {
        if (!byEnv[env.slug]) {
          byEnv[env.slug] = { healthy: 0, unhealthy: 0 };
        }

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

        // Count checks in last 5 minutes
        if (env.lastChecked) {
          const checkTime = new Date(env.lastChecked).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (checkTime > fiveMinutesAgo) {
            recentlyChecked++;
          }
        }
      });
    });

    return {
      total: (healthchecks as IHealthCheck[]).length,
      healthy,
      unhealthy,
      avgLatency: latencyCount > 0 ? `${Math.round(totalLatency / latencyCount)}ms` : '0ms',
      byEnv,
      recentlyChecked,
    };
  }, [healthchecks]);

  // Filter healthchecks based on search and status
  const filteredHealthchecks = useMemo(() => {
    if (!healthchecks) return [];
    let filtered = healthchecks as IHealthCheck[];

    if (searchQuery) {
      filtered = filtered.filter((h: IHealthCheck) =>
        h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.tag?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((h: IHealthCheck) => {
        const envStatus = h.envs?.find(e => e.slug === selectedEnv);
        if (statusFilter === 'healthy') {
          return envStatus?.status === 'healthy';
        } else {
          return envStatus?.status !== 'healthy';
        }
      });
    }

    return filtered;
  }, [healthchecks, searchQuery, statusFilter, selectedEnv]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchHealthchecks();
    setIsRefreshing(false);
    toast.success('Healthchecks refreshed');
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== '';

  // Delete healthcheck mutation
  const deleteHealthcheckMutation = useMutation({
    mutationFn: async (healthcheck: IHealthCheck) => {
      if (!ductape || !product.tag) throw new Error('SDK not initialized');
      await ductape.init(product.tag);
      // @ts-ignore - SDK type might not include this
      return await ductape.healthchecks?.delete?.(healthcheck.tag);
    },
    onSuccess: () => {
      toast.success('Healthcheck deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['healthchecks', product.tag] });
      setShowDeleteDialog(false);
      setHealthcheckToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting healthcheck:', error);
      toast.error(error.message || 'Failed to delete healthcheck');
    },
  });

  // Handle delete healthcheck
  const handleDeleteHealthcheck = (healthcheck: IHealthCheck) => {
    setHealthcheckToDelete(healthcheck);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (healthcheckToDelete) {
      deleteHealthcheckMutation.mutate(healthcheckToDelete);
    }
  };

  // Open healthcheck in view tab
  const handleViewHealthcheck = (healthcheck: IHealthCheck) => {
    openTab({
      id: `healthcheck-${healthcheck._id}-${Date.now()}`,
      type: 'healthcheck',
      title: healthcheck.name,
      itemId: healthcheck._id,
      data: {
        ...healthcheck,
        productTag: product.tag,
        productName: product.name,
      },
    });
  };

  // Open new healthcheck creation tab
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

  // Generate code sections for CodeSidebar
  const generateCodeSections = (language: string, env?: string) => {
    if (!selectedHealthcheck) return [];

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
          title: 'Check Health Status',
          code: `// Check current health status
const status = await ductape.healthchecks.check({
  product: '${product.tag}',
  healthcheck: '${selectedHealthcheck.tag}',
  env: '${envSlug}'
});

if (status.healthy) {
  console.log('Service is healthy');
  console.log('Latency:', status.latency);
} else {
  console.log('Service is unhealthy');
  console.log('Last available:', status.lastAvailable);
}`
        },
        {
          title: 'Use with Fallback',
          code: `// Use healthcheck in fallback configuration
const result = await ductape.processor.fallback.execute({
  env: '${envSlug}',
  product: '${product.tag}',
  event: 'your-fallback-tag',
  input: { /* your input */ },
  // Healthcheck automatically checked before routing
});`
        }
      ];

      return sections;
    }

    return [];
  };

  // Get status color
  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'text-green' : 'text-red';
  };

  // Get status background
  const getStatusBg = (status: string) => {
    return status === 'healthy' ? 'bg-green/10' : 'bg-red/10';
  };

  // Table columns
  const columnHelper = createColumnHelper<IHealthCheck>();
  const columns = useMemo<ColumnDef<IHealthCheck, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Healthcheck',
        cell: ({ row }) => {
          const envStatus = row.original.envs?.find(e => e.slug === selectedEnv);
          const isHealthy = envStatus?.status === 'healthy';
          return (
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isHealthy ? 'bg-green/10' : 'bg-red/10'
              )}>
                <Heart className={cn('h-4 w-4', isHealthy ? 'text-green' : 'text-red')} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-grey">{row.original.name}</span>
                <p className="text-xs text-grey-600 truncate">{row.original.tag}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const envStatus = row.original.envs?.find(e => e.slug === selectedEnv);
          const isHealthy = envStatus?.status === 'healthy';
          return (
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <Badge className="bg-green/10 text-green border-green/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              ) : (
                <Badge className="bg-red/10 text-red border-red/20">
                  <XCircle className="h-3 w-3 mr-1" />
                  Unhealthy
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'latency',
        header: 'Latency',
        cell: ({ row }) => {
          const envStatus = row.original.envs?.find(e => e.slug === selectedEnv);
          const latency = parseLatency(envStatus?.lastLatency || '0ms');
          const avgLatency = parseLatency(envStatus?.averageLatency || '0ms');

          return (
            <div className="flex flex-col">
              <span className={cn(
                'text-sm font-medium',
                latency < 100 ? 'text-green' : latency < 500 ? 'text-orange' : 'text-red'
              )}>
                {envStatus?.lastLatency || 'N/A'}
              </span>
              <span className="text-xs text-grey-500">avg: {envStatus?.averageLatency || 'N/A'}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'interval',
        header: 'Interval',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {row.original.checkIntervals}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'lastChecked',
        header: 'Last Checked',
        cell: ({ row }) => {
          const envStatus = row.original.envs?.find(e => e.slug === selectedEnv);
          return (
            <span className="text-sm text-grey-600">
              {formatAgo(envStatus?.lastChecked)}
            </span>
          );
        },
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
                handleViewHealthcheck(row.original);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setSelectedHealthcheck(row.original);
                setShowCodeSidebar(true);
              }}>
                <Code className="h-4 w-4 mr-2" />
                View Code
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteHealthcheck(row.original);
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
    [product.tag, selectedEnv]
  );

  const table = useReactTable({
    data: filteredHealthchecks,
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
  if (isLoadingHealthchecks) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading healthchecks...</p>
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
            <Heart className="h-5 w-5 text-red" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{product.name}</h2>
              <p className="text-xs text-grey-600 truncate">Healthchecks</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search healthchecks..."
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

          {/* Status View Link */}
          <div className="mb-2">
            <button
              onClick={() => setViewMode('status')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'status'
                  ? 'bg-red/10 text-red'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <Activity className={cn(
                'h-4 w-4',
                viewMode === 'status' ? 'text-red' : 'text-grey-600'
              )} />
              <span className="flex-1 text-left font-medium">Live Status</span>
              <span className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                metrics.unhealthy > 0 ? 'bg-red' : 'bg-green'
              )} />
            </button>
          </div>

          {/* All Healthchecks Link */}
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
              <Heart className={cn(
                'h-4 w-4',
                viewMode === 'list' ? 'text-red' : 'text-grey-600'
              )} />
              <span className="flex-1 text-left font-medium">All Healthchecks</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                viewMode === 'list'
                  ? 'bg-red/20 text-red'
                  : 'bg-background-secondary text-grey-600'
              )}>
                {(healthchecks as IHealthCheck[] || []).length}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
              Status Filter
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-grey-600 hover:text-red transition-colors"
              title="Refresh healthchecks"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                statusFilter === 'all'
                  ? 'bg-red/10 text-red'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <Activity className="h-4 w-4 text-grey-600" />
              <span className="flex-1 text-left">All</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-grey-600">
                {metrics.healthy + metrics.unhealthy}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('healthy')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                statusFilter === 'healthy'
                  ? 'bg-green/10 text-green'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <CheckCircle className="h-4 w-4 text-green" />
              <span className="flex-1 text-left">Healthy</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-green/10 text-green">
                {metrics.healthy}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('unhealthy')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                statusFilter === 'unhealthy'
                  ? 'bg-red/10 text-red'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <XCircle className="h-4 w-4 text-red" />
              <span className="flex-1 text-left">Unhealthy</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-red/10 text-red">
                {metrics.unhealthy}
              </span>
            </button>
          </div>

          {/* Environment Selector */}
          <div className="mt-4 px-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
              Environment
            </div>
            <Select value={selectedEnv} onValueChange={setSelectedEnv}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select Environment" />
              </SelectTrigger>
              <SelectContent>
                {(product.envs || []).map((env) => {
                  const envMetrics = metrics.byEnv[env.slug] || { healthy: 0, unhealthy: 0 };
                  return (
                    <SelectItem key={env.slug} value={env.slug}>
                      <div className="flex items-center gap-2">
                        <span>{env.name || env.slug}</span>
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          envMetrics.unhealthy > 0 ? 'bg-red' : 'bg-green'
                        )} />
                      </div>
                    </SelectItem>
                  );
                })}
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
            onClick={handleCreateHealthcheck}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Healthcheck
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
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  metrics.unhealthy > 0 ? 'bg-red/10' : 'bg-green/10'
                )}>
                  <Heart className={cn('h-6 w-6', metrics.unhealthy > 0 ? 'text-red' : 'text-green')} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">Healthchecks</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{product.tag}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      metrics.unhealthy > 0 ? 'bg-red/10 text-red' : 'bg-green/10 text-green'
                    )}>
                      {metrics.unhealthy > 0 ? `${metrics.unhealthy} unhealthy` : 'All healthy'}
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
                  onClick={handleCreateHealthcheck}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Healthcheck
                </Button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' ? (
          /* Overview Content */
          <div className="flex-1 overflow-auto p-6">
            {/* Metrics Dashboard */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* Total Healthchecks */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Healthchecks</span>
                  <Heart className="h-4 w-4 text-red" />
                </div>
                <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                <p className="text-xs text-grey-500 mt-2">configured</p>
              </div>

              {/* Healthy */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Healthy</span>
                  <CheckCircle className="h-4 w-4 text-green" />
                </div>
                <p className="text-2xl font-bold text-green">{metrics.healthy}</p>
                <p className="text-xs text-grey-500 mt-2">passing checks</p>
              </div>

              {/* Unhealthy */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Unhealthy</span>
                  <XCircle className="h-4 w-4 text-red" />
                </div>
                <p className="text-2xl font-bold text-red">{metrics.unhealthy}</p>
                <p className="text-xs text-grey-500 mt-2">failing checks</p>
              </div>

              {/* Avg Latency */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Avg Latency</span>
                  <Zap className="h-4 w-4 text-blue" />
                </div>
                <p className="text-2xl font-bold text-blue">{metrics.avgLatency}</p>
                <p className="text-xs text-grey-500 mt-2">response time</p>
              </div>

              {/* Recently Checked */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Recent</span>
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-purple-500">{metrics.recentlyChecked}</p>
                <p className="text-xs text-grey-500 mt-2">in last 5 mins</p>
              </div>
            </div>

            {/* Environment Status Overview */}
            <div className="bg-white rounded-lg border border-border shadow-sm mb-6">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-grey">Environment Status</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(metrics.byEnv).map(([env, status]) => {
                    const total = status.healthy + status.unhealthy;
                    const healthyPercent = total > 0 ? (status.healthy / total) * 100 : 100;
                    return (
                      <div key={env} className="p-4 rounded-lg border border-grey-200 bg-grey-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-grey uppercase">{env}</span>
                          <span className={cn(
                            'w-3 h-3 rounded-full',
                            status.unhealthy > 0 ? 'bg-red' : 'bg-green'
                          )} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-grey-600">Health</span>
                            <span className={status.unhealthy > 0 ? 'text-red' : 'text-green'}>
                              {Math.round(healthyPercent)}%
                            </span>
                          </div>
                          <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                status.unhealthy > 0 ? 'bg-orange' : 'bg-green'
                              )}
                              style={{ width: `${healthyPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-grey-600">
                            <span>{status.healthy} healthy</span>
                            <span>{status.unhealthy} unhealthy</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* All Healthchecks */}
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-grey">All Healthchecks</h3>
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
                {(healthchecks as IHealthCheck[] || []).length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Heart className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                    <p className="text-sm text-grey-600">No healthchecks yet</p>
                    <p className="text-xs text-grey-500 mt-1">Create a healthcheck to monitor your services</p>
                  </div>
                ) : (
                  (healthchecks as IHealthCheck[] || []).slice(0, 5).map((healthcheck) => {
                    const envStatus = healthcheck.envs?.find(e => e.slug === selectedEnv);
                    const isHealthy = envStatus?.status === 'healthy';
                    return (
                      <div
                        key={healthcheck.tag}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer group"
                        onClick={() => handleViewHealthcheck(healthcheck)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            isHealthy ? 'bg-green/10' : 'bg-red/10'
                          )}>
                            <Heart className={cn('h-4 w-4', isHealthy ? 'text-green' : 'text-red')} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-grey truncate">{healthcheck.name}</p>
                            <p className="text-xs text-grey-500 truncate">
                              {healthcheck.tag} - {envStatus?.lastLatency || 'N/A'} latency
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isHealthy ? (
                            <Badge className="bg-green/10 text-green border-green/20 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Healthy
                            </Badge>
                          ) : (
                            <Badge className="bg-red/10 text-red border-red/20 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Unhealthy
                            </Badge>
                          )}
                          <span className="text-xs text-grey-500">{formatAgo(envStatus?.lastChecked)}</span>
                          <ChevronRight className="h-4 w-4 text-grey-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'status' ? (
          /* Live Status View */
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-grey">Live Status</h3>
                  <span className="flex items-center gap-1 text-xs text-grey-500">
                    <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    Auto-refreshing
                  </span>
                </div>
                <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(product.envs || []).map((env) => (
                      <SelectItem key={env.slug} value={env.slug}>
                        {env.name || env.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="divide-y divide-border">
                {(healthchecks as IHealthCheck[] || []).map((healthcheck) => {
                  const envStatus = healthcheck.envs?.find(e => e.slug === selectedEnv);
                  const isHealthy = envStatus?.status === 'healthy';
                  const latency = parseLatency(envStatus?.lastLatency || '0ms');

                  return (
                    <div
                      key={healthcheck.tag}
                      className="px-5 py-4 hover:bg-background-secondary transition-colors cursor-pointer"
                      onClick={() => handleViewHealthcheck(healthcheck)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            isHealthy ? 'bg-green/10' : 'bg-red/10'
                          )}>
                            <Heart className={cn('h-5 w-5', isHealthy ? 'text-green' : 'text-red')} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-grey">{healthcheck.name}</p>
                            <p className="text-xs text-grey-500">{healthcheck.tag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={cn(
                              'text-lg font-semibold',
                              latency < 100 ? 'text-green' : latency < 500 ? 'text-orange' : 'text-red'
                            )}>
                              {envStatus?.lastLatency || 'N/A'}
                            </p>
                            <p className="text-xs text-grey-500">latency</p>
                          </div>
                          {isHealthy ? (
                            <CheckCircle className="h-6 w-6 text-green" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-grey-500 ml-13">
                        <span>Interval: {healthcheck.checkIntervals}</span>
                        <span>Retries: {healthcheck.retries}</span>
                        <span>Last check: {formatAgo(envStatus?.lastChecked)}</span>
                        {!isHealthy && envStatus?.lastAvailable && (
                          <span className="text-orange">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            Last available: {formatAgo(envStatus.lastAvailable)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    Showing <span className="font-medium text-grey">{filteredHealthchecks.length}</span> healthchecks
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
                    <p className="text-sm font-medium text-grey">Loading healthchecks...</p>
                  </div>
                ) : filteredHealthchecks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
                      <Heart className="h-8 w-8 text-grey-500" />
                    </div>
                    <p className="text-grey font-medium">No healthchecks found</p>
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
                          onClick={() => handleViewHealthcheck(row.original)}
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
        {viewMode === 'list' && filteredHealthchecks.length > 0 && (
          <div className="flex-shrink-0 px-6 py-3 bg-white border-t border-border">
            <div className="flex items-center justify-between text-sm text-grey-600">
              <div className="flex items-center gap-4">
                <span>
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredHealthchecks.length)} of {filteredHealthchecks.length}
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
                  Page {currentPage} of {Math.ceil(filteredHealthchecks.length / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(filteredHealthchecks.length / pageSize)}
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
      {showCodeSidebar && selectedHealthcheck && (
        <CodeSidebar
          title={selectedHealthcheck.name}
          subtitle={`Check health status using ${selectedHealthcheck.tag}`}
          tag={selectedHealthcheck.tag}
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
            <DialogTitle>Delete Healthcheck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{healthcheckToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setHealthcheckToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteHealthcheckMutation.isPending}
            >
              {deleteHealthcheckMutation.isPending ? (
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

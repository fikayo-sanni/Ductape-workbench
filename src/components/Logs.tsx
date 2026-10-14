import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@wojtekmaj/react-hooks';
import {
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Filter,
  X,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Terminal,
  Database,
  HardDrive,
  MessageSquare,
  Zap,
  Box,
  Boxes,
  Inbox,
  AlertTriangle,
  Clock,
  Share2,
  Timer,
  UserCheck,
  Megaphone,
  Headphones,
  Bell,
  Code,
  Webhook,
  Mail,
  Smartphone,
  MessageCircle,
  Link2,
  Lock,
  GitBranch,
  Layers,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import logsServicesReal from '@/services/logsServicesReal';
import { useAuth } from '@/store/useAuth';
import { Input } from './ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ILog } from '@/types/logs';
import { Button } from './ui/button';
import appServicesReal from '@/services/appServicesReal';
import productServicesReal from '@/services/productServicesReal';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { cn } from '@/lib/utils';
import { LogList, componentTypes } from './log-table/LogTable';

const responseStatuses = [
  { id: 'fail', name: 'Failed', icon: XCircle, color: 'text-red' },
  { id: 'processing', name: 'Processing', icon: AlertTriangle, color: 'text-yellow' },
  { id: 'success', name: 'Success', icon: CheckCircle, color: 'text-green' },
];


const timeRangeOptions = [
  { id: 'custom', name: 'Custom', label: 'Custom Range', minutes: 0 },
  { id: '30s', name: '30s', label: 'Last 30 Seconds', minutes: 0.5 },
  { id: '1m', name: '1m', label: 'Last Minute', minutes: 1 },
  { id: '5m', name: '5m', label: 'Last 5 Minutes', minutes: 5 },
  { id: '15m', name: '15m', label: 'Last 15 Minutes', minutes: 15 },
  { id: '30m', name: '30m', label: 'Last 30 Minutes', minutes: 30 },
  { id: '1h', name: '1h', label: 'Last Hour', minutes: 60 },
  { id: '5h', name: '5h', label: 'Last 5 Hours', minutes: 300 },
  { id: '24h', name: '24h', label: 'Last 24 Hours', minutes: 1440 },
  { id: '7d', name: '7d', label: 'Last 7 Days', minutes: 10080 },
  { id: '30d', name: '30d', label: 'Last 30 Days', minutes: 43200 },
];


// Default filter values (for backwards compatibility with old localStorage data)
const defaultFilters = {
  component: 'all',
  app: 'all',
  product: 'all',
  status: 'all',
  searchTerm: '',
  startDate: '',
  endDate: '',
  timeRange: '24h',
};

export default function Logs() {
  const { user, currentWorkspaceId } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { logsFilters: storedFilters, setLogsFilters } = useWorkbenchStore();
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Merge stored filters with defaults to handle missing fields from old localStorage
  const logsFilters = { ...defaultFilters, ...storedFilters };

  const debouncedSearch = useDebouncedValue(logsFilters.searchTerm || '', 500);

  // Calculate date range based on selected time range
  const getDateRange = (timeRange: string) => {
    const option = timeRangeOptions.find(opt => opt.id === timeRange);
    if (!option || option.id === 'custom') return { start_date: undefined, end_date: undefined };
    const minutes = option.minutes;
    if (!minutes) return { start_date: undefined, end_date: undefined };

    const now = new Date();
    const startDate = new Date(now.getTime() - (minutes * 60 * 1000));

    // For time ranges less than a day, send full ISO timestamp for precision
    // For longer ranges, send just the date (YYYY-MM-DD)
    if (minutes < 1440) { // Less than 24 hours
      return {
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
      };
    } else {
      return {
        start_date: startDate.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      };
    }
  };

  // Fetch products for filtering
  const { data: productsData } = useQuery({
    queryKey: ['products', currentWorkspaceId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch apps for filtering
  const { data: appsData } = useQuery({
    queryKey: ['apps', currentWorkspaceId],
    queryFn: () =>
      appServicesReal.fetchApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId,
  });

  const products = productsData?.data || [];
  const apps = appsData?.data || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: logsStatus,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['workspace-logs', currentWorkspaceId, logsFilters.component, logsFilters.app, logsFilters.product, logsFilters.status, logsFilters.startDate, logsFilters.endDate, logsFilters.timeRange, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const dateRange = getDateRange(logsFilters.timeRange);
      return logsServicesReal.fetchWorkspaceLogs(
        {
          user_id: user?._id ?? '',
          public_key: user?.public_key ?? '',
          workspace_id: currentWorkspaceId ?? '',
        },
        {
          type: logsFilters.component === 'all' ? undefined : logsFilters.component,
          app_id: logsFilters.app === 'all' ? undefined : logsFilters.app,
          product_tag: logsFilters.product === 'all' ? undefined : logsFilters.product,
          status: logsFilters.status === 'all' ? undefined : logsFilters.status,
          search: debouncedSearch || undefined,
          start_date: logsFilters.startDate || dateRange.start_date,
          end_date: logsFilters.endDate || dateRange.end_date,
          page: pageParam,
          limit: 20,
        }
      );
    },
    getNextPageParam: (lastPage) => {
      const metadata = lastPage.metadata || lastPage.data?.logs?.metadata;
      if (!metadata) return undefined;
      const { page, totalPages } = metadata;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: true,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Update last updated time when data changes
  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  const allLogs = useMemo(() => {
    return data?.pages.flatMap((page) => {
      return page?.data?.logs?.data ?? [];
    }) ?? [];
  }, [data]);

  const clearFilters = () => {
    setLogsFilters({
      component: 'all',
      app: 'all',
      product: 'all',
      status: 'all',
      searchTerm: '',
      startDate: '',
      endDate: '',
      timeRange: '24h',
    });
  };

  const activeFilterCount = [
    logsFilters.component && logsFilters.component !== 'all',
    logsFilters.app && logsFilters.app !== 'all',
    logsFilters.product && logsFilters.product !== 'all',
    logsFilters.status && logsFilters.status !== 'all',
    logsFilters.timeRange && logsFilters.timeRange !== '24h',
    logsFilters.startDate,
    logsFilters.endDate,
  ].filter(Boolean).length;

  // Loading state
  if (logsStatus === 'pending') {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-grey-600">Loading logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-grey mb-1">Workspace Logs</h1>
            <p className="text-sm text-grey-600">
              Monitor activity across your products and integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-primary text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-sm text-grey-600">
              <Clock className="h-4 w-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-grey flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Logs
              </h3>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-grey-600 hover:text-grey"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                  <Input
                    type="text"
                    placeholder="Process ID, message..."
                    value={logsFilters.searchTerm}
                    onChange={(e) => setLogsFilters({ searchTerm: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Time Range - Quick Select Pills */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Time Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {timeRangeOptions.filter(opt => opt.id !== 'custom').map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setLogsFilters({ timeRange: option.id, startDate: '', endDate: '' })}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        logsFilters.timeRange === option.id
                          ? "bg-primary text-white"
                          : "bg-grey-100 text-grey-600 hover:bg-grey-400/30 hover:text-grey"
                      )}
                    >
                      {option.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setLogsFilters({ timeRange: 'custom' })}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      logsFilters.timeRange === 'custom'
                        ? "bg-primary text-white"
                        : "bg-grey-100 text-grey-600 hover:bg-grey-400/30 hover:text-grey"
                    )}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Component Type */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Component Type
                </label>
                <Select
                  value={logsFilters.component}
                  onValueChange={(value) => setLogsFilters({ component: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {componentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Status
                </label>
                <Select
                  value={logsFilters.status}
                  onValueChange={(value) => setLogsFilters({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {responseStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Product
                </label>
                <Select
                  value={logsFilters.product}
                  onValueChange={(value) => setLogsFilters({ product: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product.tag}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* App Filter */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  App
                </label>
                <Select
                  value={logsFilters.app}
                  onValueChange={(value) => setLogsFilters({ app: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Apps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apps</SelectItem>
                    {apps.map((app) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range - appears inline when custom is selected */}
              {logsFilters.timeRange === 'custom' && (
                <div className="md:col-span-2 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-grey-600 mb-2 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={logsFilters.startDate}
                      onChange={(e) => setLogsFilters({ startDate: e.target.value })}
                    />
                  </div>
                  <span className="text-grey-600 pb-2">to</span>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-grey-600 mb-2 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={logsFilters.endDate}
                      onChange={(e) => setLogsFilters({ endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                <div className="flex flex-wrap gap-2">
                  {logsFilters.component !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>Type: {componentTypes.find(c => c.id === logsFilters.component)?.name}</span>
                      <button onClick={() => setLogsFilters({ component: 'all' })} className="hover:bg-primary/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {logsFilters.product !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>Product: {products.find(p => p.tag === logsFilters.product)?.name}</span>
                      <button onClick={() => setLogsFilters({ product: 'all' })} className="hover:bg-primary/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {logsFilters.app !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>App: {apps.find(a => a._id === logsFilters.app)?.app_name}</span>
                      <button onClick={() => setLogsFilters({ app: 'all' })} className="hover:bg-primary/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {logsFilters.status !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>Status: {responseStatuses.find(s => s.id === logsFilters.status)?.name}</span>
                      <button onClick={() => setLogsFilters({ status: 'all' })} className="hover:bg-primary/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {logsFilters.timeRange !== '24h' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>{timeRangeOptions.find(t => t.id === logsFilters.timeRange)?.label}</span>
                      <button onClick={() => setLogsFilters({ timeRange: '24h' })} className="hover:bg-primary/20 rounded p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
          {allLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Inbox className="h-12 w-12 text-grey-400 mb-3" />
              <p className="text-grey-600 font-medium">No logs found</p>
              <p className="text-sm text-grey-500 mt-1">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or search terms'
                  : 'Logs will appear here as activity occurs'}
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <LogList logs={allLogs} />
            </>
          )}
        </div>

        {/* Load More */}
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-grey-600">Loading more...</span>
            </div>
          )}
        </div>

        {/* End of List */}
        {!hasNextPage && allLogs.length > 0 && (
          <div className="text-center pb-4">
            <p className="text-xs text-grey-600">
              Showing all {allLogs.length} log entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

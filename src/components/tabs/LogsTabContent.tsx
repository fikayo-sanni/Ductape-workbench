import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@wojtekmaj/react-hooks';
import {
  ChevronDown,
  ChevronUp,
  Loader,
  Lock,
  Box,
  Database,
  HardDrive,
  Zap,
  MessageSquare,
  Terminal,
  UserCheck,
  Mail,
  Smartphone,
  MessageCircle,
  Link2,
  Bell,
  Activity,
  GitBranch,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import logsServices from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';
import { Input } from '../ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ILog } from '@/types/logs';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import appServicesReal from '@/services/appServicesReal';
import productServicesReal from '@/services/productServicesReal';

const responseStatuses = [
  { id: 'fail', name: 'Fail' },
  { id: 'processing', name: 'Processing' },
  { id: 'success', name: 'Success' },
];

const componentTypes = [
  { id: 'app', name: 'App' },
  { id: 'product', name: 'Product' },
  { id: 'database', name: 'Database' },
  { id: 'storage', name: 'Storage' },
  { id: 'cache', name: 'Cache' },
  { id: 'broker', name: 'Messaging' },
  { id: 'job', name: 'Job' },
  { id: 'session', name: 'Session' },
  { id: 'feature', name: 'Feature', icon: GitBranch },
  { id: 'feature_step', name: 'Step', icon: Layers },
  { id: 'secret', name: 'Secret', icon: Lock },
  { id: 'tokens', name: 'Tokens', icon: Lock },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'push', name: 'Push', icon: Smartphone },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'sms', name: 'SMS', icon: MessageCircle },
  { id: 'callbacks', name: 'Callbacks', icon: Link2 },
];

// Normalize backend type (e.g. "Feature_step", "Secret") to lowercase id for lookup
const normalizeLogType = (type: string) => (type || '').toLowerCase().trim();

// Display label for log type (e.g. feature_step -> "Step", secret -> "Secret")
const getLogTypeLabel = (type: string): string => {
  const id = normalizeLogType(type);
  const entry = componentTypes.find((c) => c.id === id);
  return entry?.name ?? (type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : '');
};

// Icon for each log type (Secret/Tokens: Lock; Feature: GitBranch; Feature_step: Step/Layers)
const getLogTypeIcon = (type: string) => {
  const id = normalizeLogType(type);
  const entry = componentTypes.find((c) => c.id === id && 'icon' in c && c.icon);
  if (entry && 'icon' in entry) return entry.icon as React.ComponentType<{ className?: string }>;
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    app: Box,
    product: Box,
    database: Database,
    storage: HardDrive,
    cache: Zap,
    broker: MessageSquare,
    message_broker: MessageSquare,
    job: Terminal,
    session: UserCheck,
    feature: GitBranch,
    feature_step: Layers,
    secret: Lock,
    tokens: Lock,
    notifications: Bell,
    push: Smartphone,
    email: Mail,
    sms: MessageCircle,
    callbacks: Link2,
  };
  return iconMap[id] || Activity;
};

const timeRangeOptions = [
  { id: '30s', name: 'Last 30 seconds', minutes: 0.5 },
  { id: '1m', name: 'Last 1 minute', minutes: 1 },
  { id: '5m', name: 'Last 5 minutes', minutes: 5 },
  { id: '15m', name: 'Last 15 minutes', minutes: 15 },
  { id: '30m', name: 'Last 30 minutes', minutes: 30 },
  { id: '1h', name: 'Last 1 hour', minutes: 60 },
  { id: '5h', name: 'Last 5 hours', minutes: 300 },
  { id: '24h', name: 'Last 24 hours', minutes: 1440 },
  { id: '1w', name: 'Last 1 week', minutes: 10080 },
  { id: '1mo', name: 'Last 1 month', minutes: 43200 },
  { id: '3mo', name: 'Last 3 months', minutes: 129600 },
  { id: '6mo', name: 'Last 6 months', minutes: 259200 },
  { id: '1y', name: 'Last 1 year', minutes: 525600 },
];

type ProcessLog = ILog['logs']['data'][number];


// Helper function for environment badge colors
const getEnvBadgeColor = (env: string) => {
  switch (env) {
    case 'production':
    case 'prd':
      return 'bg-green/10 text-green border-green/20';
    case 'staging':
    case 'stg':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'development':
    case 'dev':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    default:
      return 'bg-grey-100 text-grey-600 border-grey-300';
  }
};

function LogsCards({ processes }: { processes: ProcessLog[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Backend may send component (e.g. feature, feature_step) or type; prefer component for processor logs
  const getLogComponentType = (log: ProcessLog) => (log.component || log.type || '').trim();

  return (
    <div className="space-y-2">
      {processes.map((log) => {
        const componentType = getLogComponentType(log);
        const TypeIcon = getLogTypeIcon(componentType);
        return (
        <div key={log._id} className="bg-white rounded-lg border border-grey-400 overflow-hidden hover:border-primary/50 transition-colors">
          {/* Log Header */}
          <div
            className="p-3 cursor-pointer"
            onClick={() => toggleRow(log._id)}
          >
            <div className="flex items-start gap-3">
              {/* Status Indicator */}
              <div className="flex-shrink-0 mt-1">
                {log.successful_execution || log.status === 'success' ? (
                  <div className="w-2 h-2 rounded-full bg-green" />
                ) : log.status === 'fail' ? (
                  <div className="w-2 h-2 rounded-full bg-red" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Top Row: Timestamp & Expand */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-grey">
                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                  <button className="flex-shrink-0 text-grey-600 hover:text-grey">
                    {expandedRows[log._id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Process ID */}
                  <span className="text-xs font-mono text-grey-600 bg-grey-100 px-2 py-0.5 rounded">
                    {log.process_id}
                  </span>

                  {/* Environment */}
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium border',
                    getEnvBadgeColor(log.app_env || log.env)
                  )}>
                    {log.app_env || log.env}
                  </span>

                  {/* Operation */}
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {log.child_tag
                      ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
                      : log.parent_tag}
                  </span>

                  {/* Name */}
                  <span className="text-xs text-grey-600">
                    {log.name}
                  </span>

                  {/* Type with icon and label (e.g. feature_step -> "Step", secret -> "Secret") */}
                  <span className="text-xs text-grey-600 flex items-center gap-1.5 shrink-0">
                    <TypeIcon className="h-3.5 w-3.5 flex-shrink-0 text-grey-500" />
                    <span>{getLogTypeLabel(componentType)}</span>
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-grey-600">{log.message}</p>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedRows[log._id] && (
            <div className="border-t border-grey-400 bg-grey-50 p-4">
              <p className="text-xs text-grey-600 mb-2 font-medium">Request Data</p>
              <pre className="bg-white border border-grey-400 rounded-md p-3 overflow-x-auto">
                <code className="text-xs font-mono text-grey">
                  {JSON.stringify(JSON.parse(log.data), null, 2)}
                </code>
              </pre>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

export default function LogsTabContent() {
  const { user, currentWorkspaceId } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    component: 'all',
    app: 'all',
    product: 'all',
    status: 'all',
    timeRange: '24h',
  });

  const debouncedSearch = useDebouncedValue(searchTerm, 500);

  // Calculate date range based on selected time range
  const getDateRange = (timeRange: string) => {
    const option = timeRangeOptions.find(opt => opt.id === timeRange);
    if (!option) return { start_date: undefined, end_date: undefined };
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (option.minutes * 60 * 1000));
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    };
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
  } = useInfiniteQuery({
    queryKey: ['workspace-logs', currentWorkspaceId, filters, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const dateRange = getDateRange(filters.timeRange);
      return logsServices.fetchWorkspaceLogs(
        {
          user_id: user?._id ?? '',
          public_key: user?.public_key ?? '',
          workspace_id: currentWorkspaceId ?? '',
        },
        {
          type: filters.component === 'all' ? undefined : filters.component,
          app_id: filters.app === 'all' ? undefined : filters.app,
          product_id: filters.product === 'all' ? undefined : filters.product,
          status: filters.status === 'all' ? undefined : filters.status,
          process_id: debouncedSearch || undefined,
          page: pageParam,
          limit: 20,
          ...dateRange,
        }
      );
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.logs.metadata;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!currentWorkspaceId,
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

  const allLogs = useMemo(() => {
    // If no workspace ID, show empty
    if (!currentWorkspaceId) {
      return [];
    }

    const realLogs = data?.pages.flatMap((page) => page.data?.logs?.data ?? []) ?? [];
    return realLogs.length > 0 ? realLogs : [];
  }, [data, currentWorkspaceId]);

  const clearFilters = () => {
    setFilters({
      component: 'all',
      app: 'all',
      product: 'all',
      status: 'all',
      timeRange: '24h',
    });
    setSearchTerm('');
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Show dummy data if query hasn't loaded yet or if there are no real logs
  const showDummyData = !currentWorkspaceId || (logsStatus === 'success' && allLogs.length === 30);

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="bg-white px-6 py-4 border-b border-grey-400">
        <h1 className="text-grey text-xl font-bold">Workspace Logs</h1>
      </div>

      {logsStatus === 'pending' && currentWorkspaceId ? (
        <div className="flex items-center justify-center pt-20">
          <Loader className="animate-spin" />
        </div>
      ) : (
        <div className="px-6 mt-6">
          <div className="flex flex-col gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <Input
                  type="text"
                  placeholder="Search by process ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  disabled={showDummyData}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <Select
                  value={filters.component}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, component: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select component type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All components</SelectItem>
                    {componentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.product}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, product: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.app}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, app: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All apps</SelectItem>
                    {apps.map((app) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {responseStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.timeRange}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, timeRange: value }))
                  }
                  disabled={showDummyData}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filters.component !== 'all' ||
                  filters.app !== 'all' ||
                  filters.product !== 'all' ||
                  filters.status !== 'all' ||
                  filters.timeRange !== '24h' ||
                  searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-grey-600 hover:text-grey flex items-center gap-2 px-3 py-2 rounded-md hover:bg-grey-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Active Filters Display */}
              {(filters.component !== 'all' ||
                filters.app !== 'all' ||
                filters.product !== 'all' ||
                filters.status !== 'all' ||
                filters.timeRange !== '24h') && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-sm text-grey-600">Filtered by:</span>
                  {filters.component !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Component:{' '}
                      {componentTypes.find((c) => c.id === filters.component)?.name}
                    </Badge>
                  )}
                  {filters.product !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Product:{' '}
                      {products?.find((p) => p._id === filters.product)?.name ?? 'Unknown'}
                    </Badge>
                  )}
                  {filters.app !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      App: {apps?.find((a) => a._id === filters.app)?.app_name ?? 'Unknown'}
                    </Badge>
                  )}
                  {filters.status !== 'all' && (
                    <Badge variant="outline" className="text-grey">
                      Status: {capitalizeFirst(filters.status)}
                    </Badge>
                  )}
                  {filters.timeRange !== '24h' && (
                    <Badge variant="outline" className="text-grey">
                      Time: {timeRangeOptions.find((t) => t.id === filters.timeRange)?.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Logs Cards Component */}
            <LogsCards processes={allLogs} />

            {/* Load More - only show for real data */}
            {!showDummyData && (data?.pages[0]?.data?.logs?.data?.length ?? 0) > 0 && (
              <div ref={loadMoreRef}>
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* No More Logs - only show for real data */}
            {!showDummyData && (data?.pages[0]?.data?.logs?.data?.length ?? 0) > 0 && !hasNextPage && (
              <div className="flex items-center justify-center py-4">
                <p className="text-grey text-sm font-semibold">No more logs</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

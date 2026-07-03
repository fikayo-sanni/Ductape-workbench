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

const responseStatuses = [
  { id: 'fail', name: 'Failed', icon: XCircle, color: 'text-red' },
  { id: 'processing', name: 'Processing', icon: AlertTriangle, color: 'text-yellow' },
  { id: 'success', name: 'Success', icon: CheckCircle, color: 'text-green' },
];

// Component types mapped to LogEventTypes enum from backend (feature_step displayed as "Step")
const componentTypes = [
  { id: 'actions', name: 'Actions', icon: Box },
  { id: 'database_actions', name: 'Database Actions', icon: Database },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'graph', name: 'Graph', icon: Share2 },
  { id: 'vector', name: 'Vector', icon: Boxes },
  { id: 'storage', name: 'Storage', icon: HardDrive },
  { id: 'cache', name: 'Cache', icon: Zap },
  { id: 'message_broker', name: 'Message Broker', icon: MessageSquare },
  { id: 'producer', name: 'Producer', icon: Megaphone },
  { id: 'consumer', name: 'Consumer', icon: Headphones },
  { id: 'jobs', name: 'Jobs', icon: Terminal },
  { id: 'session', name: 'Session', icon: UserCheck },
  { id: 'feature', name: 'Feature', icon: GitBranch },
  { id: 'feature_step', name: 'Step', icon: Layers },
  { id: 'secret', name: 'Secret', icon: Lock },
  { id: 'tokens', name: 'Tokens', icon: Lock },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'push', name: 'Push', icon: Smartphone },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'sms', name: 'SMS', icon: MessageCircle },
  { id: 'callbacks', name: 'Callbacks', icon: Link2 },
  { id: 'functions', name: 'Functions', icon: Code },
  { id: 'webhook', name: 'Webhook', icon: Webhook },
  { id: 'frontend', name: 'Frontend', icon: Activity },
];

const normalizeLogType = (type: string) => (type || '').toLowerCase().trim();

const getLogTypeLabel = (type: string): string => {
  const id = normalizeLogType(type);
  const entry = componentTypes.find((c) => c.id === id);
  return entry?.name ?? (type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : '');
};

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

type ProcessLog = ILog['logs']['data'][number];

// Helper to safely parse and format log data
const formatLogData = (data: any): string => {
  if (data === undefined || data === null) {
    return 'No data available';
  }
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return typeof data === 'string' ? data : 'Invalid data format';
  }
};

// Helper to format latency in a human-readable way
const formatLatency = (latencyMs: number | undefined): string | null => {
  if (latencyMs === undefined || latencyMs === null) return null;
  if (latencyMs < 1) return '<1ms';
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  if (latencyMs < 60000) return `${(latencyMs / 1000).toFixed(2)}s`;
  const minutes = Math.floor(latencyMs / 60000);
  const seconds = ((latencyMs % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
};

// Get latency color based on value
const getLatencyColor = (latencyMs: number | undefined): string => {
  if (latencyMs === undefined || latencyMs === null) return 'text-grey-500';
  if (latencyMs < 200) return 'text-green'; // Fast
  if (latencyMs < 1000) return 'text-yellow-600'; // Moderate
  if (latencyMs < 3000) return 'text-orange-500'; // Slow
  return 'text-red'; // Very slow
};

// Get status config
const getStatusConfig = (log: ProcessLog) => {
  if (log.successful_execution || log.status === 'success') {
    return {
      icon: CheckCircle,
      color: 'text-green',
      bg: 'bg-green/10',
      label: 'Success',
    };
  }
  if (log.status === 'fail') {
    return {
      icon: XCircle,
      color: 'text-red',
      bg: 'bg-red/10',
      label: 'Failed',
    };
  }
  return {
    icon: AlertTriangle,
    color: 'text-yellow',
    bg: 'bg-yellow/10',
    label: 'Processing',
  };
};

// Get component icon (normalizes type; feature_step -> Layers, feature -> GitBranch, secret/tokens -> Lock)
const getComponentIcon = (type: string) => {
  const id = normalizeLogType(type);
  const component = componentTypes.find(c => c.id === id);
  if (component?.icon) return component.icon;
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    feature: GitBranch,
    feature_step: Layers,
    secret: Lock,
    tokens: Lock,
  };
  return iconMap[id] || Activity;
};

// Get environment badge style
const getEnvStyle = (env: string) => {
  switch (env?.toLowerCase()) {
    case 'prd':
    case 'production':
      return 'bg-green/10 text-green';
    case 'stg':
    case 'staging':
      return 'bg-yellow/10 text-yellow';
    case 'dev':
    case 'development':
      return 'bg-blue-500/10 text-blue-500';
    default:
      return 'bg-grey-400/20 text-grey-600';
  }
};

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-grey-400/30 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-grey-600" />
      )}
    </button>
  );
}

// Single log entry component
function LogEntry({ log, isExpanded, onToggle }: {
  log: ProcessLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = getStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const componentType = (log.component || log.type || '').trim();
  const ComponentIcon = getComponentIcon(componentType);
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.parent_tag || '-';

  return (
    <div className={cn(
      "border-b border-grey-400 last:border-0 transition-colors",
      isExpanded ? "bg-grey-100" : "hover:bg-grey-100/50"
    )}>
      {/* Main Row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <button className="flex-shrink-0 p-0.5 rounded hover:bg-grey-400/30 transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-grey-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-grey-600" />
          )}
        </button>

        {/* Status Indicator */}
        <div className={cn("flex-shrink-0 p-1.5 rounded-lg", statusConfig.bg)}>
          <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 w-[140px]">
          <p className="text-sm font-medium text-grey">
            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
          </p>
          <p className="text-xs text-grey-600">
            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
          </p>
        </div>

        {/* Component Type (feature_step -> "Step", secret -> "Secret", etc.) */}
        <div className="flex-shrink-0 w-[100px]">
          <div className="flex items-center gap-1.5">
            <ComponentIcon className="h-4 w-4 text-grey-600" />
            <span className="text-sm text-grey">{getLogTypeLabel(componentType)}</span>
          </div>
        </div>

        {/* Environment */}
        <div className="flex-shrink-0 w-[80px]">
          <span className={cn(
            "inline-flex px-2 py-0.5 text-xs font-medium rounded",
            getEnvStyle(log.app_env || log.env)
          )}>
            {(log.app_env || log.env || 'N/A').toUpperCase()}
          </span>
        </div>

        {/* Operation Tag */}
        <div className="flex-shrink-0 w-[180px]">
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded truncate max-w-[150px]">
              {operationTag}
            </code>
            <CopyButton text={operationTag} />
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-sm text-grey truncate">{log.message || log.name}</p>
          {/* Latency Badge */}
          {log.latency !== undefined && log.latency !== null && (
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded",
              getLatencyColor(log.latency),
              "bg-grey-400/10"
            )}>
              <Timer className="h-3 w-3" />
              {formatLatency(log.latency)}
            </span>
          )}
        </div>

        {/* Process ID */}
        <div className="flex-shrink-0 hidden lg:flex items-center gap-1">
          <code className="text-xs font-mono text-grey-600 bg-grey-400/20 px-2 py-0.5 rounded">
            {log.process_id?.slice(0, 12)}...
          </code>
          <CopyButton text={log.process_id} />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-14">
          <div className="bg-grey rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-grey border-b border-grey-600">
              <span className="text-xs font-medium text-white">Request Data</span>
              <CopyButton text={formatLogData(log.data)} />
            </div>
            {/* Code Block */}
            <pre className="p-4 overflow-x-auto text-xs bg-grey">
              <code className="font-mono text-green">
                {formatLogData(log.data)}
              </code>
            </pre>
          </div>

          {/* Additional Metadata */}
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-xs text-grey-600">
              <span className="font-medium">Process ID:</span>
              <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.process_id}</code>
            </div>
            {log.latency !== undefined && log.latency !== null && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-grey-600">Latency:</span>
                <code className={cn("font-mono px-1.5 py-0.5 rounded", getLatencyColor(log.latency), "bg-grey-400/10")}>
                  {formatLatency(log.latency)}
                </code>
              </div>
            )}
            {log.product_tag && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Product:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.product_tag}</code>
              </div>
            )}
            {log.ip_address && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">IP Address:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.ip_address}</code>
              </div>
            )}
            {log.language && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Language:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.language}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile log card component
function LogCard({ log }: { log: ProcessLog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = getStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const componentType = (log.component || log.type || '').trim();
  const ComponentIcon = getComponentIcon(componentType);
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.parent_tag || '-';

  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm overflow-hidden transition-all",
      isExpanded ? "border-primary shadow-md" : "border-grey-400"
    )}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", statusConfig.bg)}>
              <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
            </div>
            <div>
              <p className="text-sm font-medium text-grey">
                {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
              </p>
              <p className="text-xs text-grey-600">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded",
            getEnvStyle(log.app_env || log.env)
          )}>
            {(log.app_env || log.env || 'N/A').toUpperCase()}
          </span>
        </div>

        {/* Message */}
        <p className="text-sm text-grey mb-3">{log.message || log.name}</p>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-grey-600 bg-grey-400/20 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <ComponentIcon className="h-3.5 w-3.5" />
            {getLogTypeLabel(componentType)}
          </span>
          <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
            {operationTag}
          </code>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-grey-400 bg-grey-100 p-4">
          <div className="bg-grey rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-grey-600">
              <span className="text-xs font-medium text-white">Data</span>
              <CopyButton text={formatLogData(log.data)} />
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="font-mono text-green">
                {formatLogData(log.data)}
              </code>
            </pre>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-grey-600">
            <div>
              <span className="font-medium">ID:</span>{' '}
              <code className="font-mono">{log.process_id}</code>
            </div>
            {log.ip_address && (
              <div>
                <span className="font-medium">IP Address:</span>{' '}
                <code className="font-mono">{log.ip_address}</code>
              </div>
            )}
            {log.language && (
              <div>
                <span className="font-medium">Language:</span>{' '}
                <code className="font-mono">{log.language}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Merge stored filters with defaults to handle missing fields from old localStorage
  const logsFilters = { ...defaultFilters, ...storedFilters };

  const debouncedSearch = useDebouncedValue(logsFilters.searchTerm || '', 500);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
      return logsServicesReal.fetchLogs(
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
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                {/* Table Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-grey-100 border-b border-grey-400 text-xs font-medium text-grey-600 uppercase tracking-wider">
                  <div className="w-7" /> {/* Expand icon space */}
                  <div className="w-10" /> {/* Status icon space */}
                  <div className="w-[140px]">Timestamp</div>
                  <div className="w-[100px]">Type</div>
                  <div className="w-[80px]">Env</div>
                  <div className="w-[180px]">Operation</div>
                  <div className="flex-1">Message</div>
                  <div className="w-[140px]">Process ID</div>
                </div>

                {/* Log Entries */}
                {allLogs.map((log) => (
                  <LogEntry
                    key={log._id}
                    log={log}
                    isExpanded={expandedRows[log._id]}
                    onToggle={() => toggleRow(log._id)}
                  />
                ))}
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-3 bg-grey-100">
                {allLogs.map((log) => (
                  <LogCard key={log._id} log={log} />
                ))}
              </div>
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

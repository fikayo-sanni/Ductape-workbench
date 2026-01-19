import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Clock,
  Calendar,
  Activity,
  ChevronDown,
  ChevronRight,
  Key,
  RefreshCw,
  Loader2,
  UserCheck,
  Hash,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Timer,
  Inbox,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@wojtekmaj/react-hooks';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import sessionUsersService from '@/services/sessionUsersService';
import { fetchSessionUserLogs, fetchSessionUserDashboard } from '@/services/logsServices';

interface SessionUserTabProps {
  user: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
  sessionName?: string;
}

type ViewMode = 'overview' | 'logs';

// Time range options for log filtering
const timeRangeOptions = [
  { id: 'all', name: 'All Time', label: 'All Time', minutes: 0 },
  { id: '1h', name: '1h', label: 'Last Hour', minutes: 60 },
  { id: '24h', name: '24h', label: 'Last 24 Hours', minutes: 1440 },
  { id: '7d', name: '7d', label: 'Last 7 Days', minutes: 10080 },
  { id: '30d', name: '30d', label: 'Last 30 Days', minutes: 43200 },
  { id: 'custom', name: 'Custom', label: 'Custom Range', minutes: 0 },
];

// Status options for log filtering
const statusOptions = [
  { id: 'all', name: 'All Statuses' },
  { id: 'success', name: 'Success', icon: CheckCircle, color: 'text-green' },
  { id: 'fail', name: 'Failed', icon: XCircle, color: 'text-red' },
  { id: 'processing', name: 'Processing', icon: AlertTriangle, color: 'text-yellow' },
];

// Helper to get date range from time range selection
const getDateRangeFromTimeRange = (timeRange: string) => {
  const option = timeRangeOptions.find(opt => opt.id === timeRange);
  if (!option || option.id === 'custom' || option.id === 'all') {
    return { start_date: undefined, end_date: undefined };
  }
  const minutes = option.minutes;
  if (!minutes) return { start_date: undefined, end_date: undefined };

  const now = new Date();
  const startDate = new Date(now.getTime() - (minutes * 60 * 1000));

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: now.toISOString().split('T')[0],
  };
};

// Helper function to flatten nested objects into dot notation
const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }

  return flattened;
};

// Format time helper
const formatTime = (dateInput: string | Date | null | undefined, relative = true) => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (relative) {
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

// Get status config for log entry
const getLogStatusConfig = (log: any) => {
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

// Single log entry component - matching workspace logs design exactly
function LogEntry({ log, isExpanded, onToggle }: {
  log: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = getLogStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.feature_tag || log.parent_tag || '-';

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

        {/* Component Type */}
        <div className="flex-shrink-0 w-[100px]">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-grey-600" />
            <span className="text-sm text-grey capitalize">{log.type || 'session'}</span>
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
            {log.feature_tag && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Feature:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.feature_tag}</code>
              </div>
            )}
            {log.product_tag && (
              <div className="flex items-center gap-1.5 text-xs text-grey-600">
                <span className="font-medium">Product:</span>
                <code className="font-mono bg-grey-400/20 px-1.5 py-0.5 rounded">{log.product_tag}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile log card component
function LogCard({ log }: { log: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = getLogStatusConfig(log);
  const StatusIcon = statusConfig.icon;
  const operationTag = log.child_tag
    ? `${log.parent_tag ? `${log.parent_tag}:` : ''}${log.child_tag}`
    : log.feature_tag || log.parent_tag || '-';

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
          <span className="text-xs text-grey-600 capitalize bg-grey-400/20 px-2 py-0.5 rounded">
            {log.type || 'session'}
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
          <div className="mt-3 text-xs text-grey-600">
            <span className="font-medium">ID:</span>{' '}
            <code className="font-mono">{log.process_id}</code>
          </div>
        </div>
      )}
    </div>
  );
}

// Session Logs Table Component - matching workspace logs design exactly
function SessionLogsTable({ logs, isLoading }: { logs: any[]; isLoading: boolean }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-grey-600">Loading logs...</span>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Inbox className="h-12 w-12 text-grey-400 mb-3" />
        <p className="text-grey-600 font-medium">No logs found</p>
        <p className="text-sm text-grey-500 mt-1">
          Session activity will appear here as the user interacts
        </p>
      </div>
    );
  }

  return (
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
        {logs.map((log) => (
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
        {logs.map((log) => (
          <LogCard key={log._id} log={log} />
        ))}
      </div>
    </>
  );
}

export default function SessionUserTab({
  user,
  sessionTag,
  productTag,
  sessionName,
}: SessionUserTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user: authUser, currentWorkspaceId } = useAuth();

  // Logs filter state
  const [showFilters, setShowFilters] = useState(false);
  const [logsFilters, setLogsFilters] = useState({
    status: 'all',
    timeRange: 'all',
    searchTerm: '',
    startDate: '',
    endDate: '',
  });

  // Debounce search term to avoid too many API calls
  const debouncedSearch = useDebouncedValue(logsFilters.searchTerm, 500);

  const envSlug = user?.env || 'production';

  // Calculate active filter count
  const activeFilterCount = [
    logsFilters.status !== 'all',
    logsFilters.timeRange !== 'all',
    logsFilters.startDate,
    logsFilters.endDate,
    logsFilters.searchTerm,
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setLogsFilters({
      status: 'all',
      timeRange: 'all',
      searchTerm: '',
      startDate: '',
      endDate: '',
    });
  };

  // Fetch detailed user info with decrypted session data
  const { data: userDetails, isLoading: detailsLoading, refetch: refetchDetails } = useQuery({
    queryKey: ['session-user-details', productTag, sessionTag, user?.identifier, envSlug],
    queryFn: () => {
      if (!currentWorkspaceId || !authUser?._id || !authUser?.public_key || !user?.identifier) {
        throw new Error('Missing auth parameters');
      }
      return sessionUsersService.fetchSessionUserDetails(
        currentWorkspaceId,
        authUser._id,
        authUser.public_key,
        {
          product_tag: productTag,
          session_tag: sessionTag,
          identifier: user.identifier,
          env: envSlug,
        }
      );
    },
    enabled: !!productTag && !!sessionTag && !!user?.identifier && !!currentWorkspaceId && !!authUser?._id && !!authUser?.public_key,
  });

  // Fetch session logs for this user with infinite scroll
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'session-user-logs',
      productTag,
      sessionTag,
      user?.identifier,
      envSlug,
      logsFilters.status,
      logsFilters.timeRange,
      logsFilters.startDate,
      logsFilters.endDate,
      debouncedSearch,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (!currentWorkspaceId || !authUser?._id || !authUser?.public_key || !user?.identifier) {
        throw new Error('Missing auth parameters');
      }

      // sessionTag may be the full combined tag (e.g., "ductape:rematch:user-session")
      // Extract just the session part - it's the last segment after productTag:
      // e.g., if sessionTag is "ductape:rematch:user-session" and productTag is "ductape:rematch"
      // we want just "user-session"
      let actualSessionTag = sessionTag;
      if (sessionTag.startsWith(`${productTag}:`)) {
        actualSessionTag = sessionTag.slice(productTag.length + 1);
      } else if (sessionTag.includes(':')) {
        // Fallback: extract the last segment after the last colon
        const parts = sessionTag.split(':');
        actualSessionTag = parts[parts.length - 1];
      }

      // Get date range from time range selection
      const dateRange = getDateRangeFromTimeRange(logsFilters.timeRange);

      const response = await fetchSessionUserLogs(
        currentWorkspaceId,
        authUser._id,
        authUser.public_key,
        {
          product_tag: productTag,
          session_tag: actualSessionTag,
          identifier: user.identifier,
          env: envSlug,
          status: logsFilters.status === 'all' ? undefined : logsFilters.status as 'success' | 'fail' | 'processing',
          start_date: logsFilters.startDate || dateRange.start_date,
          end_date: logsFilters.endDate || dateRange.end_date,
          process_id: debouncedSearch || undefined,
          limit: 50,
          page: pageParam,
        }
      );

      return {
        logs: response.logs || [],
        total: response.total || 0,
        page: response.page || pageParam,
        totalPages: response.totalPages || 1,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!productTag && !!sessionTag && !!user?.identifier && !!currentWorkspaceId && !!authUser?._id && !!authUser?.public_key,
  });

  // Fetch user-specific dashboard metrics (activity timeline, peak hours, etc.) from logs service
  const { data: userDashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['session-user-dashboard', productTag, sessionTag, user?.identifier, envSlug],
    queryFn: () => {
      if (!currentWorkspaceId || !authUser?._id || !authUser?.public_key || !user?.identifier) {
        throw new Error('Missing auth parameters');
      }
      return fetchSessionUserDashboard(
        currentWorkspaceId,
        authUser._id,
        authUser.public_key,
        {
          product_tag: productTag,
          session_tag: sessionTag,
          identifier: user.identifier,
          env: envSlug,
        }
      );
    },
    enabled: !!productTag && !!sessionTag && !!user?.identifier && !!currentWorkspaceId && !!authUser?._id && !!authUser?.public_key,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchDetails(), refetchLogs(), refetchDashboard()]);
      toast.success('Data refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    }
    setIsRefreshing(false);
  };

  // Use userDetails if available, otherwise fall back to the basic user prop
  const displayUser = userDetails || user;
  const sessionData = userDetails?.latestSessionData;

  // Flatten all pages of logs into a single array
  const logs = useMemo(() => {
    if (!logsData?.pages) return [];
    return logsData.pages.flatMap(page => page.logs);
  }, [logsData?.pages]);

  const totalLogsCount = logsData?.pages?.[0]?.total || 0;

  // Infinite scroll: Load more when sentinel comes into view
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only set up observer when in logs view
    if (viewMode !== 'logs') return;

    const sentinel = loadMoreRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        root: scrollContainer,
        rootMargin: '100px' // Trigger 100px before reaching the sentinel
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Activity timeline from backend (pre-aggregated)
  const activityTimeline = useMemo(() => {
    return userDashboard?.activityTimeline || [];
  }, [userDashboard?.activityTimeline]);

  // Peak activity hours from backend (pre-aggregated)
  const peakActivityHours = useMemo(() => {
    if (!userDashboard?.peakHours) return [];

    // Transform to expected format with label
    return userDashboard.peakHours.map(h => ({
      hour: parseInt(h.hour),
      count: h.count,
      label: h.hour,
    }));
  }, [userDashboard?.peakHours]);

  // Get max count for timeline scaling
  const maxTimelineCount = useMemo(() => {
    return Math.max(...activityTimeline.map(d => d.count), 1);
  }, [activityTimeline]);

  // Success rate from backend
  const successRate = userDashboard?.successRate ?? 0;

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-lg bg-grey-100 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-grey-600" />
          </div>
          <p className="text-grey font-medium">User data not available</p>
          <p className="text-grey-600 text-sm mt-1">Please open the user again from session activity</p>
        </div>
      </div>
    );
  }

  // Check if initial data is loading
  const isInitialLoading = detailsLoading && !userDetails;

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Sidebar Header */}
        <div className={cn("flex-shrink-0 border-b border-grey-400", isSidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center gap-2", !isSidebarCollapsed && "mb-3")}>
            <UserCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{displayUser.identifier}</h2>
                <p className="text-xs text-grey-600 truncate">{envSlug}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Overview Link */}
          <div className="mb-4">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'overview'
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'text-grey hover:bg-background-secondary',
                isSidebarCollapsed && 'justify-center px-2'
              )}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard className={cn(
                'h-4 w-4 flex-shrink-0',
                viewMode === 'overview' ? 'text-blue-600' : 'text-grey-600'
              )} />
              {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
            </button>
          </div>

          {/* Navigation Items */}
          {!isSidebarCollapsed && (
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide px-2 py-2">
              Views
            </div>
          )}

          <div className="space-y-0.5">
            <button
              onClick={() => setViewMode('logs')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                viewMode === 'logs'
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'text-grey hover:bg-background-secondary',
                isSidebarCollapsed && 'justify-center px-2'
              )}
              title={isSidebarCollapsed ? 'Activity Logs' : undefined}
            >
              <Activity className={cn(
                'h-4 w-4 flex-shrink-0',
                viewMode === 'logs' ? 'text-blue-600' : 'text-grey-600'
              )} />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Activity Logs</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded min-w-[20px] text-center',
                    viewMode === 'logs'
                      ? 'bg-blue-500/20 text-blue-600'
                      : 'bg-background-secondary text-grey-600'
                  )}>
                    {logsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                    ) : (
                      totalLogsCount
                    )}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Quick Stats in Sidebar */}
          {!isSidebarCollapsed && (
            <div className="mt-6 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-3">
                Quick Stats
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-grey-600" />
                    <span className="text-sm text-grey-600">Sessions</span>
                  </div>
                  {detailsLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-grey-500" />
                  ) : (
                    <span className="text-sm font-semibold text-grey">{userDetails?.totalSessions || displayUser.session_count || 0}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green" />
                    <span className="text-sm text-grey-600">Active</span>
                  </div>
                  {detailsLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-grey-500" />
                  ) : (
                    <span className="text-sm font-semibold text-green">{userDetails?.activeSessionsCount || 0}</span>
                  )}
                </div>
                {(logsLoading || totalLogsCount > 0) && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-grey-600" />
                      <span className="text-sm text-grey-600">Success</span>
                    </div>
                    {logsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-grey-500" />
                    ) : (
                      <span className="text-sm font-semibold text-grey">
                        {successRate}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <div className="flex-shrink-0 p-2 border-t border-grey-400">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-grey-600 hover:bg-background-secondary hover:text-blue-600 transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{displayUser.identifier}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{displayUser.ductape_user_id}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      envSlug === 'production' ? 'bg-red/10 text-red' :
                      envSlug === 'staging' ? 'bg-yellow/10 text-yellow' :
                      'bg-blue-500/10 text-blue-500'
                    )}>
                      {envSlug}
                    </span>
                    {detailsLoading && <Loader2 className="h-4 w-4 animate-spin text-grey-600" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-grey-400 text-grey-600 hover:text-grey hover:bg-grey-100"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'overview' ? (
          /* Overview Content */
          isInitialLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-grey-50">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm font-medium text-grey-700">Loading user details...</p>
                <p className="text-xs text-grey-500 mt-1">Fetching session data and activity logs</p>
              </div>
            </div>
          ) : (
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - User Details & Session Data */}
              <div className="lg:col-span-2 space-y-6">
                {/* User Data Card - from decrypted session */}
                {sessionData && Object.keys(sessionData).length > 0 && (
                  <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                    <div className="px-5 py-4 border-b border-grey-400 bg-grey-50">
                      <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-blue-600" />
                        <h3 className="text-base font-semibold text-grey">Session Data</h3>
                      </div>
                      <p className="text-sm text-grey-600 mt-1">Decrypted data from latest session</p>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(flattenObject(sessionData)).map(([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-3 p-3 bg-grey-50 rounded-lg">
                            <span className="text-sm font-mono text-grey-600 break-all">{key}</span>
                            <span className="text-sm text-grey font-medium text-right break-all">
                              {typeof value === 'boolean' ? (
                                <span className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  value ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                                )}>
                                  {value.toString()}
                                </span>
                              ) : (
                                String(value)
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Timeline Card */}
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                  <div className="px-5 py-4 border-b border-grey-400 bg-grey-50">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-grey">Activity Timeline</h3>
                    </div>
                    <p className="text-sm text-grey-600 mt-1">User activity over the last 7 days</p>
                  </div>
                  <div className="p-5">
                    {activityTimeline.length > 0 && activityTimeline.some(d => d.count > 0) ? (
                      <div className="space-y-4">
                        {/* Horizontal Bar Chart */}
                        <div className="space-y-3">
                          {activityTimeline.map((day) => (
                            <div key={day.day} className="flex items-center gap-3">
                              <span className="text-xs text-grey-600 font-medium w-8">{day.day}</span>
                              <div className="flex-1 h-6 bg-grey-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${day.count > 0 ? Math.max((day.count / maxTimelineCount) * 100, 4) : 0}%`,
                                    opacity: day.count > 0 ? 1 : 0.3,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-grey-600 font-medium w-8 text-right">{day.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* Summary */}
                        <div className="pt-4 border-t border-grey-400">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-grey-600">Total Events</span>
                            <span className="text-lg font-semibold text-grey">
                              {userDashboard?.totalLogs ?? totalLogsCount} events
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BarChart3 className="h-12 w-12 text-grey-300 mb-3" />
                        <p className="text-grey-600">No activity data available</p>
                        <p className="text-sm text-grey-500 mt-1">Activity will appear as the user interacts with sessions</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peak Activity Hours Card */}
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                  <div className="px-5 py-4 border-b border-grey-400 bg-grey-50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-grey">Peak Activity Hours</h3>
                    </div>
                    <p className="text-sm text-grey-600 mt-1">When the user is most active</p>
                  </div>
                  <div className="p-5">
                    {peakActivityHours.length > 0 ? (
                      <div className="space-y-3">
                        {peakActivityHours.slice(0, 5).map((hourData, index) => (
                          <div key={hourData.hour} className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold',
                              index === 0 ? 'bg-blue-500 text-white' :
                              index === 1 ? 'bg-blue-400 text-white' :
                              index === 2 ? 'bg-blue-300 text-blue-800' :
                              'bg-grey-100 text-grey-600'
                            )}>
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-grey">{hourData.label}</span>
                                <span className="text-sm text-grey-600">{hourData.count} events</span>
                              </div>
                              <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-300',
                                    index === 0 ? 'bg-blue-500' :
                                    index === 1 ? 'bg-blue-400' :
                                    index === 2 ? 'bg-blue-300' :
                                    'bg-grey-300'
                                  )}
                                  style={{ width: `${(hourData.count / peakActivityHours[0].count) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock className="h-10 w-10 text-grey-300 mb-3" />
                        <p className="text-grey-600">No peak hours data</p>
                        <p className="text-sm text-grey-500 mt-1">Activity patterns will appear over time</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Activity & Session Info */}
              <div className="space-y-6">
                {/* Session Details Card */}
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                  <div className="px-5 py-4 border-b border-grey-400 bg-grey-50">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-grey">Session Info</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs text-grey-600 uppercase tracking-wide mb-1">Session Name</p>
                      <p className="text-sm font-medium text-grey">{sessionName || 'User Session'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-grey-600 uppercase tracking-wide mb-1">Session Tag</p>
                      <code className="text-sm font-mono text-grey bg-grey-50 px-2 py-1 rounded block">{sessionTag}</code>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-grey-400">
                      <div className="text-center p-3 bg-grey-50 rounded-lg">
                        <p className="text-2xl font-semibold text-grey">{userDetails?.totalSessions || displayUser.session_count || 0}</p>
                        <p className="text-xs text-grey-600 mt-1">Total Sessions</p>
                      </div>
                      <div className="text-center p-3 bg-green/5 rounded-lg border border-green/20">
                        <p className="text-2xl font-semibold text-green">{userDetails?.activeSessionsCount || 0}</p>
                        <p className="text-xs text-grey-600 mt-1">Active Now</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline Card */}
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                  <div className="px-5 py-4 border-b border-grey-400 bg-grey-50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-grey">Activity Timeline</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-grey">First Seen</p>
                        <p className="text-sm text-grey-600">{formatTime(displayUser.first_seen || displayUser.createdAt, false)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-green" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-grey">Last Active</p>
                        <p className="text-sm text-grey-600">{formatTime(displayUser.last_seen || displayUser.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Logs CTA */}
                <button
                  onClick={() => setViewMode('logs')}
                  className="w-full bg-white rounded-lg border border-grey-400 p-5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-grey group-hover:text-blue-600 transition-colors">View Activity Logs</p>
                        <p className="text-xs text-grey-600">{totalLogsCount} log entries</p>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-grey-400 -rotate-90" />
                  </div>
                </button>
              </div>
            </div>
          </div>
          )
        ) : (
          /* Logs View */
          <div ref={scrollContainerRef} className="flex-1 overflow-auto">
            {/* Filter Panel */}
            <div className="m-6 mb-0">
              {/* Filter Toggle Button */}
              <div className="flex items-center justify-between mb-4">
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
                      <span className="ml-1 bg-white text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-grey-600 hover:text-grey">
                      Clear all
                    </Button>
                  )}
                </div>
                <p className="text-sm text-grey-600">
                  {totalLogsCount} {totalLogsCount === 1 ? 'log entry' : 'log entries'}
                </p>
              </div>

              {/* Expandable Filter Panel */}
              {showFilters && (
                <div className="bg-white rounded-lg border border-grey-400 p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search Input */}
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
                          onChange={(e) => setLogsFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-sm font-medium text-grey-600 mb-2 block">
                        Status
                      </label>
                      <Select
                        value={logsFilters.status}
                        onValueChange={(value) => setLogsFilters(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Time Range Filter */}
                    <div>
                      <label className="text-sm font-medium text-grey-600 mb-2 block">
                        Time Range
                      </label>
                      <Select
                        value={logsFilters.timeRange}
                        onValueChange={(value) => setLogsFilters(prev => ({
                          ...prev,
                          timeRange: value,
                          // Clear custom dates when selecting a preset
                          startDate: value !== 'custom' ? '' : prev.startDate,
                          endDate: value !== 'custom' ? '' : prev.endDate,
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeRangeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Date Range - Only show when custom is selected */}
                    {logsFilters.timeRange === 'custom' && (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-grey-600 mb-2 block">
                            Start Date
                          </label>
                          <Input
                            type="date"
                            value={logsFilters.startDate}
                            onChange={(e) => setLogsFilters(prev => ({ ...prev, startDate: e.target.value }))}
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
                            onChange={(e) => setLogsFilters(prev => ({ ...prev, endDate: e.target.value }))}
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
                        {logsFilters.status !== 'all' && (
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                            <span>Status: {statusOptions.find(s => s.id === logsFilters.status)?.name}</span>
                            <button
                              onClick={() => setLogsFilters(prev => ({ ...prev, status: 'all' }))}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {logsFilters.timeRange !== 'all' && (
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                            <span>Time: {timeRangeOptions.find(t => t.id === logsFilters.timeRange)?.label}</span>
                            <button
                              onClick={() => setLogsFilters(prev => ({ ...prev, timeRange: 'all', startDate: '', endDate: '' }))}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {logsFilters.searchTerm && (
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                            <span>Search: "{logsFilters.searchTerm}"</span>
                            <button
                              onClick={() => setLogsFilters(prev => ({ ...prev, searchTerm: '' }))}
                              className="hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden mx-6">
              <SessionLogsTable logs={logs} isLoading={logsLoading} />
            </div>
            {/* Infinite scroll sentinel & status */}
            {logs.length > 0 && (
              <div className="text-center pb-4 space-y-3">
                {/* Sentinel element for IntersectionObserver */}
                <div ref={loadMoreRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-grey-600">Loading more...</span>
                  </div>
                )}
                <p className="text-xs text-grey-600">
                  {logs.length < totalLogsCount
                    ? `Showing ${logs.length} of ${totalLogsCount} log entries`
                    : `Showing all ${totalLogsCount} log entries`
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

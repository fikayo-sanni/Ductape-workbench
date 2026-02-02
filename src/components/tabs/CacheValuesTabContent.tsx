import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useSDKProxy } from '@/services/sdkProxy';
import {
  Zap,
  Loader2,
  Search,
  RefreshCw,
  Clock,
  Layers,
  Code2,
  Database,
  ChevronDown,
  ChevronRight,
  HardDrive,
  MessageSquare,
  Box,
  Shield,
  Timer,
  Workflow,
  Bell,
  Heart,
  Settings2,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  XCircle,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, getLast7DaysNormalized } from '@/lib/utils';
import toast from 'react-hot-toast';
import { fetchCacheDashboard, CacheDashboardMetrics } from '@/services/logsServices';

interface IRemoteCache {
  expiry?: Date;
  key: string;
  value: string;
  cache_tag: string;
  product_tag: string;
  component_tag: string;
  component_type: string;
  reads?: number;
  latency?: number;
}

interface CacheValuesTabContentProps {
  cache: any;
}

type FilterType = 'all' | 'expiring' | 'permanent' | 'expired';

// Sparkline component for mini charts
const Sparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-cache-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-cache-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default function CacheValuesTabContent({ cache }: CacheValuesTabContentProps) {
  // Show error if cache data is incomplete
  if (!cache?.name && !cache?.tag && !cache?.cacheTag) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete cache data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the cache from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedComponentType, setSelectedComponentType] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'overview' | 'entries'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listViewMode, setListViewMode] = useState<'list' | 'grid'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(
    user?._id && currentWorkspaceId && user?.public_key && user?.auth_token
      ? {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          token: user.auth_token,
          public_key: user.public_key,
        }
      : null
  );

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch cache values using SDK proxy with expiry filter
  const { data: cacheValuesData, isLoading, refetch } = useQuery({
    queryKey: ['cache-values', cache.cacheTag, cache.productTag, currentWorkspaceId, filterType],
    queryFn: async () => {
      if (!sdkProxy || !cache.productTag || !(cache.cacheTag || cache.tag)) {
        return [];
      }

      try {
        // Map filterType to expiryFilter - this is the backend filter
        const expiryFilter: 'all' | 'expiring' | 'permanent' | 'expired' | undefined = 
          filterType === 'all' ? undefined :
          filterType === 'expiring' ? 'expiring' :
          filterType === 'permanent' ? 'permanent' :
          filterType === 'expired' ? 'expired' :
          undefined;

        const result = await sdkProxy.caches.fetchValues({
          product: cache.productTag,
          cache: cache.cacheTag || cache.tag,
          page: 1,
          limit: 1000, // Fetch all values for the selected filter
          expiryFilter, // Backend filter - this filters in the database
        });

        return result.values || [];
      } catch (error) {
        console.error('Error fetching cache values:', error);
        return [];
      }
    },
    enabled: !!sdkProxy && !!cache.productTag && !!(cache.cacheTag || cache.tag),
  });

  // Fetch unfiltered totals for sidebar counts (always fetch 'all' for accurate counts)
  const { data: allCacheValuesData, isLoading: isLoadingTotals } = useQuery({
    queryKey: ['cache-values-totals', cache.cacheTag, cache.productTag, currentWorkspaceId],
    queryFn: async () => {
      if (!sdkProxy || !cache.productTag || !(cache.cacheTag || cache.tag)) {
        return [];
      }

      try {
        const result = await sdkProxy.caches.fetchValues({
          product: cache.productTag,
          cache: cache.cacheTag || cache.tag,
          page: 1,
          limit: 1000, // Fetch all values to calculate totals
          expiryFilter: undefined, // Always fetch all for sidebar counts
        });

        return result.values || [];
      } catch (error) {
        console.error('Error fetching cache values totals:', error);
        return [];
      }
    },
    enabled: !!sdkProxy && !!cache.productTag && !!(cache.cacheTag || cache.tag),
  });

  const cacheValues: IRemoteCache[] = cacheValuesData || [];
  const allCacheValues: IRemoteCache[] = allCacheValuesData || [];

  // Fetch cache dashboard metrics from logs service
  const { data: dashboardMetrics, isLoading: isLoadingCacheDashboard } = useQuery({
    queryKey: ['cache-dashboard-metrics', currentWorkspaceId, cache.productTag, cache.cacheTag || cache.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !cache.productTag) {
        return null;
      }
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);

      return fetchCacheDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: cache.productTag,
          cache_tag: cache.cacheTag || cache.tag,
          groupBy: 'day',
          start_date: weekAgo.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0],
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!cache.productTag && !!(cache.cacheTag || cache.tag),
  });

  // Get unique component types from filtered cache values
  const uniqueComponentTypes = Array.from(new Set(cacheValues.map(item => item.component_type)));

  // Calculate metrics - use ALL cache values for sidebar counts, filtered values for display
  const metrics = useMemo(() => {
    // Use allCacheValues for sidebar totals (unfiltered counts)
    const total = allCacheValues.length;
    const withExpiry = allCacheValues.filter(v => v.expiry).length;
    const permanent = allCacheValues.filter(v => !v.expiry).length;
    const expired = allCacheValues.filter(v => v.expiry && new Date(v.expiry).getTime() < Date.now()).length;
    const expiringSoon = allCacheValues.filter(v => {
      if (!v.expiry) return false;
      const diff = new Date(v.expiry).getTime() - Date.now();
      return diff > 0 && diff < 3600000; // Less than 1 hour
    }).length;

    // Use filtered cacheValues for display metrics
    const totalReads = cacheValues.reduce((sum, v) => sum + (v.reads ?? 0), 0);
    const latencies = cacheValues.filter(v => v.latency !== undefined).map(v => v.latency!);
    const avgLatency = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
    const uniqueComponents = new Set(cacheValues.map(v => v.component_tag)).size;

    // Empty sparkline data - will be populated from dashboard metrics if available
    const sparklineData: number[] = [];
    const latencySparkline: number[] = [];

    // Component type counts - use allCacheValues for accurate totals
    const allUniqueComponentTypes = Array.from(new Set(allCacheValues.map(item => item.component_type)));
    const componentTypeCounts = allUniqueComponentTypes.reduce((acc, type) => {
      acc[type] = allCacheValues.filter(v => v.component_type === type).length;
      return acc;
    }, {} as Record<string, number>);

    // Helper to calculate trend percentage between two values
    const calcTrend = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } => {
      if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
      const change = ((current - previous) / previous) * 100;
      return { value: Math.abs(change), direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
    };

    // Use real dashboard metrics if available, otherwise fall back to generated data
    if (dashboardMetrics) {
      const recent = dashboardMetrics.recentActivity;
      const last24h = recent?.last24Hours || { gets: 0, sets: 0, hits: 0, misses: 0 };
      const last7d = recent?.last7Days || { gets: 0, sets: 0, hits: 0, misses: 0 };

      // Calculate daily averages to compare trends
      const avgDaily7d = {
        gets: last7d.gets / 7,
        sets: last7d.sets / 7,
        hits: last7d.hits / 7,
        misses: last7d.misses / 7,
      };

      const weeklyStats = {
        reads: dashboardMetrics.totalGets || 0,
        writes: dashboardMetrics.totalSets || 0,
        hits: dashboardMetrics.totalHits || 0,
        misses: dashboardMetrics.totalMisses || 0,
        hitRate: dashboardMetrics.hitRate || 0,
        avgLatency7d: dashboardMetrics.averageOperationDuration || avgLatency,
        dailyTrend: dashboardMetrics.dailyActivity?.map(day => ({
          day: day.day,
          reads: day.gets || 0,
          writes: day.sets || 0,
          hits: day.hits || 0,
          misses: day.misses || 0,
        })) || [],
        // Trend data comparing last 24h vs daily average over 7d
        trends: {
          reads: calcTrend(last24h.gets, avgDaily7d.gets),
          writes: calcTrend(last24h.sets, avgDaily7d.sets),
          hits: calcTrend(last24h.hits, avgDaily7d.hits),
          misses: calcTrend(last24h.misses, avgDaily7d.misses),
          hitRate: calcTrend(
            last24h.hits + last24h.misses > 0 ? (last24h.hits / (last24h.hits + last24h.misses)) * 100 : 0,
            dashboardMetrics.hitRate || 0
          ),
          latency: { value: 0, direction: 'neutral' as const }, // Latency trend would need historical data
        },
      };

      // Build sparkline data from daily activity
      const readsSparkline = weeklyStats.dailyTrend.map(d => d.reads);
      const latencySparklineReal = dashboardMetrics.peakUsageTimes?.map(p => p.operationCount) || latencySparkline;

      return {
        total, withExpiry, permanent, expired, expiringSoon, totalReads, avgLatency, uniqueComponents,
        sparklineData: readsSparkline.length >= 3 ? readsSparkline : sparklineData,
        latencySparkline: latencySparklineReal.length >= 3 ? latencySparklineReal : latencySparkline,
        componentTypeCounts, weeklyStats
      };
    }

    // No dashboard metrics available - show zeros
    const weeklyStats = {
      reads: 0,
      writes: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgLatency7d: avgLatency,
      dailyTrend: [] as { day: string; reads: number; writes: number; hits: number; misses: number }[],
      trends: {
        reads: { value: 0, direction: 'neutral' as const },
        writes: { value: 0, direction: 'neutral' as const },
        hits: { value: 0, direction: 'neutral' as const },
        misses: { value: 0, direction: 'neutral' as const },
        hitRate: { value: 0, direction: 'neutral' as const },
        latency: { value: 0, direction: 'neutral' as const },
      },
    };

    return { total, withExpiry, permanent, expired, expiringSoon, totalReads, avgLatency, uniqueComponents, sparklineData, latencySparkline, componentTypeCounts, weeklyStats };
  }, [cacheValues, allCacheValues, uniqueComponentTypes, cache?.tag, cache?.cacheTag, dashboardMetrics]);

  const filteredValues = useMemo(() => {
    return cacheValues.filter(item => {
      // Search filter (client-side)
      const matchesSearch = !searchQuery ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.component_tag.toLowerCase().includes(searchQuery.toLowerCase());

      // Expiry filter is now handled server-side via expiryFilter parameter
      // No need to filter by expiry here since it's already filtered in the query

      // Component type filter (client-side)
      const matchesComponentType = selectedComponentType === 'all' || item.component_type === selectedComponentType;

      return matchesSearch && matchesComponentType;
    });
  }, [cacheValues, searchQuery, selectedComponentType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success('Cache values refreshed');
  };

  const formatCountdown = (date?: Date) => {
    if (!date) return 'Never';

    const now = new Date().getTime();
    const expiryTime = new Date(date).getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return 'Expired';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const getComponentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      database: Database,
      storage: HardDrive,
      cache: Layers,
      'message-broker': MessageSquare,
      job: Box,
      notification: Bell,
      feature: Workflow,
      fallback: Shield,
      quota: Timer,
      healthcheck: Heart,
      webhook: Settings2,
      session: KeyRound,
    };
    return icons[type] || Box;
  };

  const getExpiryConfig = (expiry?: Date) => {
    if (!expiry) {
      return { color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Permanent', dotColor: 'bg-green' };
    }
    const diff = new Date(expiry).getTime() - Date.now();
    if (diff <= 0) {
      return { color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Expired', dotColor: 'bg-red' };
    }
    if (diff < 3600000) {
      return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Expiring Soon', dotColor: 'bg-orange-500' };
    }
    return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: formatCountdown(expiry), dotColor: 'bg-blue-500' };
  };

  // Show error if cache data is incomplete
  if (!cache?.tag && !cache?.cacheTag) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <Zap className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete cache data</p>
          <p className="text-grey-500 text-sm">
            Unable to load cache values. Please try reopening this cache.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Header */}
        <div className={cn("flex-shrink-0 border-b border-grey-400", isSidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-2 mb-3")}>
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              className={cn(
                'flex items-center justify-center rounded-lg bg-orange-500/10 flex-shrink-0',
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
              title={isSidebarCollapsed ? 'Expand sidebar' : cache.name}
            >
              <Zap className="h-5 w-5 text-orange-500" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">{cache.name}</h2>
                  <p className="text-xs text-grey-600 truncate">{cache.cacheTag || cache.tag}</p>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Search */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

          {/* Navigation - independently scrollable */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {/* Overview Link */}
            <div className="mb-4">
              <button
                onClick={() => setViewMode('overview')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'overview'
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Overview' : undefined}
              >
                <LayoutDashboard className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'overview' ? 'text-orange-500' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
              </button>
            </div>

            {/* Filter Types */}
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Expiry Status
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="text-grey-600 hover:text-orange-500 transition-colors"
                  title="Refresh entries"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', (isRefreshing || isLoading) && 'animate-spin')} />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {([
                { value: 'all', label: 'All Entries', icon: <LayoutGrid className="h-4 w-4" />, count: metrics.total },
                { value: 'expiring', label: 'Expiring Soon', icon: <Clock className="h-4 w-4" />, count: metrics.expiringSoon },
                { value: 'permanent', label: 'Permanent', icon: <Shield className="h-4 w-4" />, count: metrics.permanent },
                { value: 'expired', label: 'Expired', icon: <Timer className="h-4 w-4" />, count: metrics.expired },
              ] as const).map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setFilterType(filter.value);
                    setViewMode('entries');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    viewMode === 'entries' && filterType === filter.value
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'text-grey hover:bg-background-secondary',
                    isSidebarCollapsed && 'justify-center px-2'
                  )}
                  title={isSidebarCollapsed ? filter.label : undefined}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    viewMode === 'entries' && filterType === filter.value ? 'text-orange-500' : 'text-grey-600'
                  )}>
                    {filter.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{filter.label}</span>
                      {isLoadingTotals ? (
                        <Loader2 className="h-3 w-3 animate-spin text-grey-600" />
                      ) : (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          viewMode === 'entries' && filterType === filter.value
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'bg-background-secondary text-grey-600'
                        )}>
                          {filter.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Component Type Filter */}
            {!isSidebarCollapsed && (
              <div className="mt-4 px-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                  Component Type
                </div>
                <div className="space-y-0.5">
                  {Array.from(new Set(allCacheValues.map(item => item.component_type))).map(type => {
                    const Icon = getComponentTypeIcon(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedComponentType(type === selectedComponentType ? 'all' : type);
                          setViewMode('entries');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                          selectedComponentType === type
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'text-grey hover:bg-background-secondary'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', selectedComponentType === type ? 'text-orange-500' : 'text-grey-600')} />
                        <span className="flex-1 text-left capitalize">{type.replace('-', ' ')}</span>
                        {isLoadingTotals ? (
                          <Loader2 className="h-3 w-3 animate-spin text-grey-600" />
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-grey-600">
                            {metrics.componentTypeCounts[type] || 0}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Only show expand button when collapsed */}
          {isSidebarCollapsed && (
            <div className="flex-shrink-0 p-2 border-t border-grey-400 bg-grey-50">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-2 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{cache.name} - Values</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{cache.cacheTag || cache.tag}</code>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-500">
                      {filteredValues.length} entries
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="border-grey-400 text-grey-600 hover:text-grey hover:bg-grey-100"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', (isRefreshing || isLoading) && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-grey-600">Loading cache values...</p>
              </div>
            </div>
          ) : viewMode === 'overview' ? (
            /* Overview Content */
            <div className="flex-1 overflow-auto p-6">
              {/* Key Metrics - Session Dashboard Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Total Reads (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    {metrics.weeklyStats.trends.reads.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        metrics.weeklyStats.trends.reads.direction === 'up' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.reads.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.reads.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.reads.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Reads (7 days)</div>
                </div>

                {/* Cache Writes */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-green" />
                    </div>
                    {metrics.weeklyStats.trends.writes.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        metrics.weeklyStats.trends.writes.direction === 'up' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.writes.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.writes.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.writes.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Writes (7 days)</div>
                </div>

                {/* Cache Hits */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    {metrics.weeklyStats.trends.hits.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        metrics.weeklyStats.trends.hits.direction === 'up' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.hits.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.hits.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.hits.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Cache Hits</div>
                </div>

                {/* Cache Misses */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    {metrics.weeklyStats.trends.misses.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        // For misses, down is good (green) and up is bad (red)
                        metrics.weeklyStats.trends.misses.direction === 'down' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.misses.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.misses.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.misses.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Cache Misses</div>
                </div>

                {/* Hit Rate */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                    </div>
                    {metrics.weeklyStats.trends.hitRate.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        metrics.weeklyStats.trends.hitRate.direction === 'up' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.hitRate.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.hitRate.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mb-1",
                    metrics.weeklyStats.hitRate >= 90 ? 'text-green' : metrics.weeklyStats.hitRate >= 75 ? 'text-orange-500' : 'text-red'
                  )}>
                    {metrics.weeklyStats.hitRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-grey-600 font-medium">Hit Rate</div>
                </div>

                {/* Avg Latency */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Timer className="h-5 w-5 text-indigo-600" />
                    </div>
                    {metrics.weeklyStats.trends.latency.direction !== 'neutral' && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        // For latency, down is good (green) and up is bad (red)
                        metrics.weeklyStats.trends.latency.direction === 'down' ? 'text-green' : 'text-red-500'
                      )}>
                        {metrics.weeklyStats.trends.latency.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {metrics.weeklyStats.trends.latency.value.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.avgLatency7d.toFixed(1)}ms</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Latency</div>
                </div>
              </div>

              {/* Activity Timeline (7 Days) - last 7 days with 0 for no activity */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-grey">Activity Timeline (7 Days)</h2>
                  {isLoadingCacheDashboard && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
                </div>
                {isLoadingCacheDashboard ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-4 bg-grey-200 rounded animate-pulse" />
                        <div className="flex-1 h-8 bg-grey-100 rounded-lg animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const normalized = getLast7DaysNormalized(metrics.weeklyStats.dailyTrend, (d) => (d.reads ?? 0) + (d.writes ?? 0));
                      const maxActivity = Math.max(...normalized.map((d) => d.value), 1);
                      return normalized.map((day) => {
                        const percentage = maxActivity > 0 ? (day.value / maxActivity) * 100 : 0;
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <div className="w-12 text-xs font-medium text-grey-600">{day.date}</div>
                            <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="absolute inset-0 flex items-center px-3">
                                <span className="text-xs font-semibold text-white drop-shadow-sm">
                                  {day.value.toLocaleString()} operations
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Cache Status Overview */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {/* Total Entries */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Entries</span>
                    <Database className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#F97316" />
                  </div>
                </div>

                {/* Total Reads */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Cumulative Reads</span>
                    <Zap className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-orange-500">{metrics.totalReads.toLocaleString()}</p>
                  <p className="text-xs text-grey-500 mt-2">all time</p>
                </div>

                {/* Avg Latency */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Avg Latency</span>
                    <Timer className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.avgLatency.toFixed(1)}ms</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.latencySparkline} color="#10B981" />
                  </div>
                </div>

                {/* Expiring Soon */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Expiring Soon</span>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-orange-500">{metrics.expiringSoon}</p>
                  <p className="text-xs text-grey-500 mt-2">within 1 hour</p>
                </div>

                {/* Permanent */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Permanent</span>
                    <Shield className="h-4 w-4 text-green" />
                  </div>
                  <p className="text-2xl font-bold text-green">{metrics.permanent}</p>
                  <p className="text-xs text-grey-500 mt-2">no expiration</p>
                </div>

                {/* Components */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Components</span>
                    <Layers className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.uniqueComponents}</p>
                  <p className="text-xs text-grey-500 mt-2">unique sources</p>
                </div>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* By Expiry Status */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Entries by Expiry Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Permanent', count: metrics.permanent, color: 'bg-green' },
                      { label: 'With Expiry', count: metrics.withExpiry - metrics.expired - metrics.expiringSoon, color: 'bg-blue-500' },
                      { label: 'Expiring Soon', count: metrics.expiringSoon, color: 'bg-orange-500' },
                      { label: 'Expired', count: metrics.expired, color: 'bg-red' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} entries</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${metrics.total > 0 ? (item.count / metrics.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Component Type */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Entries by Component Type</h3>
                  <div className="space-y-3">
                    {uniqueComponentTypes.slice(0, 5).map((type) => {
                      const Icon = getComponentTypeIcon(type);
                      const count = metrics.componentTypeCounts[type] || 0;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-grey-600" />
                            <span className="text-sm text-grey capitalize">{type.replace('-', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-grey">{count} entries</span>
                            <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-orange-500"
                                style={{ width: `${metrics.total > 0 ? (count / metrics.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Entries */}
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent Entries</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterType('all');
                      setViewMode('entries');
                    }}
                    className="text-orange-500 hover:text-orange-600 text-xs"
                  >
                    View All Entries
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {cacheValues.slice(0, 5).map((item, index) => {
                    const expiryConfig = getExpiryConfig(item.expiry);
                    return (
                      <div
                        key={`${item.key}-${index}`}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                        onClick={() => {
                          setViewMode('entries');
                          toggleRow(`${item.key}-${index}`);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-2 h-2 rounded-full', expiryConfig.dotColor)} />
                          <div>
                            <p className="text-sm font-medium text-grey font-mono">{item.key}</p>
                            <p className="text-xs text-grey-500">{item.component_tag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-grey-500">{item.reads?.toLocaleString() || 0} reads</span>
                          <span className={cn('text-xs', expiryConfig.color)}>{expiryConfig.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Entries List View */
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">
                      Showing <span className="font-medium text-grey">{filteredValues.length}</span> entries
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-1 border border-border">
                      <button
                        onClick={() => setListViewMode('list')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'list' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setListViewMode('grid')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'grid' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
                        )}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                  {/* Table header */}
                  <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                    <div className="grid grid-cols-[1fr,140px,140px,100px,100px,120px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                      <div>Cache Key</div>
                      <div>Component</div>
                      <div>Type</div>
                      <div>Reads</div>
                      <div>Latency</div>
                      <div>Expires In</div>
                      <div></div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-border">
                    {filteredValues.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        {/* Decorative background */}
                        <div className="relative mb-6">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-orange-500/10">
                            <Layers className="h-10 w-10 text-orange-500" />
                          </div>
                          {/* Decorative dots */}
                          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                          <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
                          <div className="absolute top-1/2 -right-6 w-2 h-2 rounded-full bg-grey-200" />
                        </div>
                        <h3 className="text-lg font-semibold text-grey mb-2">No cache entries found</h3>
                        {(searchQuery || filterType !== 'all' || selectedComponentType !== 'all') ? (
                          <p className="text-grey-600 text-sm max-w-md mb-4">
                            {searchQuery 
                              ? `No entries match "${searchQuery}"`
                              : filterType !== 'all'
                              ? `No entries found for the selected filter`
                              : `No entries found for the selected component type`
                            }
                          </p>
                        ) : (
                          <p className="text-grey-600 text-sm max-w-md mb-4">
                            This cache doesn't have any entries yet. Entries will appear here as they are cached.
                          </p>
                        )}
                        {(searchQuery || filterType !== 'all' || selectedComponentType !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery('');
                              setFilterType('all');
                              setSelectedComponentType('all');
                            }}
                            className="gap-2 border-grey-400 text-grey-600 hover:text-grey hover:bg-grey-100"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Clear filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredValues.map((item, index) => {
                        const rowKey = `${item.key}-${index}`;
                        const isExpanded = expandedRows.has(rowKey);
                        const expiryConfig = getExpiryConfig(item.expiry);
                        const Icon = getComponentTypeIcon(item.component_type);

                        return (
                          <div key={rowKey}>
                            <div
                              className={cn(
                                'grid grid-cols-[1fr,140px,140px,100px,100px,120px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                                'hover:bg-background-secondary',
                                isExpanded && 'bg-background-secondary'
                              )}
                              onClick={() => toggleRow(rowKey)}
                            >
                              {/* Key */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', expiryConfig.dotColor)} />
                                <div className="min-w-0">
                                  <span className="font-mono text-sm font-medium text-grey truncate block">{item.key}</span>
                                </div>
                              </div>

                              {/* Component */}
                              <div>
                                <span className="text-sm text-grey-600">{item.component_tag}</span>
                              </div>

                              {/* Type */}
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-grey-100 text-grey-600">
                                  <Icon className="h-3 w-3" />
                                  <span className="capitalize">{item.component_type.replace('-', ' ')}</span>
                                </div>
                              </div>

                              {/* Reads */}
                              <div className="text-sm font-medium text-grey">
                                {item.reads?.toLocaleString() || '0'}
                              </div>

                              {/* Latency */}
                              <div className="text-sm text-grey-600">
                                {item.latency ? `${item.latency}ms` : '-'}
                              </div>

                              {/* Expires */}
                              <div>
                                <div className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                  expiryConfig.bg,
                                  expiryConfig.border,
                                  'border'
                                )}>
                                  <Clock className={cn('h-3 w-3', expiryConfig.color)} />
                                  <span className={expiryConfig.color}>{expiryConfig.label}</span>
                                </div>
                              </div>

                              {/* Arrow */}
                              <div className="flex justify-end">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-grey-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-grey-400" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-6 py-4 bg-background-secondary border-t border-border">
                                <div className="space-y-4">
                                  {/* Full Key */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Full Key</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <code className="text-xs font-mono text-grey break-all">{item.key}</code>
                                    </div>
                                  </div>

                                  {/* Value */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Database className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Cached Value</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-grey-300">
                                      <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                        {formatValue(item.value)}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* Metadata Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1 text-grey-600">Cache Tag</div>
                                      <span className="text-xs font-mono text-grey">{item.cache_tag}</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1 text-grey-600">Component Tag</div>
                                      <span className="text-xs font-mono text-grey">{item.component_tag}</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1 text-grey-600">Product Tag</div>
                                      <span className="text-xs font-mono text-grey">{item.product_tag}</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="text-xs font-semibold mb-1 text-grey-600">Component Type</div>
                                      <span className="text-xs text-grey capitalize">{item.component_type}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}

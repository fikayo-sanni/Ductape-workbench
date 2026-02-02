import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Users,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Code2,
  Shield,
  RefreshCw,
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  Clock,
  TrendingUp,
  XCircle,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Inbox,
  ArrowLeft,
  RotateCcw,
  Filter,
  X,
  Megaphone,
  Headphones,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, getLast7DaysNormalized } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  fetchBrokerDashboard,
  fetchBrokerMessages,
  fetchBrokerProducers,
  fetchBrokerConsumers,
  fetchBrokerDeadLetters,
  retryBrokerMessage,
  IBrokerMessage,
  IBrokerProducer,
  IBrokerConsumer,
  IBrokerDeadLetter,
  IBrokerOverviewDashboard,
  BrokerMessageStatus,
} from '@/services/brokerMessagesService';

// Re-export types for local use
type ConsumerInstance = IBrokerConsumer;
type ProducerInstance = IBrokerProducer;

interface MessageBrokerEventsTabContentProps {
  broker: any;
}

type ViewMode = 'overview' | 'consumers' | 'producers' | 'consumer-detail' | 'producer-detail' | 'dead-letter' | 'all-events' | 'events';
type StatusFilter = 'all' | 'success' | 'failed' | 'pending' | 'duplicate';

// Skeleton component for loading states
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse bg-grey-200 rounded', className)} />
);

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
        <linearGradient id={`gradient-broker-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-broker-${color})`}
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

// Status options for filtering
const statusOptions = [
  { id: 'all', name: 'All Statuses' },
  { id: 'success', name: 'Success', color: 'text-green' },
  { id: 'failed', name: 'Failed', color: 'text-red' },
  { id: 'pending', name: 'Pending', color: 'text-orange-500' },
  { id: 'partial', name: 'Partial', color: 'text-yellow-500' },
];

export default function MessageBrokerEventsTabContent({ broker }: MessageBrokerEventsTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { activeTabId, updateTab, tabs } = useWorkbenchStore();

  // Get current tab to access persisted state
  const currentTab = tabs.find(tab => tab.id === activeTabId);
  const tabState = currentTab?.data?.tabState || {};

  const [searchQuery, setSearchQuery] = useState(tabState.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(tabState.statusFilter || 'all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(tabState.expandedRows || []));
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [viewMode, setViewMode] = useState<ViewMode>(tabState.viewMode || 'overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listViewMode, setListViewMode] = useState<'list' | 'grid'>(tabState.listViewMode || 'list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(tabState.isSidebarCollapsed || false);
  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerInstance | null>(tabState.selectedConsumer || null);
  const [selectedProducer, setSelectedProducer] = useState<ProducerInstance | null>(tabState.selectedProducer || null);
  const [showFilters, setShowFilters] = useState(tabState.showFilters || false);

  // Calculate active filter count
  const activeFilterCount = [
    statusFilter !== 'all',
    searchQuery,
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
  };

  // Ref for infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist state to tab data whenever it changes
  useEffect(() => {
    if (activeTabId && currentTab) {
      const newTabState = {
        searchQuery,
        statusFilter,
        expandedRows: Array.from(expandedRows),
        viewMode,
        listViewMode,
        isSidebarCollapsed,
        selectedConsumer,
        selectedProducer,
        showFilters,
      };

      // Only update if the state actually changed
      const currentTabState = currentTab.data?.tabState;
      const hasChanged = JSON.stringify(currentTabState) !== JSON.stringify(newTabState);

      if (hasChanged) {
        updateTab(activeTabId, {
          data: {
            ...currentTab.data,
            tabState: newTabState,
          },
        });
      }
    }
  }, [
    searchQuery,
    statusFilter,
    expandedRows,
    viewMode,
    listViewMode,
    isSidebarCollapsed,
    selectedConsumer,
    selectedProducer,
    showFilters,
    activeTabId,
  ]);

  // Get env from broker - handle both env object and envs array formats
  const brokerEnv = broker.env?.slug || broker.envs?.[0]?.slug || 'live';

  // Fetch message broker dashboard (direct API call for overview)
  const { data: dashboardData, refetch: refetchDashboard, isLoading: dashboardLoading } = useQuery<IBrokerOverviewDashboard | null>({
    queryKey: ['broker-dashboard', currentWorkspaceId, broker.productTag, brokerEnv, broker.brokerTag || broker.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return null;
      }

      return fetchBrokerDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          env: brokerEnv,
          broker_tag: broker.brokerTag || broker.tag,
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Fetch broker messages with infinite scroll pagination
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: ['broker-messages', currentWorkspaceId, broker.productTag, brokerEnv, broker.brokerTag || broker.tag, statusFilter, selectedProducer?.tag, selectedConsumer?.tag],
    queryFn: async ({ pageParam = 1 }) => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return { messages: [], total: 0, page: 1, limit: 20, hasMore: false };
      }

      return fetchBrokerMessages(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          env: brokerEnv,
          broker_tag: broker.brokerTag || broker.tag,
          status: statusFilter !== 'all' ? statusFilter as BrokerMessageStatus : undefined,
          producer_tag: selectedProducer?.tag,
          consumer_tag: selectedConsumer?.tag,
          page: pageParam,
          limit: 20,
        }
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Fetch producers list
  const { data: producersData, refetch: refetchProducers, isLoading: producersLoading } = useQuery({
    queryKey: ['broker-producers', currentWorkspaceId, broker.productTag, brokerEnv, broker.brokerTag || broker.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return { producers: [], total: 0, page: 1, limit: 50, hasMore: false };
      }

      return fetchBrokerProducers(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          env: brokerEnv,
          broker_tag: broker.brokerTag || broker.tag,
          limit: 50,
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Fetch consumers list
  const { data: consumersData, refetch: refetchConsumers, isLoading: consumersLoading } = useQuery({
    queryKey: ['broker-consumers', currentWorkspaceId, broker.productTag, brokerEnv, broker.brokerTag || broker.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return { consumers: [], total: 0, page: 1, limit: 50, hasMore: false };
      }

      return fetchBrokerConsumers(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          env: brokerEnv,
          broker_tag: broker.brokerTag || broker.tag,
          limit: 50,
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Fetch dead letters
  const { data: deadLettersData, refetch: refetchDeadLetters, isLoading: deadLettersLoading } = useQuery({
    queryKey: ['broker-dead-letters', currentWorkspaceId, broker.productTag, brokerEnv, broker.brokerTag || broker.tag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !broker.productTag) {
        return { deadLetters: [], total: 0, page: 1, limit: 50, hasMore: false };
      }

      return fetchBrokerDeadLetters(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: broker.productTag,
          env: brokerEnv,
          broker_tag: broker.brokerTag || broker.tag,
          limit: 50,
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!broker.productTag && !!(broker.brokerTag || broker.tag),
  });

  // Flatten paginated messages into a single array
  const brokerMessages: IBrokerMessage[] = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap(page => page.messages);
  }, [messagesData?.pages]);

  // Get total count from messages data
  const totalMessagesCount = messagesData?.pages?.[0]?.total || 0;

  // Get producers and consumers from API data
  const producerInstances: ProducerInstance[] = producersData?.producers || [];
  const consumerInstances: ConsumerInstance[] = consumersData?.consumers || [];
  const deadLettersList: IBrokerDeadLetter[] = deadLettersData?.deadLetters || [];

  // Infinite scroll observer setup
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (messagesLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [messagesLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Handle retry message
  const handleRetryMessage = async (messageId: string, consumerTag: string) => {
    if (!currentWorkspaceId || !user?._id || !user?.public_key) return;

    try {
      const result = await retryBrokerMessage(
        currentWorkspaceId,
        user._id,
        user.public_key,
        messageId,
        consumerTag
      );

      if (result) {
        toast.success('Message retry initiated');
        refetchMessages();
        refetchDeadLetters();
      } else {
        toast.error('Failed to retry message');
      }
    } catch (err) {
      toast.error('Error retrying message');
    }
  };

  // Show error if broker data is incomplete
  if (!broker?.name && !broker?.brokerTag) {
    return (
      <div className="h-full flex items-center justify-center bg-background-tertiary">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete messaging data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the messaging from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  // Calculate metrics from dashboard data
  const metrics = useMemo(() => {
    const stats = dashboardData?.stats;

    const total = stats?.total || 0;
    const success = stats?.success || 0;
    const failed = stats?.failed || 0;
    const pending = stats?.pending || 0;
    const partial = stats?.partial || 0;

    const producerCount = stats?.producer_count || producerInstances.length;
    const consumerCount = stats?.consumer_count || consumerInstances.length;
    const deadLetterCount = stats?.dead_letter_count || deadLettersList.length;

    const successRate = total > 0 ? (success / total) * 100 : 0;

    // Generate sparkline data from hourly distribution or fallback
    const hourlyData = dashboardData?.hourly_distribution || [];
    const sparklineData = hourlyData.length > 0
      ? hourlyData.map(h => h.count)
      : Array.from({ length: 24 }, () => Math.floor(Math.random() * 20) + 5);

    const errorSparkline = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyData.find(h => h.hour === i);
      return hourData ? Math.floor(hourData.count * 0.05) : Math.floor(Math.random() * 5);
    });

    // Build daily trend from dashboard data
    const dailyActivity = dashboardData?.daily_activity || [];
    const totalConsumed = dailyActivity.reduce((sum, d) => sum + d.consumed, 0);
    const daysWithActivity = dailyActivity.filter(d => d.consumed > 0).length || 1;
    // Calculate throughput as average messages per hour over active days
    const avgMessagesPerDay = totalConsumed / daysWithActivity;
    const avgMessagesPerHour = avgMessagesPerDay / 24;

    const weeklyStats = {
      published: dailyActivity.reduce((sum, d) => sum + d.published, 0),
      consumed: totalConsumed,
      failed: dailyActivity.reduce((sum, d) => sum + d.failed, 0),
      deadLettered: deadLetterCount,
      throughput: Math.round(avgMessagesPerHour * 10) / 10, // Messages per hour, 1 decimal
      avgLatency: stats?.avg_processing_time || 0, // Actual callback processing time in ms
      dailyTrend: dailyActivity.map(d => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        published: d.published,
        consumed: d.consumed,
      })),
    };

    return {
      total,
      success,
      failed,
      pending,
      partial,
      producerCount,
      consumerCount,
      deadLetterCount,
      successRate,
      sparklineData,
      errorSparkline,
      weeklyStats,
    };
  }, [dashboardData, producerInstances.length, consumerInstances.length, deadLettersList.length]);

  // Filter messages by search query (status filtering is done at API level)
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return brokerMessages;

    return brokerMessages.filter(msg => {
      const matchesSearch =
        msg.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.topic_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.producer_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.message_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [brokerMessages, searchQuery]);

  const toggleRow = (messageId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedRows(newExpanded);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        refetchMessages(),
        refetchProducers(),
        refetchConsumers(),
        refetchDeadLetters(),
      ]);
      toast.success('Data refreshed');
    } catch (err) {
      toast.error('Failed to refresh data');
    }
    setIsRefreshing(false);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((currentTime - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusConfig = (status: BrokerMessageStatus | string) => {
    const configs: Record<string, { color: string; bg: string; border: string; label: string; dotColor: string }> = {
      success: { color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Success', dotColor: 'bg-green' },
      failed: { color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red' },
      pending: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Pending', dotColor: 'bg-orange-500' },
      partial: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Partial', dotColor: 'bg-yellow-500' },
    };
    return configs[status] || configs.pending;
  };

  // Derive message status from consumer_deliveries
  const deriveMessageStatus = (message: IBrokerMessage): BrokerMessageStatus => {
    const deliveries = message.consumer_deliveries;

    // No consumer deliveries = pending
    if (!deliveries || deliveries.length === 0) {
      return 'pending';
    }

    const statuses = deliveries.map(d => d.status);
    const allSuccess = statuses.every(s => s === 'success');
    const allFailed = statuses.every(s => s === 'failed');
    const allPending = statuses.every(s => s === 'pending');

    if (allSuccess) {
      return 'success';
    } else if (allFailed) {
      return 'failed';
    } else if (allPending) {
      return 'pending';
    } else {
      // Mix of statuses (some success, some failed, or some pending)
      return 'partial';
    }
  };

  const getInstanceStatusConfig = (status: 'active' | 'inactive' | 'error') => {
    const configs: Record<string, { color: string; bg: string; border: string; label: string; dotColor: string }> = {
      active: { color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Active', dotColor: 'bg-green' },
      inactive: { color: 'text-grey-500', bg: 'bg-grey-500/10', border: 'border-grey-500/30', label: 'Inactive', dotColor: 'bg-grey-500' },
      error: { color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Error', dotColor: 'bg-red' },
    };
    return configs[status] || configs.inactive;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-14" : "w-64"
      )}>
        {/* Header */}
        <div className={cn("flex-shrink-0 border-b border-grey-400", isSidebarCollapsed ? "p-2" : "p-3")}>
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-2")}>
            {/* Broker Icon - clickable to expand when collapsed */}
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                } else {
                  setViewMode('overview');
                  setSelectedConsumer(null);
                  setSelectedProducer(null);
                }
              }}
              className={cn(
                "rounded-lg bg-cyan-600/10 flex items-center justify-center text-cyan-600 flex-shrink-0 transition-all hover:ring-2 hover:ring-cyan-500/50",
                isSidebarCollapsed ? "w-8 h-8" : "w-9 h-9"
              )}
              title={isSidebarCollapsed ? "Expand sidebar" : "Return to overview"}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <button
                  onClick={() => {
                    setViewMode('overview');
                    setSelectedConsumer(null);
                    setSelectedProducer(null);
                  }}
                  className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  title="Return to overview"
                >
                  <h2 className="font-semibold text-grey text-sm truncate">{broker.name}</h2>
                  <p className="text-xs text-grey-600 truncate">{broker.brokerTag || broker.tag}</p>
                </button>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 rounded hover:bg-grey-100 text-grey-500 hover:text-grey transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Search */}
          {!isSidebarCollapsed && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search events..."
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
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Overview' : undefined}
              >
                <LayoutDashboard className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'overview' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
              </button>
            </div>

            {/* Main Navigation */}
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Navigation
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-grey-600 hover:text-cyan-600 transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {/* All Events */}
              <button
                onClick={() => {
                  setViewMode('all-events');
                  setSelectedConsumer(null);
                  setSelectedProducer(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'all-events'
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'All Events' : undefined}
              >
                <LayoutGrid className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'all-events' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">All Events</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center',
                      viewMode === 'all-events'
                        ? 'bg-cyan-600/20 text-cyan-600'
                        : 'bg-background-secondary text-grey-600'
                    )}>
                      {dashboardLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      ) : (
                        metrics.total
                      )}
                    </span>
                  </>
                )}
              </button>

              {/* Consumers */}
              <button
                onClick={() => {
                  setViewMode('consumers');
                  setSelectedConsumer(null);
                  setSelectedProducer(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'consumers'
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Consumers' : undefined}
              >
                <Headphones className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'consumers' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Consumers</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center',
                      viewMode === 'consumers'
                        ? 'bg-cyan-600/20 text-cyan-600'
                        : 'bg-background-secondary text-grey-600'
                    )}>
                      {consumersLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      ) : (
                        consumerInstances.length
                      )}
                    </span>
                  </>
                )}
              </button>

              {/* Producers */}
              <button
                onClick={() => {
                  setViewMode('producers');
                  setSelectedConsumer(null);
                  setSelectedProducer(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'producers'
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Producers' : undefined}
              >
                <Megaphone className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'producers' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Producers</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center',
                      viewMode === 'producers'
                        ? 'bg-cyan-600/20 text-cyan-600'
                        : 'bg-background-secondary text-grey-600'
                    )}>
                      {producersLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      ) : (
                        producerInstances.length
                      )}
                    </span>
                  </>
                )}
              </button>

              {/* Dead Letters */}
              <button
                onClick={() => {
                  setViewMode('dead-letter');
                  setSelectedConsumer(null);
                  setSelectedProducer(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  viewMode === 'dead-letter'
                    ? 'bg-cyan-600/10 text-cyan-600'
                    : 'text-grey hover:bg-background-secondary',
                  isSidebarCollapsed && 'justify-center px-2'
                )}
                title={isSidebarCollapsed ? 'Dead Letters' : undefined}
              >
                <Trash2 className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'dead-letter' ? 'text-cyan-600' : 'text-grey-600'
                )} />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">Dead Letters</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[24px] text-center',
                      viewMode === 'dead-letter'
                        ? 'bg-cyan-600/20 text-cyan-600'
                        : 'bg-background-secondary text-grey-600'
                    )}>
                      {deadLettersLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      ) : (
                        metrics.deadLetterCount
                      )}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expand button - only shown when collapsed */}
          {isSidebarCollapsed && (
            <div className="px-2 mt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-2 rounded-lg text-grey-500 hover:bg-grey-100 hover:text-grey transition-colors"
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
                <div className="w-12 h-12 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{broker.name} - Events</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{broker.brokerTag || broker.tag}</code>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-600/10 text-cyan-600">
                      {totalMessagesCount} messages
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
            <div className="flex-1 overflow-auto p-6">
              {dashboardLoading ? (
                /* Skeleton Loading State */
                <>
                  {/* 7-Day Activity Stats Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <Skeleton className="w-12 h-4" />
                        </div>
                        <Skeleton className="h-8 w-24 mb-1" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>

                  {/* Activity Timeline Skeleton */}
                  <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="space-y-3">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-12 h-4" />
                          <Skeleton className="flex-1 h-8 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Session Metrics Skeleton */}
                  <div className="grid grid-cols-6 gap-4 mb-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg p-4 border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>

                  {/* Breakdown Charts Skeleton */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg p-5 border border-border shadow-sm">
                        <Skeleton className="h-5 w-32 mb-4" />
                        <div className="space-y-3">
                          {[...Array(3)].map((_, j) => (
                            <div key={j} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Skeleton className="w-3 h-3 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                              <Skeleton className="h-4 w-12" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Messages Skeleton */}
                  <div className="bg-white rounded-lg border border-border shadow-sm">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="divide-y divide-border">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-2 h-2 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Loaded Content */
                <>
              {/* 7-Day Activity Stats - Session Dashboard Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Messages Published (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <Send className="h-5 w-5 text-green" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.published.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Published (7 days)</div>
                </div>

                {/* Messages Consumed */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.consumed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Consumed (7 days)</div>
                </div>

                {/* Failed Messages */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red mb-1">{metrics.weeklyStats.failed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
                </div>

                {/* Dead Lettered */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-500 mb-1">{metrics.weeklyStats.deadLettered.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Dead Lettered</div>
                </div>

                {/* Throughput */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-cyan-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">
                    {metrics.weeklyStats.throughput > 0 ? `${metrics.weeklyStats.throughput.toLocaleString()}/hr` : '-'}
                  </div>
                  <div className="text-xs text-grey-600 font-medium">Avg Throughput</div>
                </div>

                {/* Avg Latency */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">
                    {metrics.weeklyStats.avgLatency > 0 ? `${Math.round(metrics.weeklyStats.avgLatency)}ms` : '-'}
                  </div>
                  <div className="text-xs text-grey-600 font-medium">Avg Latency</div>
                </div>
              </div>

              {/* Activity Timeline (7 Days) - last 7 days with 0 for no activity */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-grey">Activity Timeline (7 Days)</h2>
                  {dashboardLoading && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
                </div>
                {dashboardLoading ? (
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
                      const normalized = getLast7DaysNormalized(metrics.weeklyStats.dailyTrend, (d) => (d.published ?? 0) + (d.consumed ?? 0));
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
                                  {day.value.toLocaleString()} messages
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

              {/* Current Session Metrics Dashboard */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {/* Total Messages */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Messages</span>
                    <Activity className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#0891B2" />
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Success Rate</span>
                    <TrendingUp className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className={cn(
                    'text-2xl font-bold',
                    metrics.successRate >= 90 ? 'text-green' :
                    metrics.successRate >= 70 ? 'text-yellow' :
                    'text-red'
                  )}>
                    {metrics.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-grey-500 mt-2">{metrics.success} succeeded</p>
                </div>

                {/* Successful */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Successful</span>
                    <CheckCircle2 className="h-4 w-4 text-green" />
                  </div>
                  <p className="text-2xl font-bold text-green">{metrics.success}</p>
                  <p className="text-xs text-grey-500 mt-2">processed</p>
                </div>

                {/* Failed */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Failed</span>
                    <AlertCircle className="h-4 w-4 text-red" />
                  </div>
                  <p className="text-2xl font-bold text-red">{metrics.failed}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.errorSparkline} color="#DC3444" />
                  </div>
                </div>

                {/* Partial */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Partial</span>
                    <Shield className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-500">{metrics.partial}</p>
                  <p className="text-xs text-grey-500 mt-2">partially delivered</p>
                </div>

                {/* Dead Letters */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Dead Letters</span>
                    <Trash2 className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-orange-500">{metrics.deadLetterCount}</p>
                  <p className="text-xs text-grey-500 mt-2">need attention</p>
                </div>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* By Entity */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Broker Entities</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Producers', count: metrics.producerCount, color: 'bg-green' },
                      { label: 'Consumers', count: metrics.consumerCount, color: 'bg-blue-500' },
                      { label: 'Dead Letters', count: metrics.deadLetterCount, color: 'bg-orange-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Messages by Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Success', count: metrics.success, color: 'bg-green' },
                      { label: 'Failed', count: metrics.failed, color: 'bg-red' },
                      { label: 'Pending', count: metrics.pending, color: 'bg-orange-500' },
                      { label: 'Partial', count: metrics.partial, color: 'bg-yellow-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} messages</span>
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
              </div>

              {/* Recent Messages */}
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent Messages</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setViewMode('all-events');
                    }}
                    className="text-cyan-600 hover:text-cyan-700 text-xs"
                  >
                    View All Messages
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {dashboardLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading messages...</p>
                      <p className="text-grey-500 text-sm mt-1">Fetching broker activity</p>
                    </div>
                  ) : (dashboardData?.recent_messages?.length || 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center mb-4">
                        <Inbox className="h-6 w-6 text-grey-500" />
                      </div>
                      <p className="text-grey font-medium">No recent messages</p>
                      <p className="text-grey-500 text-sm mt-1">Messages will appear once broker operations occur</p>
                    </div>
                  ) : (
                    dashboardData?.recent_messages?.slice(0, 5).map((message) => {
                    const statusConfig = getStatusConfig(deriveMessageStatus(message));
                    return (
                      <div
                        key={message.message_id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                        onClick={() => {
                          setViewMode('all-events');
                          toggleRow(message.message_id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                          <div>
                            <p className="text-sm font-medium text-grey">{message.event}</p>
                            <p className="text-xs text-grey-500">{message.topic_tag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-green">{message.producer_tag}</span>
                          <span className="text-xs text-grey-500">{getTimeAgo(new Date(message.produced_at))}</span>
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>
              </>
              )}
            </div>
          ) : viewMode === 'consumers' ? (
            /* Consumers List View */
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,120px,100px,100px,100px,120px,100px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Consumer</div>
                    <div>Topic</div>
                    <div>Messages</div>
                    <div>Success</div>
                    <div>Failed</div>
                    <div>Last Active</div>
                    <div>Status</div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {consumersLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading consumers...</p>
                    </div>
                  ) : consumerInstances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="h-6 w-6 text-grey-500 mb-2" />
                      <p className="text-grey font-medium">No consumers found</p>
                    </div>
                  ) : (
                    consumerInstances.map((consumer) => {
                      const statusConfig = getInstanceStatusConfig(consumer.status);
                      return (
                        <div
                          key={consumer.tag}
                          className="grid grid-cols-[1fr,120px,100px,100px,100px,120px,100px] gap-4 px-6 py-4 items-center cursor-pointer hover:bg-background-secondary transition-colors"
                          onClick={() => {
                            setSelectedConsumer(consumer);
                            setViewMode('consumer-detail');
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono text-sm font-medium text-grey truncate block">{consumer.tag}</span>
                              {consumer.name && consumer.name !== consumer.tag && (
                                <span className="text-xs text-grey-500">{consumer.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-grey-600">{consumer.topic}</div>
                          <div className="text-sm font-medium text-grey">{consumer.message_count}</div>
                          <div className="text-sm font-medium text-green">{consumer.success_count}</div>
                          <div className="text-sm font-medium text-red">{consumer.failed_count}</div>
                          <div className="text-sm text-grey-600">
                            {consumer.last_activity ? getTimeAgo(new Date(consumer.last_activity)) : 'Never'}
                          </div>
                          <div>
                            <div className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                              statusConfig.bg, statusConfig.border, 'border'
                            )}>
                              <span className={statusConfig.color}>{statusConfig.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'producers' ? (
            /* Producers List View */
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,120px,100px,100px,100px,120px,100px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Producer</div>
                    <div>Topic</div>
                    <div>Messages</div>
                    <div>Success</div>
                    <div>Failed</div>
                    <div>Last Active</div>
                    <div>Status</div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {producersLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading producers...</p>
                    </div>
                  ) : producerInstances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Send className="h-6 w-6 text-grey-500 mb-2" />
                      <p className="text-grey font-medium">No producers found</p>
                    </div>
                  ) : (
                    producerInstances.map((producer) => {
                      const statusConfig = getInstanceStatusConfig(producer.status);
                      return (
                        <div
                          key={producer.tag}
                          className="grid grid-cols-[1fr,120px,100px,100px,100px,120px,100px] gap-4 px-6 py-4 items-center cursor-pointer hover:bg-background-secondary transition-colors"
                          onClick={() => {
                            setSelectedProducer(producer);
                            setViewMode('producer-detail');
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Send className="h-4 w-4 text-green flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono text-sm font-medium text-grey truncate block">{producer.tag}</span>
                              {producer.name && producer.name !== producer.tag && (
                                <span className="text-xs text-grey-500">{producer.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-grey-600">{producer.topic}</div>
                          <div className="text-sm font-medium text-grey">{producer.message_count}</div>
                          <div className="text-sm font-medium text-green">{producer.success_count}</div>
                          <div className="text-sm font-medium text-red">{producer.failed_count}</div>
                          <div className="text-sm text-grey-600">
                            {producer.last_activity ? getTimeAgo(new Date(producer.last_activity)) : 'Never'}
                          </div>
                          <div>
                            <div className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                              statusConfig.bg, statusConfig.border, 'border'
                            )}>
                              <span className={statusConfig.color}>{statusConfig.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'dead-letter' ? (
            /* Dead Letters View */
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,120px,120px,100px,100px,80px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Message</div>
                    <div>Consumer</div>
                    <div>Error</div>
                    <div>Failed At</div>
                    <div>Retries</div>
                    <div>Action</div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {deadLettersLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading dead letters...</p>
                    </div>
                  ) : deadLettersList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Trash2 className="h-6 w-6 text-grey-500 mb-2" />
                      <p className="text-grey font-medium">No dead letters found</p>
                    </div>
                  ) : (
                    deadLettersList.map((deadLetter) => (
                      <div
                        key={`${deadLetter.message_id}-${deadLetter.consumer_tag}`}
                        className="grid grid-cols-[1fr,120px,120px,100px,100px,80px] gap-4 px-6 py-4 items-center"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AlertCircle className="h-4 w-4 text-red flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-mono text-sm font-medium text-grey truncate block">{deadLetter.message_id}</span>
                            <span className="text-xs text-grey-500">{deadLetter.original_message?.event || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="text-sm text-grey-600">{deadLetter.consumer_tag}</div>
                        <div className="text-sm text-red truncate" title={deadLetter.error}>
                          {deadLetter.error?.substring(0, 30)}...
                        </div>
                        <div className="text-sm text-grey-600">
                          {deadLetter.failed_at ? getTimeAgo(new Date(deadLetter.failed_at)) : 'Unknown'}
                        </div>
                        <div className="text-sm text-grey-600">{deadLetter.retry_count}</div>
                        <div>
                          {deadLetter.can_retry && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryMessage(deadLetter.message_id, deadLetter.consumer_tag)}
                              className="h-7 text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'consumer-detail' && selectedConsumer ? (
            /* Consumer Detail View */
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedConsumer(null);
                    setViewMode('consumers');
                  }}
                  className="text-grey-600 hover:text-grey"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Consumers
                </Button>
              </div>
              <div className="bg-white rounded-lg border border-border p-6 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-grey">{selectedConsumer.tag}</h2>
                    <p className="text-sm text-grey-500">Topic: {selectedConsumer.topic}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Total Messages</div>
                    <div className="text-xl font-bold text-grey">{selectedConsumer.message_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Successful</div>
                    <div className="text-xl font-bold text-green">{selectedConsumer.success_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Failed</div>
                    <div className="text-xl font-bold text-red">{selectedConsumer.failed_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Pending</div>
                    <div className="text-xl font-bold text-orange-500">{selectedConsumer.pending_count}</div>
                  </div>
                </div>
              </div>
              {/* Filter Panel for Consumer Messages */}
              <div className="mb-4">
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
                    {selectedConsumer.message_count} {selectedConsumer.message_count === 1 ? 'message' : 'messages'}
                  </p>
                </div>

                {showFilters && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-grey-600 mb-2 block">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                          <Input
                            type="text"
                            placeholder="Event, topic, message ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-grey-600 mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                          <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-grey-400">
                        <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                        <div className="flex flex-wrap gap-2">
                          {statusFilter !== 'all' && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Status: {statusOptions.find(s => s.id === statusFilter)?.name}</span>
                              <button onClick={() => setStatusFilter('all')} className="hover:bg-cyan-600/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                            </div>
                          )}
                          {searchQuery && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Search: "{searchQuery}"</span>
                              <button onClick={() => setSearchQuery('')} className="hover:bg-cyan-600/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Consumer's Messages Table */}
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                {/* Table header */}
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Message</div>
                    <div>Producer</div>
                    <div>Topic</div>
                    <div>Status</div>
                    <div>Time</div>
                    <div></div>
                  </div>
                </div>

                {/* Table body */}
                <div className="divide-y divide-border">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading messages...</p>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Inbox className="h-6 w-6 text-grey-500 mb-2" />
                      <p className="text-grey font-medium">No messages found</p>
                    </div>
                  ) : (
                    filteredMessages.map((message, index) => {
                      const isExpanded = expandedRows.has(message.message_id);
                      const statusConfig = getStatusConfig(deriveMessageStatus(message));
                      const isLast = index === filteredMessages.length - 1;

                      return (
                        <div key={message.message_id} ref={isLast ? lastElementRef : null}>
                          <div
                            className={cn(
                              'grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                              'hover:bg-background-secondary',
                              isExpanded && 'bg-background-secondary'
                            )}
                            onClick={() => toggleRow(message.message_id)}
                          >
                            {/* Message */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium text-grey">{message.event}</span>
                                  {message.idempotency_key && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500">
                                      <Shield className="h-3 w-3" />
                                      <span>idempotent</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-grey-500 truncate font-mono">{message.message_id}</p>
                              </div>
                            </div>

                            {/* Producer */}
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green/10 text-green">
                                <Send className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{message.producer_tag}</span>
                              </div>
                            </div>

                            {/* Topic */}
                            <div className="text-sm text-grey-600">
                              {message.topic_tag}
                            </div>

                            {/* Status */}
                            <div>
                              <div className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                statusConfig.bg, statusConfig.border, 'border'
                              )}>
                                <span className={statusConfig.color}>{statusConfig.label}</span>
                              </div>
                            </div>

                            {/* Time */}
                            <div className="text-sm text-grey-600">
                              {getTimeAgo(new Date(message.produced_at))}
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
                                {/* Message Details */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Code2 className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Details</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <span className="text-grey-600">Message ID:</span>
                                        <span className="ml-2 font-mono text-grey">{message.message_id}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Produced At:</span>
                                        <span className="ml-2 text-grey">{new Date(message.produced_at).toLocaleString()}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Producer:</span>
                                        <span className="ml-2 text-green font-medium">{message.producer_tag}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Topic:</span>
                                        <span className="ml-2 text-grey">{message.topic_tag}</span>
                                      </div>
                                      {message.idempotency_key && (
                                        <div className="col-span-2">
                                          <span className="text-grey-600">Idempotency Key:</span>
                                          <span className="ml-2 font-mono text-blue-600">{message.idempotency_key}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Consumer Deliveries */}
                                {message.consumer_deliveries && message.consumer_deliveries.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Consumer Deliveries ({message.consumer_deliveries.length})</span>
                                    </div>
                                    <div className="space-y-2">
                                      {message.consumer_deliveries.map((delivery, idx) => {
                                        const deliveryStatusConfig = getStatusConfig(delivery.status);
                                        return (
                                          <div key={idx} className="bg-white rounded-lg p-3 border border-grey-300">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium text-grey">{delivery.consumer_tag}</span>
                                              </div>
                                              <div className={cn(
                                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                                deliveryStatusConfig.bg, deliveryStatusConfig.border, 'border'
                                              )}>
                                                <span className={deliveryStatusConfig.color}>{deliveryStatusConfig.label}</span>
                                              </div>
                                            </div>
                                            {delivery.error && (
                                              <div className="mt-2 text-xs text-red bg-red/5 p-2 rounded">
                                                Error: {delivery.error}
                                              </div>
                                            )}
                                            {delivery.consumed_at && (
                                              <div className="mt-1 text-xs text-grey-500">
                                                Consumed at: {new Date(delivery.consumed_at).toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Decrypted Message Data */}
                                {message.message_decrypted && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Content</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                        {JSON.stringify(message.message_decrypted, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Metadata */}
                                {message.metadata && Object.keys(message.metadata).length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Metadata</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                        {JSON.stringify(message.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'producer-detail' && selectedProducer ? (
            /* Producer Detail View */
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProducer(null);
                    setViewMode('producers');
                  }}
                  className="text-grey-600 hover:text-grey"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Producers
                </Button>
              </div>
              <div className="bg-white rounded-lg border border-border p-6 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
                    <Send className="h-6 w-6 text-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-grey">{selectedProducer.tag}</h2>
                    <p className="text-sm text-grey-500">Topic: {selectedProducer.topic}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Total Messages</div>
                    <div className="text-xl font-bold text-grey">{selectedProducer.message_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Successful</div>
                    <div className="text-xl font-bold text-green">{selectedProducer.success_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Failed</div>
                    <div className="text-xl font-bold text-red">{selectedProducer.failed_count}</div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-3">
                    <div className="text-xs text-grey-600 mb-1">Pending</div>
                    <div className="text-xl font-bold text-orange-500">{selectedProducer.pending_count}</div>
                  </div>
                </div>
              </div>
              {/* Filter Panel for Producer Messages */}
              <div className="mb-4">
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
                    {selectedProducer.message_count} {selectedProducer.message_count === 1 ? 'message' : 'messages'}
                  </p>
                </div>

                {showFilters && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-grey-600 mb-2 block">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                          <Input
                            type="text"
                            placeholder="Event, topic, message ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-grey-600 mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                          <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-grey-400">
                        <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                        <div className="flex flex-wrap gap-2">
                          {statusFilter !== 'all' && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Status: {statusOptions.find(s => s.id === statusFilter)?.name}</span>
                              <button onClick={() => setStatusFilter('all')} className="hover:bg-cyan-600/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                            </div>
                          )}
                          {searchQuery && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Search: "{searchQuery}"</span>
                              <button onClick={() => setSearchQuery('')} className="hover:bg-cyan-600/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Producer's Messages Table */}
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                {/* Table header */}
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Message</div>
                    <div>Producer</div>
                    <div>Topic</div>
                    <div>Status</div>
                    <div>Time</div>
                    <div></div>
                  </div>
                </div>

                {/* Table body */}
                <div className="divide-y divide-border">
                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                      <p className="text-grey font-medium">Loading messages...</p>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Inbox className="h-6 w-6 text-grey-500 mb-2" />
                      <p className="text-grey font-medium">No messages found</p>
                    </div>
                  ) : (
                    filteredMessages.map((message, index) => {
                      const isExpanded = expandedRows.has(message.message_id);
                      const statusConfig = getStatusConfig(deriveMessageStatus(message));
                      const isLast = index === filteredMessages.length - 1;

                      return (
                        <div key={message.message_id} ref={isLast ? lastElementRef : null}>
                          <div
                            className={cn(
                              'grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                              'hover:bg-background-secondary',
                              isExpanded && 'bg-background-secondary'
                            )}
                            onClick={() => toggleRow(message.message_id)}
                          >
                            {/* Message */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium text-grey">{message.event}</span>
                                  {message.idempotency_key && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500">
                                      <Shield className="h-3 w-3" />
                                      <span>idempotent</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-grey-500 truncate font-mono">{message.message_id}</p>
                              </div>
                            </div>

                            {/* Producer */}
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green/10 text-green">
                                <Send className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{message.producer_tag}</span>
                              </div>
                            </div>

                            {/* Topic */}
                            <div className="text-sm text-grey-600">
                              {message.topic_tag}
                            </div>

                            {/* Status */}
                            <div>
                              <div className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                statusConfig.bg, statusConfig.border, 'border'
                              )}>
                                <span className={statusConfig.color}>{statusConfig.label}</span>
                              </div>
                            </div>

                            {/* Time */}
                            <div className="text-sm text-grey-600">
                              {getTimeAgo(new Date(message.produced_at))}
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
                                {/* Message Details */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Code2 className="h-4 w-4 text-grey-600" />
                                    <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Details</span>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-grey-300">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <span className="text-grey-600">Message ID:</span>
                                        <span className="ml-2 font-mono text-grey">{message.message_id}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Produced At:</span>
                                        <span className="ml-2 text-grey">{new Date(message.produced_at).toLocaleString()}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Producer:</span>
                                        <span className="ml-2 text-green font-medium">{message.producer_tag}</span>
                                      </div>
                                      <div>
                                        <span className="text-grey-600">Topic:</span>
                                        <span className="ml-2 text-grey">{message.topic_tag}</span>
                                      </div>
                                      {message.idempotency_key && (
                                        <div className="col-span-2">
                                          <span className="text-grey-600">Idempotency Key:</span>
                                          <span className="ml-2 font-mono text-blue-600">{message.idempotency_key}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Consumer Deliveries */}
                                {message.consumer_deliveries && message.consumer_deliveries.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Consumer Deliveries ({message.consumer_deliveries.length})</span>
                                    </div>
                                    <div className="space-y-2">
                                      {message.consumer_deliveries.map((delivery, idx) => {
                                        const deliveryStatusConfig = getStatusConfig(delivery.status);
                                        return (
                                          <div key={idx} className="bg-white rounded-lg p-3 border border-grey-300">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium text-grey">{delivery.consumer_tag}</span>
                                              </div>
                                              <div className={cn(
                                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                                deliveryStatusConfig.bg, deliveryStatusConfig.border, 'border'
                                              )}>
                                                <span className={deliveryStatusConfig.color}>{deliveryStatusConfig.label}</span>
                                              </div>
                                            </div>
                                            {delivery.error && (
                                              <div className="mt-2 text-xs text-red bg-red/5 p-2 rounded">
                                                Error: {delivery.error}
                                              </div>
                                            )}
                                            {delivery.consumed_at && (
                                              <div className="mt-1 text-xs text-grey-500">
                                                Consumed at: {new Date(delivery.consumed_at).toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Decrypted Message Data */}
                                {message.message_decrypted && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Content</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                        {JSON.stringify(message.message_decrypted, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Metadata */}
                                {message.metadata && Object.keys(message.metadata).length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Metadata</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                        {JSON.stringify(message.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* All Events / Messages List View */
            <>
              {/* Filter Panel */}
              <div className="flex-shrink-0 px-6 pt-4">
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
                    {totalMessagesCount} {totalMessagesCount === 1 ? 'message' : 'messages'}
                  </p>
                </div>

                {/* Expandable Filter Panel */}
                {showFilters && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Search Input */}
                      <div>
                        <label className="text-sm font-medium text-grey-600 mb-2 block">
                          Search
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
                          <Input
                            type="text"
                            placeholder="Event, topic, message ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                          value={statusFilter}
                          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
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
                    </div>

                    {/* Active Filters Display */}
                    {activeFilterCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-grey-400">
                        <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                        <div className="flex flex-wrap gap-2">
                          {statusFilter !== 'all' && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Status: {statusOptions.find(s => s.id === statusFilter)?.name}</span>
                              <button
                                onClick={() => setStatusFilter('all')}
                                className="hover:bg-cyan-600/20 rounded p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {searchQuery && (
                            <div className="flex items-center gap-1 bg-cyan-600/10 text-cyan-600 px-2 py-1 rounded text-xs">
                              <span>Search: "{searchQuery}"</span>
                              <button
                                onClick={() => setSearchQuery('')}
                                className="hover:bg-cyan-600/20 rounded p-0.5"
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

              {/* Messages Table */}
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                  {/* Table header */}
                  <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                    <div className="grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                      <div>Message</div>
                      <div>Producer</div>
                      <div>Topic</div>
                      <div>Status</div>
                      <div>Time</div>
                      <div></div>
                    </div>
                  </div>

                  {/* Table body */}
                  <div className="divide-y divide-border">
                    {messagesLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-4" />
                        <p className="text-grey font-medium">Loading messages...</p>
                        <p className="text-grey-500 text-sm mt-1">Fetching broker activity</p>
                      </div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Inbox className="h-6 w-6 text-grey-500 mb-2" />
                        <p className="text-grey font-medium">No messages found</p>
                      </div>
                    ) : (
                      filteredMessages.map((message, index) => {
                        const isExpanded = expandedRows.has(message.message_id);
                        const statusConfig = getStatusConfig(deriveMessageStatus(message));
                        const isLast = index === filteredMessages.length - 1;

                        return (
                          <div key={message.message_id} ref={isLast ? lastElementRef : null}>
                            <div
                              className={cn(
                                'grid grid-cols-[1fr,140px,140px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                                'hover:bg-background-secondary',
                                isExpanded && 'bg-background-secondary'
                              )}
                              onClick={() => toggleRow(message.message_id)}
                            >
                              {/* Message */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium text-grey">{message.event}</span>
                                    {message.idempotency_key && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500">
                                        <Shield className="h-3 w-3" />
                                        <span>idempotent</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-grey-500 truncate font-mono">{message.message_id}</p>
                                </div>
                              </div>

                              {/* Producer */}
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green/10 text-green">
                                  <Send className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">{message.producer_tag}</span>
                                </div>
                              </div>

                              {/* Topic */}
                              <div className="text-sm text-grey-600">
                                {message.topic_tag}
                              </div>

                              {/* Status */}
                              <div>
                                <div className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                  statusConfig.bg,
                                  statusConfig.border,
                                  'border'
                                )}>
                                  <span className={statusConfig.color}>{statusConfig.label}</span>
                                </div>
                              </div>

                              {/* Time */}
                              <div className="text-sm text-grey-600">
                                {getTimeAgo(new Date(message.produced_at))}
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
                                  {/* Message Details */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Code2 className="h-4 w-4 text-grey-600" />
                                      <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Details</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-grey-300">
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <span className="text-grey-600">Message ID:</span>
                                          <span className="ml-2 font-mono text-grey">{message.message_id}</span>
                                        </div>
                                        <div>
                                          <span className="text-grey-600">Produced At:</span>
                                          <span className="ml-2 text-grey">{new Date(message.produced_at).toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="text-grey-600">Producer:</span>
                                          <span className="ml-2 text-green font-medium">{message.producer_tag}</span>
                                        </div>
                                        <div>
                                          <span className="text-grey-600">Topic:</span>
                                          <span className="ml-2 text-grey">{message.topic_tag}</span>
                                        </div>
                                        {message.idempotency_key && (
                                          <div className="col-span-2">
                                            <span className="text-grey-600">Idempotency Key:</span>
                                            <span className="ml-2 font-mono text-blue-600">{message.idempotency_key}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Consumer Deliveries */}
                                  {message.consumer_deliveries && message.consumer_deliveries.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-4 w-4 text-grey-600" />
                                        <span className="text-xs font-semibold text-grey uppercase tracking-wide">Consumer Deliveries ({message.consumer_deliveries.length})</span>
                                      </div>
                                      <div className="space-y-2">
                                        {message.consumer_deliveries.map((delivery, idx) => {
                                          const deliveryStatusConfig = getStatusConfig(delivery.status);
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-grey-300">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <Users className="h-4 w-4 text-blue-500" />
                                                  <span className="text-sm font-medium text-grey">{delivery.consumer_tag}</span>
                                                </div>
                                                <div className={cn(
                                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                                                  deliveryStatusConfig.bg, deliveryStatusConfig.border, 'border'
                                                )}>
                                                  <span className={deliveryStatusConfig.color}>{deliveryStatusConfig.label}</span>
                                                </div>
                                              </div>
                                              {delivery.error && (
                                                <div className="mt-2 text-xs text-red bg-red/5 p-2 rounded">
                                                  Error: {delivery.error}
                                                </div>
                                              )}
                                              {delivery.consumed_at && (
                                                <div className="mt-1 text-xs text-grey-500">
                                                  Consumed at: {new Date(delivery.consumed_at).toLocaleString()}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Decrypted Message Data */}
                                  {message.message_decrypted && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Code2 className="h-4 w-4 text-grey-600" />
                                        <span className="text-xs font-semibold text-grey uppercase tracking-wide">Message Content</span>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-grey-300">
                                        <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                                          {JSON.stringify(message.message_decrypted, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  {message.metadata && Object.keys(message.metadata).length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Code2 className="h-4 w-4 text-grey-600" />
                                        <span className="text-xs font-semibold text-grey uppercase tracking-wide">Metadata</span>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-grey-300">
                                        <pre className="text-xs font-mono text-grey overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                          {JSON.stringify(message.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {isFetchingNextPage && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
                      </div>
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

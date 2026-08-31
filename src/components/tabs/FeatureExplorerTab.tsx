import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Search,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Activity,
  Timer,
  Pause,
  RotateCcw,
  Calendar,
  LayoutGrid,
  BarChart3,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Webhook,
  Zap,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { getTabState, saveTabState } from '@/lib/tab-state-manager';
import { useAuth } from '@/store/useAuth';
import {
  fetchFeatureRunsPage,
  mapProcessorResultToFeatureRun,
  shortProcessId,
} from '@/services/featureRunsService';

interface FeatureExplorerTabProps {
  tabId?: string;
  feature?: {
    name?: string;
    tag?: string;
    productTag?: string;
    env?: {
      slug?: string;
    };
  };
  product?: {
    tag?: string;
    name?: string;
    logo?: string;
    envs?: unknown[];
  };
}

type StepStatus = 'completed' | 'failed' | 'running' | 'pending' | 'skipped' | 'retrying';
type RunStatus = 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'timeout';

interface FeatureExplorerFormState {
  statusFilter: RunStatus | 'all';
  searchQuery: string;
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all';
  listViewMode: 'list' | 'timeline';
  viewMode: 'overview' | 'runs';
  executeInput?: string;
  isSidebarCollapsed?: boolean;
}

interface FeatureStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'wait' | 'transform' | 'human' | 'webhook' | 'loop';
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  input?: any;
  output?: any;
  error?: string;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }>;
  retryCount?: number;
  maxRetries?: number;
  metadata?: {
    app?: string;
    action?: string;
    integration?: string;
  };
}

interface FeatureRun {
  id: string;
  runNumber: number;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  input: any;
  output: any;
  error?: string;
  steps: FeatureStep[];
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event' | 'api';
  triggeredByUser?: string;
  version: string;
  tags?: string[];
}

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
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-${color})`}
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

// Format helpers
const formatDuration = (ms: number | null) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatTime = (dateStr: string, relative = true) => {
  const date = new Date(dateStr);
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

function getTimeRangeDates(range: '1h' | '24h' | '7d' | '30d' | 'all'): { start_date?: string; end_date?: string } {
  const end = new Date();
  if (range === 'all') return {};
  let start: Date;
  if (range === '1h') start = new Date(end.getTime() - 60 * 60 * 1000);
  else if (range === '24h') start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  else if (range === '7d') start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  else start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

const DEFAULT_FORM_STATE: FeatureExplorerFormState = {
  statusFilter: 'all',
  searchQuery: '',
  timeRange: '24h',
  listViewMode: 'list',
  viewMode: 'overview',
  executeInput: '{\n  "orderId": "ORD-EXAMPLE",\n  "amount": 99.99,\n  "currency": "USD"\n}',
};

export default function FeatureExplorerTab({ tabId, feature = {}, product }: FeatureExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const hasRestoredRef = useRef(false);
  const skipNextSaveRef = useRef(true); // skip first save on mount so we don't overwrite restored state

  const featureName = feature.name || 'Feature';
  const featureTag = feature.tag || '';
  const productTag = feature.productTag || product?.tag || '';
  const envSlug = feature.env?.slug || 'production';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeInput, setExecuteInput] = useState(DEFAULT_FORM_STATE.executeInput!);
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>(DEFAULT_FORM_STATE.statusFilter);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_FORM_STATE.searchQuery);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>(DEFAULT_FORM_STATE.timeRange);
  const [listViewMode, setListViewMode] = useState<'list' | 'timeline'>(DEFAULT_FORM_STATE.listViewMode);
  const [viewMode, setViewMode] = useState<'overview' | 'runs'>(DEFAULT_FORM_STATE.viewMode);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore state from tab state on mount (page refresh / tab switch back)
  useEffect(() => {
    if (!tabId || hasRestoredRef.current) return;
    const saved = getTabState(tabId);
    const form = saved?.formState as FeatureExplorerFormState | undefined;
    if (form) {
      if (form.statusFilter != null) setStatusFilter(form.statusFilter);
      if (form.searchQuery != null) setSearchQuery(form.searchQuery);
      if (form.timeRange != null) setTimeRange(form.timeRange);
      if (form.listViewMode != null) setListViewMode(form.listViewMode);
      if (form.viewMode != null) setViewMode(form.viewMode);
      if (form.executeInput != null) setExecuteInput(form.executeInput);
      if (form.isSidebarCollapsed != null) setIsSidebarCollapsed(form.isSidebarCollapsed);
    }
    hasRestoredRef.current = true;
  }, [tabId]);

  // Persist state when it changes (skip first run on mount so we don't overwrite restored state)
  useEffect(() => {
    if (!tabId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const formState: FeatureExplorerFormState = {
      statusFilter,
      searchQuery,
      timeRange,
      listViewMode,
      viewMode,
      executeInput,
      isSidebarCollapsed,
    };
    saveTabState(
      tabId,
      'feature-explorer',
      `${featureName} (${productTag || 'Feature'})`,
      {},
      formState,
      featureTag || undefined
    );
  }, [tabId, featureName, productTag, featureTag, statusFilter, searchQuery, timeRange, listViewMode, viewMode, executeInput, isSidebarCollapsed]);

  // Save on unmount (e.g. user switches to another tab) so state is never lost
  useEffect(() => {
    if (!tabId) return;
    return () => {
      const formState: FeatureExplorerFormState = {
        statusFilter,
        searchQuery,
        timeRange,
        listViewMode,
        viewMode,
        executeInput,
        isSidebarCollapsed,
      };
      saveTabState(
        tabId,
        'feature-explorer',
        `${featureName} (${productTag || 'Feature'})`,
        {},
        formState,
        featureTag || undefined
      );
    };
  }, [tabId, featureName, productTag, featureTag, statusFilter, searchQuery, timeRange, listViewMode, viewMode, executeInput, isSidebarCollapsed]);

  const {
    data: apiRuns = {
      data: [],
      metadata: { total: 0, page: 1, limit: 200, totalPages: 0, statusCounts: { all: 0, running: 0, completed: 0, failed: 0 } },
    },
    isLoading: isLoadingRuns,
    refetch,
  } = useQuery({
    queryKey: [
      'feature-runs',
      currentWorkspaceId,
      featureTag,
      productTag,
      envSlug,
      timeRange,
    ],
    queryFn: () => {
      // Calculate the rolling window for every request. Keeping concrete dates in
      // component state made manual refreshes reuse an old end_date, excluding runs
      // created after the explorer was first opened.
      const timeRangeParams = getTimeRangeDates(timeRange);
      return fetchFeatureRunsPage({
        workspace_id: currentWorkspaceId ?? '',
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
        feature_tag: featureTag || undefined,
        product_tag: productTag || undefined,
        env: envSlug || undefined,
        ...timeRangeParams,
        limit: 200,
      });
    },
    enabled: Boolean(currentWorkspaceId && user?._id && user?.public_key),
  });

  const runs: FeatureRun[] = useMemo(
    () => apiRuns.data.map((item, i) => mapProcessorResultToFeatureRun(item, i) as FeatureRun),
    [apiRuns]
  );
  const serverStatusCounts = apiRuns.metadata?.statusCounts ?? {
    all: runs.length,
    running: runs.filter((run) => run.status === 'running').length,
    completed: runs.filter((run) => run.status === 'completed').length,
    failed: runs.filter((run) => run.status === 'failed' || run.status === 'timeout').length,
  };


  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const handleOpenRun = (run: FeatureRun) => {
    openTab({
      id: `feature-run-${run.id}`,
      type: 'feature-run',
      title: `Run ${formatTime(run.startedAt, false)}`,
      itemId: run.id,
      data: {
        run,
        featureName: featureName,
        featureTag: featureTag,
        workspaceId: currentWorkspaceId ?? undefined,
      },
    });
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.triggeredBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [runs, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const total = runs.length;
    const completed = runs.filter((r) => r.status === 'completed').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const running = runs.filter((r) => r.status === 'running').length;
    const cancelled = runs.filter((r) => r.status === 'cancelled').length;
    const timeout = runs.filter((r) => r.status === 'timeout').length;

    const completedRuns = runs.filter((r) => r.duration !== null);
    const durations = completedRuns.map((r) => r.duration!).sort((a, b) => a - b);

    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
    const p99 = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

    const finished = total - running;
    const successRate = finished > 0 ? (completed / finished) * 100 : 0;
    const errorRate = finished > 0 ? ((failed + timeout) / finished) * 100 : 0;

    const sparklineData = Array.from({ length: 24 }, (_, i) => {
      const hourStart = Date.now() - (24 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      return runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= hourStart && t < hourEnd;
      }).length;
    });

    const errorSparkline = Array.from({ length: 24 }, (_, i) => {
      const hourStart = Date.now() - (24 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      return runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= hourStart && t < hourEnd && (r.status === 'failed' || r.status === 'timeout');
      }).length;
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const dailyTrend = days.map((day, idx) => ({
      day,
      executions: idx <= dayOfWeek ? runs.filter((r) => new Date(r.startedAt).getDay() === (idx === 6 ? 0 : idx + 1)).length : 0,
      successful: idx <= dayOfWeek ? runs.filter((r) => new Date(r.startedAt).getDay() === (idx === 6 ? 0 : idx + 1) && r.status === 'completed').length : 0,
    }));

    // Last 7 calendar days (not weekdays): e.g. Jan 28, Jan 29, … Feb 3
    const last7CalendarDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const executions = runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      const successful = runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= d.getTime() && t < next.getTime() && (r.status === 'completed');
      }).length;
      return { dateKey, label, executions, successful };
    });

    const weeklyStats = {
      executions: total,
      successful: completed,
      failed,
      avgDuration7d: avgDuration,
      p95_7d: p95,
      throughput: total,
      dailyTrend,
      last7CalendarDays,
    };

    return {
      total,
      completed,
      failed,
      running,
      cancelled,
      timeout,
      avgDuration,
      p50,
      p95,
      p99,
      successRate,
      errorRate,
      sparklineData,
      errorSparkline,
      weeklyStats,
    };
  }, [runs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch({ cancelRefetch: true });
      if (result.error) throw result.error;
      toast.success('Runs refreshed');
    } catch (error) {
      console.error('[FeatureExplorerTab] Failed to refresh runs', error);
      toast.error('Failed to refresh runs');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExecuteFeature = async () => {
    setIsExecuting(true);
    try {
      JSON.parse(executeInput);
      await new Promise((r) => setTimeout(r, 1200));
      toast.success('Feature triggered successfully');
      setShowExecuteModal(false);
    } catch {
      toast.error('Invalid JSON input');
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusConfig = (status: RunStatus | StepStatus) => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', animate: false, dotColor: 'bg-green' },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', animate: false, dotColor: 'bg-red' },
      running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Running', animate: true, dotColor: 'bg-primary' },
      pending: { icon: Clock, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', animate: false, dotColor: 'bg-grey-400' },
      cancelled: { icon: Pause, color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', label: 'Cancelled', animate: false, dotColor: 'bg-orange' },
      timeout: { icon: AlertCircle, color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', label: 'Timeout', animate: false, dotColor: 'bg-yellow' },
      skipped: { icon: AlertTriangle, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Skipped', animate: false, dotColor: 'bg-grey-400' },
      retrying: { icon: RotateCcw, color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', label: 'Retrying', animate: true, dotColor: 'bg-yellow' },
    };
    return configs[status] || configs.pending;
  };

  const getTriggerConfig = (trigger: FeatureRun['triggeredBy']) => {
    const configs = {
      manual: { icon: User, label: 'Manual', color: 'text-primary', bg: 'bg-primary/10' },
      schedule: { icon: Clock, label: 'Schedule', color: 'text-primary', bg: 'bg-primary/10' },
      webhook: { icon: Webhook, label: 'Webhook', color: 'text-green', bg: 'bg-green/10' },
      event: { icon: Zap, label: 'Event', color: 'text-yellow', bg: 'bg-yellow/10' },
      api: { icon: Play, label: 'API', color: 'text-grey-200', bg: 'bg-grey-100' },
    };
    return configs[trigger] || configs.manual;
  };

  // ===== MAIN RUNS LIST VIEW =====
  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-background-tertiary">
      {/* Sidebar - collapsible like DatabaseExplorerTab */}
      <div
        className={cn(
          'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden transition-[width] duration-200',
          isSidebarCollapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-3')}>
            <button
              onClick={() => {
                if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              }}
              className={cn(
                'flex items-center justify-center rounded-lg bg-primary/10 flex-shrink-0',
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
              title={isSidebarCollapsed ? 'Expand sidebar' : featureName}
            >
              <Activity className="h-5 w-5 text-primary" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">{featureName}</h2>
                  <p className="text-xs text-grey-600 truncate">{envSlug}</p>
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

          {/* Search - only when expanded */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search runs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setViewMode('overview');
                }}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  viewMode === 'overview'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                )}
                title="Overview"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
              {([
                { value: 'all', icon: LayoutGrid },
                { value: 'running', icon: Loader2 },
                { value: 'completed', icon: CheckCircle2 },
                { value: 'failed', icon: AlertCircle },
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                    setStatusFilter(value);
                    setViewMode('runs');
                  }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    viewMode === 'runs' && statusFilter === value
                      ? 'bg-primary/10 text-primary'
                      : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                  )}
                  title={value === 'all' ? 'All Runs' : value.charAt(0).toUpperCase() + value.slice(1)}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-grey-600 hover:text-primary hover:bg-grey-100 rounded-lg p-2 transition-colors"
                title="Refresh runs"
              >
                <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
              </button>
            </div>
          ) : (
            <>
              {/* Overview Link */}
              <div className="mb-4">
                <button
                  onClick={() => setViewMode('overview')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    viewMode === 'overview'
                      ? 'bg-primary/10 text-primary'
                      : 'text-grey hover:bg-background-secondary'
                  )}
                >
                  <LayoutDashboard className={cn(
                    'h-4 w-4',
                    viewMode === 'overview' ? 'text-primary' : 'text-grey-600'
                  )} />
                  <span className="flex-1 text-left font-medium">Overview</span>
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex items-center justify-between px-2 py-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
                  Status
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-grey-600 hover:text-primary transition-colors"
                  title="Refresh runs"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                </button>
              </div>

              <div className="space-y-0.5">
                {([
                  { value: 'all', label: 'All Runs', icon: <LayoutGrid className="h-4 w-4" />, count: serverStatusCounts.all },
                  { value: 'running', label: 'Running', icon: <Loader2 className="h-4 w-4" />, count: serverStatusCounts.running },
                  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" />, count: serverStatusCounts.completed },
                  { value: 'failed', label: 'Failed', icon: <AlertCircle className="h-4 w-4" />, count: serverStatusCounts.failed },
                ] as const).map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setStatusFilter(status.value);
                      setViewMode('runs');
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      viewMode === 'runs' && statusFilter === status.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-grey hover:bg-background-secondary'
                    )}
                  >
                    <span className={cn(
                      viewMode === 'runs' && statusFilter === status.value ? 'text-primary' : 'text-grey-600'
                    )}>
                      {status.icon}
                    </span>
                    <span className="flex-1 text-left">{status.label}</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded min-w-[20px] flex items-center justify-center',
                      viewMode === 'runs' && statusFilter === status.value
                        ? 'bg-primary/20 text-primary'
                        : 'bg-background-secondary text-grey-600'
                    )}>
                      {(isLoadingRuns || isRefreshing) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        status.count
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Time Range Filter */}
              <div className="mt-4 px-2">
                <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                  Time Range
                </div>
                <div className="space-y-0.5">
                  {[
                    { value: '1h', label: 'Last Hour' },
                    { value: '24h', label: 'Last 24 Hours' },
                    { value: '7d', label: 'Last 7 Days' },
                    { value: '30d', label: 'Last 30 Days' },
                    { value: 'all', label: 'All Time' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTimeRange(option.value as any)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        timeRange === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-grey hover:bg-background-secondary'
                      )}
                    >
                      <Calendar className={cn(
                        'h-4 w-4',
                        timeRange === option.value ? 'text-primary' : 'text-grey-600'
                      )} />
                      <span className="flex-1 text-left">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer - Expand button when collapsed, Run Feature when expanded */}
        <div className={cn('flex-shrink-0 border-t border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => setShowExecuteModal(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Feature
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{featureName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-200 font-mono">{featureTag}</code>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      envSlug === 'production' ? 'bg-red/10 text-red ring-1 ring-red/30' :
                      envSlug === 'staging' ? 'bg-yellow/10 text-yellow ring-1 ring-yellow/30' :
                      'bg-primary/10 text-primary ring-1 ring-primary/30'
                    )}>
                      {envSlug}
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
                  className="border-border text-grey-200 hover:text-grey hover:bg-grey-100"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowExecuteModal(true)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/25"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Feature
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isLoadingRuns ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3 text-grey-600">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading feature runs…</p>
            </div>
          </div>
        ) : !currentWorkspaceId || !user ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-grey-600">Sign in and select a workspace to view runs.</p>
          </div>
        ) : viewMode === 'overview' ? (
            /* Overview Content */
            <div className="flex-1 overflow-auto p-6">
              {/* 7-Day Activity Stats - Session Dashboard Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Total Executions (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.executions.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Executions (7 days)</div>
                </div>

                {/* Successful Runs */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green mb-1">{metrics.weeklyStats.successful.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Successful (7 days)</div>
                </div>

                {/* Failed Runs */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red mb-1">{metrics.weeklyStats.failed.toLocaleString()}</div>
                  <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
                </div>

                {/* Avg Duration */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Timer className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{formatDuration(metrics.weeklyStats.avgDuration7d)}</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Duration</div>
                </div>

                {/* P95 Latency */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{formatDuration(metrics.weeklyStats.p95_7d)}</div>
                  <div className="text-xs text-grey-600 font-medium">P95 Latency</div>
                </div>

                {/* Throughput */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.throughput}/hr</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Throughput</div>
                </div>
              </div>

              <ActivityTimelinePanel
                title="Activity timeline"
                kind="feature"
                productTag={productTag}
                componentTag={featureTag}
                countLabel="executions"
                enabled={!!productTag && !!featureTag}
                className="mb-6"
              />

              {/* Current Session Metrics Dashboard */}
              <div className="grid grid-cols-6 gap-4 mb-6">
                {/* Total Runs */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Total Runs</span>
                    <LayoutGrid className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#0846A6" />
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Success Rate</span>
                    <CheckCircle className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className={cn(
                    'text-2xl font-bold',
                    metrics.successRate >= 95 ? 'text-green' :
                    metrics.successRate >= 80 ? 'text-yellow' :
                    'text-red'
                  )}>
                    {metrics.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-grey-500 mt-2">{metrics.completed} succeeded</p>
                </div>

                {/* Active */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Active</span>
                    <Loader2 className={cn('h-4 w-4', metrics.running > 0 ? 'text-primary animate-spin' : 'text-grey-400')} />
                  </div>
                  <p className="text-2xl font-bold text-primary">{metrics.running}</p>
                  <p className="text-xs text-grey-500 mt-2">currently running</p>
                </div>

                {/* Errors */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Errors</span>
                    <AlertCircle className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-red">{metrics.failed + metrics.timeout}</p>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.errorSparkline} color="#DC3444" />
                  </div>
                </div>

                {/* Avg Duration */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">Avg Duration</span>
                    <Timer className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{formatDuration(metrics.avgDuration)}</p>
                  <p className="text-xs text-grey-500 mt-2">p50: {formatDuration(metrics.p50)}</p>
                </div>

                {/* P99 Latency */}
                <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-grey-600">P99 Latency</span>
                    <TrendingUp className="h-4 w-4 text-grey-400" />
                  </div>
                  <p className="text-2xl font-bold text-grey">{formatDuration(metrics.p99)}</p>
                  <p className="text-xs text-grey-500 mt-2">p95: {formatDuration(metrics.p95)}</p>
                </div>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* By Trigger */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Runs by Trigger</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Manual', count: runs.filter(r => r.triggeredBy === 'manual').length, color: 'bg-primary' },
                      { label: 'API', count: runs.filter(r => r.triggeredBy === 'api').length, color: 'bg-grey-500' },
                      { label: 'Webhook', count: runs.filter(r => r.triggeredBy === 'webhook').length, color: 'bg-green' },
                      { label: 'Schedule', count: runs.filter(r => r.triggeredBy === 'schedule').length, color: 'bg-blue' },
                      { label: 'Event', count: runs.filter(r => r.triggeredBy === 'event').length, color: 'bg-yellow' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} runs</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${(item.count / metrics.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                  <h3 className="text-sm font-semibold text-grey mb-4">Runs by Status</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Completed', count: metrics.completed, color: 'bg-green' },
                      { label: 'Failed', count: metrics.failed, color: 'bg-red' },
                      { label: 'Running', count: metrics.running, color: 'bg-primary' },
                      { label: 'Cancelled', count: metrics.cancelled, color: 'bg-orange' },
                      { label: 'Timeout', count: metrics.timeout, color: 'bg-yellow' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded-full', item.color)} />
                          <span className="text-sm text-grey">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grey">{item.count} runs</span>
                          <div className="w-24 h-2 bg-grey-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', item.color)}
                              style={{ width: `${(item.count / metrics.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Runs */}
              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent Runs</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setViewMode('runs');
                    }}
                    className="text-primary hover:text-primary/80 text-xs"
                  >
                    View All Runs
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {runs.slice(0, 5).map((run) => {
                    const statusConfig = getStatusConfig(run.status);
                    const completedSteps = run.steps.filter(s => s.status === 'completed').length;
                    return (
                      <div
                        key={run.id}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                        onClick={() => handleOpenRun(run)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                          <div>
                            <p className="text-sm font-medium text-grey">{formatTime(run.startedAt, false)}</p>
                            <p className="text-xs text-grey-500 font-mono truncate max-w-[200px]" title={run.id}>{shortProcessId(run.id)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-grey-500">{completedSteps}/{run.steps.length} steps</span>
                          <span className="text-xs text-grey-500">{formatTime(run.startedAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Runs List View */
            <>
              {/* Toolbar */}
              <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">
                      Showing <span className="font-medium text-grey">{filteredRuns.length}</span> runs
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
                        onClick={() => setListViewMode('timeline')}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          listViewMode === 'timeline' ? 'bg-white text-grey shadow-sm' : 'text-grey-600 hover:text-grey'
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
                <div className="grid grid-cols-[1fr,120px,140px,120px,100px,180px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                  <div>Run</div>
                  <div>Status</div>
                  <div>Trigger</div>
                  <div>Started</div>
                  <div>Duration</div>
                  <div>Progress</div>
                  <div></div>
                </div>
              </div>

              {/* Table body */}
              <div className="divide-y divide-border">
                {filteredRuns.map((run) => {
                  const statusConfig = getStatusConfig(run.status);
                  const StatusIcon = statusConfig.icon;
                  const triggerConfig = getTriggerConfig(run.triggeredBy);
                  const completedSteps = run.steps.filter(s => s.status === 'completed').length;

                  return (
                    <div
                      key={run.id}
                      className={cn(
                        'grid grid-cols-[1fr,120px,140px,120px,100px,180px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                        'hover:bg-background-secondary',
                        run.status === 'running' && 'bg-primary/5',
                        run.status === 'failed' && 'bg-red/5',
                      )}
                      onClick={() => handleOpenRun(run)}
                    >
                      {/* Run info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-grey" title={run.id}>{formatTime(run.startedAt, false)}</span>
                            {run.tags && run.tags.includes('priority') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow/10 text-yellow rounded">
                                PRIORITY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-grey-700 font-mono truncate" title={run.id}>{shortProcessId(run.id)}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                          statusConfig.bg,
                          statusConfig.border,
                          'border'
                        )}>
                          <StatusIcon className={cn('h-3 w-3', statusConfig.color, statusConfig.animate && 'animate-spin')} />
                          <span className={statusConfig.color}>{statusConfig.label}</span>
                        </div>
                      </div>

                      {/* Trigger */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          const TriggerIcon = triggerConfig.icon;
                          return <TriggerIcon className={cn('h-4 w-4', triggerConfig.color)} />;
                        })()}
                        <div className="min-w-0">
                          <p className="text-sm text-grey">{triggerConfig.label}</p>
                          {run.triggeredByUser && run.triggeredByUser !== 'system' && (
                            <p className="text-xs text-grey-700 truncate">{run.triggeredByUser}</p>
                          )}
                        </div>
                      </div>

                      {/* Started */}
                      <div className="text-sm text-grey-600">
                        {formatTime(run.startedAt)}
                      </div>

                      {/* Duration */}
                      <div className="text-sm font-mono text-grey-600">
                        {run.status === 'running' ? (
                          <span className="text-primary">{formatDuration(Date.now() - new Date(run.startedAt).getTime())}</span>
                        ) : (
                          formatDuration(run.duration)
                        )}
                      </div>

                      {/* Steps Progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-[3px] flex-1">
                          {run.steps.map((step, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex-1 h-1.5 rounded-full transition-all',
                                step.status === 'completed' && 'bg-green',
                                step.status === 'failed' && 'bg-red',
                                step.status === 'running' && 'bg-primary animate-pulse',
                                step.status === 'retrying' && 'bg-yellow animate-pulse',
                                step.status === 'pending' && 'bg-grey-400',
                                step.status === 'skipped' && 'bg-grey-900',
                              )}
                              title={step.name}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-grey-700 tabular-nums w-10 text-right">
                          {completedSteps}/{run.steps.length}
                        </span>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-end">
                        <ChevronRight className="h-4 w-4 text-grey-500" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredRuns.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-grey-500" />
                  </div>
                  <p className="text-grey font-medium">No runs found</p>
                  <p className="text-grey-500 text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
                </div>
              </div>
            </>
          )}
        </div>

      {/* Execute Modal */}
      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent className="max-w-lg bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-grey">Run Feature</DialogTitle>
            <DialogDescription className="text-grey-200">
              Trigger a new execution of <span className="font-medium text-grey">{featureName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-grey">Input Payload</Label>
              <Textarea
                value={executeInput}
                onChange={(e) => setExecuteInput(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm h-48 mt-2 bg-grey-100 border-border text-grey placeholder:text-grey-700 focus:border-primary/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExecuteModal(false)}
              className="border-border text-grey-200 hover:text-grey hover:bg-grey-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteFeature}
              disabled={isExecuting}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Feature
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

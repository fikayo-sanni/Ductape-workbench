import { useMemo, useState, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  Search,
  Box,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  LayoutDashboard,
  List,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Calendar,
  Timer,
  RotateCcw,
  Eye,
  Settings,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';

// Dummy data for jobs
interface JobRun {
  id: string;
  jobTag: string;
  jobName: string;
  status: 'completed' | 'failed' | 'running' | 'pending' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggeredBy: 'schedule' | 'manual' | 'api' | 'webhook';
  env: string;
  retries: number;
  error?: string;
}

const generateDummyJobRuns = (): JobRun[] => {
  const statuses: JobRun['status'][] = ['completed', 'completed', 'completed', 'completed', 'failed', 'running', 'pending'];
  const triggers: JobRun['triggeredBy'][] = ['schedule', 'manual', 'api', 'webhook'];
  const envs = ['dev', 'staging', 'prd'];
  const jobNames = [
    'Data Sync Job',
    'Email Digest',
    'Report Generator',
    'Cleanup Task',
    'Notification Sender',
    'Backup Job',
    'Analytics Aggregator',
    'Cache Warmer',
  ];

  const runs: JobRun[] = [];
  const now = new Date();

  for (let i = 0; i < 25; i++) {
    const startTime = new Date(now.getTime() - i * 1000 * 60 * 45 - Math.random() * 1000 * 60 * 20);
    const baseDuration = Math.floor(Math.random() * 180000) + 5000;
    const status = i === 0 ? 'running' : statuses[Math.floor(Math.random() * statuses.length)];
    const duration = status === 'running' || status === 'pending' ? null : baseDuration;
    const endTime = status === 'running' || status === 'pending' ? null : new Date(startTime.getTime() + baseDuration);

    const jobIndex = i % jobNames.length;

    runs.push({
      id: `run_${(10000 - i).toString(36)}${Math.random().toString(36).substring(2, 6)}`,
      jobTag: jobNames[jobIndex].toLowerCase().replace(/\s+/g, '-'),
      jobName: jobNames[jobIndex],
      status,
      startedAt: startTime.toISOString(),
      completedAt: endTime?.toISOString() || null,
      duration,
      triggeredBy: triggers[Math.floor(Math.random() * triggers.length)],
      env: envs[Math.floor(Math.random() * envs.length)],
      retries: status === 'failed' ? Math.floor(Math.random() * 3) + 1 : 0,
      error: status === 'failed' ? 'Connection timeout after 30000ms' : undefined,
    });
  }

  return runs;
};

const DUMMY_JOB_RUNS = generateDummyJobRuns();

interface JobsExplorerTabProps {
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; config?: any }>;
  };
}

type StatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending';
type ViewMode = 'overview' | 'runs';

// Sparkline component
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
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#gradient-${color.replace('#', '')})`}
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

export default function JobsExplorerTab({ product }: JobsExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Calculate job metrics
  const metrics = useMemo(() => {
    const runs = DUMMY_JOB_RUNS;
    const total = runs.length;
    const completed = runs.filter(r => r.status === 'completed').length;
    const failed = runs.filter(r => r.status === 'failed').length;
    const running = runs.filter(r => r.status === 'running').length;
    const pending = runs.filter(r => r.status === 'pending').length;

    const completedRuns = runs.filter(r => r.duration !== null);
    const durations = completedRuns.map(r => r.duration!).sort((a, b) => a - b);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const successRate = total > 0 ? (completed / (total - running - pending)) * 100 : 0;

    // Unique jobs
    const uniqueJobs = [...new Set(runs.map(r => r.jobTag))].length;

    // Sparkline data
    const sparklineData = Array.from({ length: 24 }, (_, i) => {
      const hourRuns = runs.filter(r => {
        const runTime = new Date(r.startedAt).getTime();
        const hourStart = Date.now() - (24 - i) * 3600000;
        const hourEnd = hourStart + 3600000;
        return runTime >= hourStart && runTime < hourEnd;
      });
      return hourRuns.length;
    });

    const errorSparkline = Array.from({ length: 24 }, (_, i) => {
      const hourRuns = runs.filter(r => {
        const runTime = new Date(r.startedAt).getTime();
        const hourStart = Date.now() - (24 - i) * 3600000;
        const hourEnd = hourStart + 3600000;
        return runTime >= hourStart && runTime < hourEnd && r.status === 'failed';
      });
      return hourRuns.length;
    });

    return { total, completed, failed, running, pending, avgDuration, successRate, uniqueJobs, sparklineData, errorSparkline };
  }, []);

  // Generate 7-day activity stats
  const weeklyStats = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;

    // Use seeded random based on product tag for consistent display
    const seed = (product.tag || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    return {
      executions: Math.floor(seededRandom(1) * 500) + 150 + metrics.total,
      successful: Math.floor(seededRandom(2) * 450) + 140 + metrics.completed,
      failed: Math.floor(seededRandom(3) * 30) + 5 + metrics.failed,
      avgDuration7d: metrics.avgDuration + (seededRandom(4) * 10000 - 5000),
      successRate7d: Math.min(99, metrics.successRate + (seededRandom(5) * 5)),
      scheduledJobs: Math.floor(seededRandom(6) * 15) + 5,
      dailyTrend: days.map((day, idx) => ({
        day,
        executions: idx <= dayOfWeek ? Math.floor(seededRandom(7 + idx) * 80) + 20 : 0,
        successful: idx <= dayOfWeek ? Math.floor(seededRandom(14 + idx) * 75) + 18 : 0,
      })),
    };
  }, [product.tag, metrics]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return DUMMY_JOB_RUNS.filter(run => {
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesEnv = envFilter === 'all' || run.env === envFilter;
      const matchesSearch = searchQuery === '' ||
        run.jobName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.jobTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesEnv && matchesSearch;
    });
  }, [statusFilter, envFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Jobs refreshed');
  };

  const getStatusConfig = (status: JobRun['status']) => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', dotColor: 'bg-green', animate: false },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red', animate: false },
      running: { icon: Loader2, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', label: 'Running', dotColor: 'bg-indigo-500', animate: true },
      pending: { icon: Clock, color: 'text-grey-600', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', dotColor: 'bg-grey-400', animate: false },
      cancelled: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Cancelled', dotColor: 'bg-orange-500', animate: false },
    };
    return configs[status] || configs.pending;
  };

  const getTriggerConfig = (trigger: JobRun['triggeredBy']) => {
    const configs = {
      schedule: { icon: Calendar, label: 'Scheduled', color: 'text-indigo-500' },
      manual: { icon: Play, label: 'Manual', color: 'text-green' },
      api: { icon: Zap, label: 'API', color: 'text-blue-500' },
      webhook: { icon: Activity, label: 'Webhook', color: 'text-purple-500' },
    };
    return configs[trigger] || configs.manual;
  };

  const handleViewRun = (run: JobRun) => {
    openTab({
      id: `job-run-${run.id}`,
      type: 'job',
      title: `${run.jobName} - ${run.id.slice(0, 8)}`,
      itemId: run.id,
      data: {
        ...run,
        productTag: product.tag,
        productName: product.name,
      },
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Box className="h-5 w-5 text-indigo-500" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{product.name}</h2>
              <p className="text-xs text-grey-600 truncate">Jobs</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
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
                  ? 'bg-indigo-500/10 text-indigo-500'
                  : 'text-grey hover:bg-background-secondary'
              )}
            >
              <LayoutDashboard className={cn(
                'h-4 w-4',
                viewMode === 'overview' ? 'text-indigo-500' : 'text-grey-600'
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
              className="text-grey-600 hover:text-indigo-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>

          <div className="space-y-0.5">
            {([
              { value: 'all', label: 'All Runs', icon: <List className="h-4 w-4" />, count: DUMMY_JOB_RUNS.length },
              { value: 'running', label: 'Running', icon: <Loader2 className="h-4 w-4" />, count: metrics.running },
              { value: 'completed', label: 'Completed', icon: <CheckCircle className="h-4 w-4" />, count: metrics.completed },
              { value: 'failed', label: 'Failed', icon: <XCircle className="h-4 w-4" />, count: metrics.failed },
              { value: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" />, count: metrics.pending },
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
                    ? 'bg-indigo-500/10 text-indigo-500'
                    : 'text-grey hover:bg-background-secondary'
                )}
              >
                <span className={cn(
                  viewMode === 'runs' && statusFilter === status.value ? 'text-indigo-500' : 'text-grey-600'
                )}>
                  {status.icon}
                </span>
                <span className="flex-1 text-left">{status.label}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  viewMode === 'runs' && statusFilter === status.value
                    ? 'bg-indigo-500/20 text-indigo-500'
                    : 'bg-background-secondary text-grey-600'
                )}>
                  {status.count}
                </span>
              </button>
            ))}
          </div>

          {/* Environment Filter */}
          {product.envs && product.envs.length > 0 && (
            <div className="mt-4 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                Environment
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setEnvFilter('all')}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    envFilter === 'all'
                      ? 'bg-indigo-500/10 text-indigo-500'
                      : 'text-grey hover:bg-background-secondary'
                  )}
                >
                  <Settings className={cn('h-4 w-4', envFilter === 'all' ? 'text-indigo-500' : 'text-grey-600')} />
                  <span className="flex-1 text-left">All Environments</span>
                </button>
                {product.envs.map((env) => (
                  <button
                    key={env.slug}
                    onClick={() => {
                      setEnvFilter(env.slug);
                      setViewMode('runs');
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      envFilter === env.slug
                        ? 'bg-indigo-500/10 text-indigo-500'
                        : 'text-grey hover:bg-background-secondary'
                    )}
                  >
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      env.slug === 'prd' || env.slug === 'production' ? 'bg-red' :
                      env.slug === 'staging' ? 'bg-yellow' : 'bg-green'
                    )} />
                    <span className="flex-1 text-left capitalize">{env.slug}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Box className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">Jobs Explorer</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{product.tag}</code>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-500">
                      {metrics.uniqueJobs} jobs
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
                  className="border-border text-grey-600 hover:text-grey hover:bg-grey-100"
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
            {/* 7-Day Activity Stats - Session Dashboard Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Total Executions */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    16.4%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.executions.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Executions (7 days)</div>
              </div>

              {/* Successful */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    12.1%
                  </div>
                </div>
                <div className="text-2xl font-bold text-green mb-1">{weeklyStats.successful.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Successful (7 days)</div>
              </div>

              {/* Failed */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-red">
                    <TrendingDown className="h-3 w-3" />
                    -7.2%
                  </div>
                </div>
                <div className="text-2xl font-bold text-red mb-1">{weeklyStats.failed.toLocaleString()}</div>
                <div className="text-xs text-grey-600 font-medium">Failed (7 days)</div>
              </div>

              {/* Avg Duration */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Timer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingDown className="h-3 w-3" />
                    -4.8%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{formatDuration(weeklyStats.avgDuration7d)}</div>
                <div className="text-xs text-grey-600 font-medium">Avg Duration</div>
              </div>

              {/* Success Rate */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    2.3%
                  </div>
                </div>
                <div className={cn(
                  "text-2xl font-bold mb-1",
                  weeklyStats.successRate7d >= 95 ? 'text-green' : weeklyStats.successRate7d >= 85 ? 'text-orange-500' : 'text-red'
                )}>
                  {weeklyStats.successRate7d.toFixed(1)}%
                </div>
                <div className="text-xs text-grey-600 font-medium">Success Rate</div>
              </div>

              {/* Scheduled Jobs */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    8.6%
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{weeklyStats.scheduledJobs}</div>
                <div className="text-xs text-grey-600 font-medium">Scheduled Jobs</div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (7 Days)</h2>
              <div className="space-y-3">
                {weeklyStats.dailyTrend.map((day) => {
                  const maxActivity = Math.max(...weeklyStats.dailyTrend.map(d => d.executions));
                  const percentage = maxActivity > 0 ? (day.executions / maxActivity) * 100 : 0;
                  const successRate = day.executions > 0 ? Math.round((day.successful / day.executions) * 100) : 0;

                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <div className="w-12 text-xs font-medium text-grey-600">{day.day}</div>
                      <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-lg transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-semibold text-white">
                            {day.executions} runs ({successRate}% success)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Metrics Dashboard */}
            <div className="grid grid-cols-6 gap-4 mb-6">
              {/* Total Runs */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Total Runs</span>
                  <Activity className="h-4 w-4 text-grey-400" />
                </div>
                <p className="text-2xl font-bold text-grey">{metrics.total}</p>
                <div className="mt-2 h-8">
                  <Sparkline data={metrics.sparklineData} color="#6366F1" />
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

              {/* Running */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Running</span>
                  <Loader2 className={cn('h-4 w-4', metrics.running > 0 ? 'text-indigo-500 animate-spin' : 'text-grey-400')} />
                </div>
                <p className="text-2xl font-bold text-indigo-500">{metrics.running}</p>
                <p className="text-xs text-grey-500 mt-2">currently active</p>
              </div>

              {/* Failed */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Failed</span>
                  <XCircle className="h-4 w-4 text-grey-400" />
                </div>
                <p className="text-2xl font-bold text-red">{metrics.failed}</p>
                <div className="mt-2 h-8">
                  <Sparkline data={metrics.errorSparkline} color="#DC3444" />
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Pending</span>
                  <Clock className="h-4 w-4 text-grey-400" />
                </div>
                <p className="text-2xl font-bold text-grey">{metrics.pending}</p>
                <p className="text-xs text-grey-500 mt-2">in queue</p>
              </div>

              {/* Avg Duration */}
              <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-grey-600">Avg Duration</span>
                  <Timer className="h-4 w-4 text-grey-400" />
                </div>
                <p className="text-2xl font-bold text-grey">{formatDuration(metrics.avgDuration)}</p>
                <p className="text-xs text-grey-500 mt-2">per run</p>
              </div>
            </div>

            {/* Breakdown Charts */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* By Trigger */}
              <div className="bg-white rounded-lg p-5 border border-border shadow-sm">
                <h3 className="text-sm font-semibold text-grey mb-4">Runs by Trigger</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Scheduled', count: DUMMY_JOB_RUNS.filter(r => r.triggeredBy === 'schedule').length, color: 'bg-indigo-500' },
                    { label: 'Manual', count: DUMMY_JOB_RUNS.filter(r => r.triggeredBy === 'manual').length, color: 'bg-green' },
                    { label: 'API', count: DUMMY_JOB_RUNS.filter(r => r.triggeredBy === 'api').length, color: 'bg-blue' },
                    { label: 'Webhook', count: DUMMY_JOB_RUNS.filter(r => r.triggeredBy === 'webhook').length, color: 'bg-purple-500' },
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
                    { label: 'Running', count: metrics.running, color: 'bg-indigo-500' },
                    { label: 'Pending', count: metrics.pending, color: 'bg-grey-400' },
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
                <h3 className="text-sm font-semibold text-grey">Recent Job Runs</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setViewMode('runs');
                  }}
                  className="text-indigo-500 hover:text-indigo-600 text-xs"
                >
                  View All Runs
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {DUMMY_JOB_RUNS.slice(0, 5).map((run) => {
                  const statusConfig = getStatusConfig(run.status);
                  return (
                    <div
                      key={run.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                      onClick={() => handleViewRun(run)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                        <div>
                          <p className="text-sm font-medium text-grey">{run.jobName}</p>
                          <p className="text-xs text-grey-500 font-mono">{run.id.slice(0, 12)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-grey-500">{formatDuration(run.duration)}</span>
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
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg border border-border h-full overflow-auto">
                {/* Table header */}
                <div className="sticky top-0 z-10 bg-background-secondary border-b border-border">
                  <div className="grid grid-cols-[1fr,120px,120px,100px,100px,100px,40px] gap-4 px-6 py-3 text-xs font-medium text-grey-600 uppercase tracking-wider">
                    <div>Job</div>
                    <div>Status</div>
                    <div>Trigger</div>
                    <div>Environment</div>
                    <div>Started</div>
                    <div>Duration</div>
                    <div></div>
                  </div>
                </div>

                {/* Table body */}
                <div className="divide-y divide-border">
                  {filteredRuns.map((run) => {
                    const statusConfig = getStatusConfig(run.status);
                    const StatusIcon = statusConfig.icon;
                    const triggerConfig = getTriggerConfig(run.triggeredBy);

                    return (
                      <div
                        key={run.id}
                        className={cn(
                          'grid grid-cols-[1fr,120px,120px,100px,100px,100px,40px] gap-4 px-6 py-4 items-center cursor-pointer transition-colors',
                          'hover:bg-background-secondary',
                          run.status === 'running' && 'bg-indigo-500/5',
                          run.status === 'failed' && 'bg-red/5',
                        )}
                        onClick={() => handleViewRun(run)}
                      >
                        {/* Job info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                          <div className="min-w-0">
                            <span className="font-semibold text-grey truncate block">{run.jobName}</span>
                            <p className="text-xs text-grey-500 font-mono truncate">{run.id}</p>
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
                          <triggerConfig.icon className={cn('h-4 w-4', triggerConfig.color)} />
                          <span className="text-sm text-grey">{triggerConfig.label}</span>
                        </div>

                        {/* Environment */}
                        <div>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            run.env === 'prd' ? 'bg-red/10 text-red' :
                            run.env === 'staging' ? 'bg-yellow/10 text-yellow' :
                            'bg-green/10 text-green'
                          )}>
                            {run.env}
                          </span>
                        </div>

                        {/* Started */}
                        <div className="text-sm text-grey-600">
                          {formatTime(run.startedAt)}
                        </div>

                        {/* Duration */}
                        <div className="text-sm font-mono text-grey-600">
                          {run.status === 'running' ? (
                            <span className="text-indigo-500">{formatDuration(Date.now() - new Date(run.startedAt).getTime())}</span>
                          ) : (
                            formatDuration(run.duration)
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-end">
                          <ChevronRight className="h-4 w-4 text-grey-400" />
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
    </div>
  );
}

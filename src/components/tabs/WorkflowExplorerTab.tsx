import { useState, useEffect, useMemo } from 'react';
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
  TrendingDown,
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
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface WorkflowExplorerTabProps {
  workflow?: {
    name?: string;
    tag?: string;
    productTag?: string;
    env?: {
      slug?: string;
    };
  };
}

type StepStatus = 'completed' | 'failed' | 'running' | 'pending' | 'skipped' | 'retrying';
type RunStatus = 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'timeout';

interface WorkflowStep {
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

interface WorkflowRun {
  id: string;
  runNumber: number;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  input: any;
  output: any;
  error?: string;
  steps: WorkflowStep[];
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event' | 'api';
  triggeredByUser?: string;
  version: string;
  tags?: string[];
}

// Generate realistic dummy data with patterns
const generateDummyRuns = (): WorkflowRun[] => {
  const triggers: WorkflowRun['triggeredBy'][] = ['manual', 'schedule', 'webhook', 'event', 'api'];
  const users = ['john.doe@company.com', 'jane.smith@company.com', 'system', 'api-service', 'scheduler'];
  const stepTypes: WorkflowStep['type'][] = ['action', 'condition', 'parallel', 'wait', 'transform', 'webhook'];

  const runs: WorkflowRun[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const startTime = new Date(now.getTime() - i * 1000 * 60 * 20 - Math.random() * 1000 * 60 * 10);
    const baseDuration = Math.floor(Math.random() * 180000) + 3000;
    const statuses: RunStatus[] = ['completed', 'completed', 'completed', 'completed', 'completed', 'failed', 'running', 'cancelled', 'timeout'];
    const status = i === 0 ? 'running' : statuses[Math.floor(Math.random() * statuses.length)];
    const duration = status === 'running' ? null : baseDuration;
    const endTime = status === 'running' ? null : new Date(startTime.getTime() + baseDuration);

    const stepNames = [
      { name: 'Validate Input', type: 'condition' as const },
      { name: 'Authenticate', type: 'action' as const },
      { name: 'Fetch External Data', type: 'webhook' as const },
      { name: 'Transform Payload', type: 'transform' as const },
      { name: 'Process in Parallel', type: 'parallel' as const },
      { name: 'Update Records', type: 'action' as const },
      { name: 'Send Notifications', type: 'action' as const },
    ];

    const failedStepIndex = status === 'failed' ? Math.floor(Math.random() * 4) + 2 : -1;
    const runningStepIndex = status === 'running' ? Math.floor(Math.random() * 4) + 1 : -1;

    const steps: WorkflowStep[] = stepNames.map((stepInfo, idx) => {
      let stepStatus: StepStatus = 'completed';
      if (status === 'running') {
        if (idx > runningStepIndex) stepStatus = 'pending';
        else if (idx === runningStepIndex) stepStatus = 'running';
      } else if (status === 'failed') {
        if (idx > failedStepIndex) stepStatus = 'skipped';
        else if (idx === failedStepIndex) stepStatus = 'failed';
      } else if (status === 'cancelled') {
        if (idx >= 4) stepStatus = 'skipped';
      } else if (status === 'timeout') {
        if (idx === stepNames.length - 1) stepStatus = 'failed';
      }

      const stepDuration = Math.floor((baseDuration / stepNames.length) * (0.3 + Math.random() * 1.4));
      const stepStart = new Date(startTime.getTime() + idx * (baseDuration / stepNames.length));

      return {
        id: `step_${i}_${idx}`,
        name: stepInfo.name,
        type: stepInfo.type,
        status: stepStatus,
        startedAt: stepStatus !== 'pending' && stepStatus !== 'skipped' ? stepStart.toISOString() : null,
        completedAt: stepStatus === 'completed' || stepStatus === 'failed' ? new Date(stepStart.getTime() + stepDuration).toISOString() : null,
        duration: stepStatus === 'completed' || stepStatus === 'failed' ? stepDuration : stepStatus === 'running' ? Date.now() - stepStart.getTime() : null,
        input: { requestId: `req_${Math.random().toString(36).substr(2, 8)}`, index: idx },
        output: stepStatus === 'completed' ? { success: true, processedAt: new Date().toISOString() } : null,
        error: stepStatus === 'failed' ? (Math.random() > 0.5 ? 'Connection timeout after 30000ms' : 'Rate limit exceeded (429)') : undefined,
        retryCount: stepStatus === 'failed' ? 3 : (stepStatus as StepStatus) === 'retrying' ? 1 : undefined,
        maxRetries: 3,
        logs: stepStatus !== 'pending' && stepStatus !== 'skipped' ? [
          { timestamp: stepStart.toISOString(), level: 'info' as const, message: `Initiating ${stepInfo.name.toLowerCase()}...` },
          ...(stepStatus === 'completed' ? [
            { timestamp: new Date(stepStart.getTime() + stepDuration * 0.5).toISOString(), level: 'debug' as const, message: 'Processing payload' },
            { timestamp: new Date(stepStart.getTime() + stepDuration).toISOString(), level: 'info' as const, message: `${stepInfo.name} completed successfully` }
          ] : stepStatus === 'failed' ? [
            { timestamp: new Date(stepStart.getTime() + stepDuration * 0.8).toISOString(), level: 'warn' as const, message: 'Retry attempt 2 of 3' },
            { timestamp: new Date(stepStart.getTime() + stepDuration).toISOString(), level: 'error' as const, message: 'Max retries exceeded, step failed' }
          ] : [])
        ] : [],
        metadata: { integration: 'stripe', app: 'payment-service', action: 'process' }
      };
    });

    runs.push({
      id: `run_${(10000 - i).toString(36)}${Math.random().toString(36).substr(2, 4)}`,
      runNumber: 10000 - i,
      status,
      startedAt: startTime.toISOString(),
      completedAt: endTime?.toISOString() || null,
      duration,
      input: { orderId: `ORD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, amount: Math.floor(Math.random() * 50000) / 100, currency: 'USD' },
      output: status === 'completed' ? { transactionId: `TXN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, processed: true } : null,
      error: status === 'failed' ? `Workflow terminated: ${steps.find(s => s.status === 'failed')?.error || 'Unknown error'}` : status === 'timeout' ? 'Workflow exceeded maximum execution time (5m)' : undefined,
      steps,
      triggeredBy: triggers[Math.floor(Math.random() * triggers.length)],
      triggeredByUser: users[Math.floor(Math.random() * users.length)],
      version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
      tags: Math.random() > 0.7 ? ['priority', 'production'] : Math.random() > 0.5 ? ['test'] : undefined,
    });
  }

  return runs;
};

const DUMMY_RUNS = generateDummyRuns();

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

export default function WorkflowExplorerTab({ workflow = {} }: WorkflowExplorerTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();

  const workflowName = workflow.name || 'Order Processing Pipeline';
  const workflowTag = workflow.tag || 'order-processing';
  const envSlug = workflow.env?.slug || 'production';

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeInput, setExecuteInput] = useState('{\n  "orderId": "ORD-EXAMPLE",\n  "amount": 99.99,\n  "currency": "USD"\n}');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [listViewMode, setListViewMode] = useState<'list' | 'timeline'>('list');
  const [viewMode, setViewMode] = useState<'overview' | 'runs'>('overview');

  // Open run in a new tab
  const handleOpenRun = (run: WorkflowRun) => {
    openTab({
      id: `workflow-run-${run.id}`,
      type: 'workflow-run',
      title: `Run #${run.runNumber}`,
      itemId: run.id,
      data: {
        run,
        workflowName,
        workflowTag,
      },
    });
  };

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return DUMMY_RUNS.filter((run) => {
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesSearch = searchQuery === '' ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.runNumber.toString().includes(searchQuery) ||
        run.triggeredBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  // Comprehensive metrics
  const metrics = useMemo(() => {
    const runs = DUMMY_RUNS;
    const total = runs.length;
    const completed = runs.filter(r => r.status === 'completed').length;
    const failed = runs.filter(r => r.status === 'failed').length;
    const running = runs.filter(r => r.status === 'running').length;
    const cancelled = runs.filter(r => r.status === 'cancelled').length;
    const timeout = runs.filter(r => r.status === 'timeout').length;

    const completedRuns = runs.filter(r => r.duration !== null);
    const durations = completedRuns.map(r => r.duration!).sort((a, b) => a - b);

    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
    const p99 = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

    const successRate = total > 0 ? (completed / (total - running)) * 100 : 0;
    const errorRate = total > 0 ? ((failed + timeout) / (total - running)) * 100 : 0;

    // Generate sparkline data (last 24 data points)
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
        return runTime >= hourStart && runTime < hourEnd && (r.status === 'failed' || r.status === 'timeout');
      });
      return hourRuns.length;
    });

    // Generate 7-day activity stats
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;

    // Use seeded random based on workflow tag for consistent display
    const seed = (workflowTag || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const seededRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const weeklyStats = {
      executions: Math.floor(seededRandom(1) * 800) + 200 + total,
      successful: Math.floor(seededRandom(2) * 700) + 180 + completed,
      failed: Math.floor(seededRandom(3) * 50) + 10 + failed,
      avgDuration7d: avgDuration + (seededRandom(4) * 10000 - 5000),
      p95_7d: p95 + (seededRandom(5) * 5000 - 2500),
      throughput: Math.floor(seededRandom(6) * 50) + 10,
      dailyTrend: days.map((day, idx) => ({
        day,
        executions: idx <= dayOfWeek ? Math.floor(seededRandom(7 + idx) * 120) + 30 : 0,
        successful: idx <= dayOfWeek ? Math.floor(seededRandom(14 + idx) * 110) + 28 : 0,
      })),
    };

    return {
      total, completed, failed, running, cancelled, timeout,
      avgDuration, p50, p95, p99,
      successRate, errorRate,
      sparklineData, errorSparkline, weeklyStats
    };
  }, [workflowTag]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    try {
      JSON.parse(executeInput);
      await new Promise(r => setTimeout(r, 1200));
      toast.success('Workflow triggered successfully');
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

  const getTriggerConfig = (trigger: WorkflowRun['triggeredBy']) => {
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
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{workflowName}</h2>
              <p className="text-xs text-grey-600 truncate">{envSlug}</p>
            </div>
          </div>

          {/* Search */}
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
                { value: 'all', label: 'All Runs', icon: <LayoutGrid className="h-4 w-4" />, count: DUMMY_RUNS.length },
                { value: 'running', label: 'Running', icon: <Loader2 className="h-4 w-4" />, count: metrics.running },
                { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" />, count: metrics.completed },
                { value: 'failed', label: 'Failed', icon: <AlertCircle className="h-4 w-4" />, count: metrics.failed },
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
                    'text-xs px-1.5 py-0.5 rounded',
                    viewMode === 'runs' && statusFilter === status.value
                      ? 'bg-primary/20 text-primary'
                      : 'bg-background-secondary text-grey-600'
                  )}>
                    {status.count}
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
          </div>

        {/* Run Workflow Button */}
        <div className="flex-shrink-0 p-4 border-t border-grey-400">
          <Button
            onClick={() => setShowExecuteModal(true)}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Workflow
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{workflowName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-200 font-mono">{workflowTag}</code>
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
                  Run Workflow
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
                {/* Total Executions (7 days) */}
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      18.2%
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      12.5%
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-red">
                      <TrendingDown className="h-3 w-3" />
                      -8.3%
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingDown className="h-3 w-3" />
                      -5.2%
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingDown className="h-3 w-3" />
                      -3.1%
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      9.7%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.weeklyStats.throughput}/hr</div>
                  <div className="text-xs text-grey-600 font-medium">Avg Throughput</div>
                </div>
              </div>

              {/* Activity Timeline - Session Dashboard Style */}
              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (7 Days)</h2>
                <div className="space-y-3">
                  {metrics.weeklyStats.dailyTrend.map((day) => {
                    const maxActivity = Math.max(...metrics.weeklyStats.dailyTrend.map(d => d.executions));
                    const percentage = maxActivity > 0 ? (day.executions / maxActivity) * 100 : 0;
                    const successRate = day.executions > 0 ? Math.round((day.successful / day.executions) * 100) : 0;

                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-12 text-xs font-medium text-grey-600">{day.day}</div>
                        <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
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
                      { label: 'Manual', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'manual').length, color: 'bg-primary' },
                      { label: 'API', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'api').length, color: 'bg-grey-500' },
                      { label: 'Webhook', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'webhook').length, color: 'bg-green' },
                      { label: 'Schedule', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'schedule').length, color: 'bg-blue' },
                      { label: 'Event', count: DUMMY_RUNS.filter(r => r.triggeredBy === 'event').length, color: 'bg-yellow' },
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
                  {DUMMY_RUNS.slice(0, 5).map((run) => {
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
                            <p className="text-sm font-medium text-grey">#{run.runNumber}</p>
                            <p className="text-xs text-grey-500 font-mono">{run.id}</p>
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
                            <span className="font-semibold text-grey">#{run.runNumber}</span>
                            {run.tags && run.tags.includes('priority') && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow/10 text-yellow rounded">
                                PRIORITY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-grey-700 font-mono truncate">{run.id}</p>
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
            <DialogTitle className="text-grey">Run Workflow</DialogTitle>
            <DialogDescription className="text-grey-200">
              Trigger a new execution of <span className="font-medium text-grey">{workflowName}</span>
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
              onClick={handleExecuteWorkflow}
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
                  Run Workflow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

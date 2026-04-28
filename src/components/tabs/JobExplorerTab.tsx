import React, { useMemo, useState, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  Box,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Activity,
  Calendar,
  Timer,
  Zap,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn, getLast7CalendarDays } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
import {
  fetchJobExecutions,
  phaseToStatus,
  normalizeTrigger,
  type JobExecutionApiItem,
} from '@/services/jobExecutionsService';
import JobRunDetailExpanded from './JobRunDetailExpanded';

interface JobRun {
  id: string;
  jobId: string;
  status: 'completed' | 'failed' | 'running' | 'pending' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggeredBy: 'schedule' | 'manual' | 'api' | 'webhook';
  retries: number;
  error?: string;
}

interface ScheduledRun {
  id: string;
  scheduledAt: string;
  cron?: string;
  nextRun: string;
  recurrence: 'once' | 'recurring';
}

interface JobExplorerTabProps {
  tabId?: string;
  job: {
    name?: string;
    tag?: string;
    productTag?: string;
    productName?: string;
    type?: string;
    event?: string;
    schedule?: { cron?: string; start_at?: number };
  };
  product: {
    tag: string;
    name: string;
    logo?: string;
    envs?: Array<{ slug: string; name?: string }>;
  };
  env?: { slug: string; name?: string };
  /** Restored from persisted tab state so section survives refresh */
  initialActiveSection?: 'overview' | 'past' | 'future';
}

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

function mapApiItemToJobRun(item: JobExecutionApiItem): JobRun {
  const id = (item._id != null ? String(item._id) : item.job_id) || 'unknown';
  const startedAt =
    item.started_at ?? item.created_at ?? item.scheduled_at ?? new Date().toISOString();
  return {
    id,
    jobId: item.job_id ?? id,
    status: phaseToStatus(item.phase ?? ''),
    startedAt: typeof startedAt === 'string' ? startedAt : (startedAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    completedAt: item.completed_at
      ? (typeof item.completed_at === 'string' ? item.completed_at : (item.completed_at as Date)?.toISOString?.() ?? null)
      : null,
    duration: item.duration_ms ?? null,
    triggeredBy: normalizeTrigger(item.triggered_by),
    retries: item.retry_count ?? 0,
    error: item.error,
  };
}

function mapApiItemToScheduledRun(item: JobExecutionApiItem): ScheduledRun {
  const id = (item._id != null ? String(item._id) : item.job_id) || 'unknown';
  const scheduledAt = item.scheduled_at
    ? (typeof item.scheduled_at === 'string' ? item.scheduled_at : (item.scheduled_at as Date)?.toISOString?.() ?? new Date().toISOString())
    : new Date().toISOString();
  return {
    id,
    scheduledAt,
    nextRun: scheduledAt,
    recurrence: (item.phase === 'retry_scheduled' || item.phase === 'RETRY_SCHEDULED') ? 'recurring' : 'once',
  };
}

const Sparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} 100,${height}`} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const FUTURE_PHASES = ['scheduled', 'SCHEDULED', 'queued', 'QUEUED', 'retry_scheduled', 'RETRY_SCHEDULED'];

export default function JobExplorerTab({ tabId, job, product, env, initialActiveSection }: JobExplorerTabProps) {
  const { setSidebarCollapsed, tabs, updateTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const [activeSection, setActiveSectionState] = useState<'overview' | 'past' | 'future'>(initialActiveSection ?? 'overview');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const setActiveSection = (section: 'overview' | 'past' | 'future') => {
    setActiveSectionState(section);
    if (tabId) {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.data) {
        updateTab(tabId, { data: { ...(tab.data as object), activeSection: section } });
      }
    }
  };

  const jobTag = job?.tag || 'unknown';
  const productTag = product?.tag || '';
  const envSlug = env?.slug || product?.envs?.[0]?.slug || 'prd';

  const {
    data: jobExecutionsData,
    isLoading: isLoadingRuns,
    isRefetching: isRefreshing,
    refetch,
    error: jobExecutionsError,
  } = useQuery({
    queryKey: ['job-executions-job', currentWorkspaceId, productTag, jobTag, envSlug, user?._id],
    queryFn: () =>
      fetchJobExecutions({
        workspace_id: currentWorkspaceId ?? '',
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
        product_tag: productTag,
        job_tag: jobTag,
        env: envSlug,
        limit: 200,
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!productTag && !!jobTag,
  });

  const runs: JobRun[] = useMemo(() => {
    const items = jobExecutionsData?.items ?? [];
    return items.map(mapApiItemToJobRun).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [jobExecutionsData?.items]);

  const scheduled: ScheduledRun[] = useMemo(() => {
    const items = jobExecutionsData?.items ?? [];
    const now = Date.now();
    return items
      .filter((item) => {
        const phase = (item.phase ?? '').toString();
        if (!FUTURE_PHASES.includes(phase)) return false;
        const at = item.scheduled_at ? new Date(item.scheduled_at).getTime() : 0;
        return at > now;
      })
      .map(mapApiItemToScheduledRun)
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime());
  }, [jobExecutionsData?.items]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const metrics = useMemo(() => {
    const total = runs.length;
    const completed = runs.filter((r) => r.status === 'completed').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const running = runs.filter((r) => r.status === 'running').length;
    const pending = runs.filter((r) => r.status === 'pending').length;
    const completedRuns = runs.filter((r) => r.duration !== null);
    const durations = completedRuns.map((r) => r.duration!).sort((a, b) => a - b);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const successRate = total > 0 ? (completed / Math.max(1, total - running - pending)) * 100 : 0;
    const sparklineData = Array.from({ length: 24 }, (_, i) => {
      const hourStart = Date.now() - (24 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      return runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= hourStart && t < hourEnd;
      }).length;
    });
    return { total, completed, failed, running, pending, avgDuration, successRate, sparklineData };
  }, [runs]);

  const weeklyTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
    const dayMs = 86400000;
    const now = new Date();
    return days.map((day, idx) => {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - (6 - idx));
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + dayMs);
      const count = runs.filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      return { date: day, executions: count };
    });
  }, [runs]);

  const handleRefresh = async () => {
    await refetch();
    toast.success('Job data refreshed');
  };

  const getStatusConfig = (status: JobRun['status']) => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', dotColor: 'bg-green' },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red' },
      running: { icon: Loader2, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', label: 'Running', dotColor: 'bg-indigo-500', animate: true },
      pending: { icon: Clock, color: 'text-grey-600', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', dotColor: 'bg-grey-400' },
      cancelled: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Cancelled', dotColor: 'bg-orange-500' },
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
    setExpandedRunId((id) => (id === run.id ? null : run.id));
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-background-tertiary">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-grey-400 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Box className="h-5 w-5 text-indigo-500" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{job?.name || jobTag}</h2>
              <p className="text-xs text-grey-600 font-mono truncate">{jobTag}</p>
            </div>
          </div>
          <p className="text-xs text-grey-500">{product?.name} · {envSlug}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 min-h-0 space-y-0.5">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Activity },
            { id: 'past' as const, label: 'Past invocations', icon: Clock },
            { id: 'future' as const, label: 'Future invocations', icon: CalendarClock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                activeSection === item.id ? 'bg-indigo-500/10 text-indigo-500' : 'text-grey hover:bg-background-secondary'
              )}
            >
              <item.icon className={cn('h-4 w-4', activeSection === item.id ? 'text-indigo-500' : 'text-grey-600')} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Box className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">Job Explorer</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{jobTag}</code>
                    {envSlug && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-500">
                        {envSlug}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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

        <div className="flex-1 overflow-auto p-6">
          {!currentWorkspaceId || !user?._id || !productTag || !jobTag ? (
            <div className="flex items-center justify-center p-6 text-grey-500 text-sm">
              Select a workspace and open a job to view invocations.
            </div>
          ) : jobExecutionsError ? (
            <div className="flex flex-col items-center justify-center gap-4 p-6">
              <AlertCircle className="h-12 w-12 text-red" />
              <p className="text-grey font-medium">Failed to load job runs</p>
              <p className="text-grey-500 text-sm text-center max-w-md">
                {(jobExecutionsError as Error)?.message ?? 'Something went wrong.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : isLoadingRuns ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <>
          {activeSection === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-indigo-600" />
                    </div>
                    <TrendingUp className="h-4 w-4 text-green" />
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{metrics.total}</div>
                  <div className="text-xs text-grey-600 font-medium">Total runs</div>
                  <div className="mt-2 h-8">
                    <Sparkline data={metrics.sparklineData} color="#6366F1" />
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green" />
                    </div>
                  </div>
                  <div className={cn(
                    'text-2xl font-bold mb-1',
                    metrics.successRate >= 95 ? 'text-green' : metrics.successRate >= 80 ? 'text-yellow' : 'text-red'
                  )}>
                    {metrics.successRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-grey-600 font-medium">Success rate</div>
                </div>
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Timer className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{formatDuration(metrics.avgDuration)}</div>
                  <div className="text-xs text-grey-600 font-medium">Avg duration</div>
                </div>
                <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <CalendarClock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-grey mb-1">{scheduled.length}</div>
                  <div className="text-xs text-grey-600 font-medium">Scheduled</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline (Last 7 Days)</h2>
                <div className="space-y-3">
                  {(() => {
                    const timeline = getLast7CalendarDays(weeklyTrend, (d) => d.executions ?? 0);
                    const maxActivity = Math.max(...timeline.map((d) => d.value), 1);
                    return timeline.map((day) => {
                      const pct = maxActivity > 0 ? (day.value / maxActivity) * 100 : 0;
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <div className="w-12 text-xs font-medium text-grey-600">{day.label}</div>
                          <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="absolute inset-0 flex items-center px-3">
                              <span className="text-xs font-semibold text-white drop-shadow-sm">
                                {day.value.toLocaleString()} runs
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-border shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grey">Recent runs</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSection('past')} className="text-indigo-500 hover:text-indigo-600 text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {runs.slice(0, 6).map((run) => {
                    const statusConfig = getStatusConfig(run.status);
                    const StatusIcon = statusConfig.icon;
                    const isExpanded = expandedRunId === run.id;
                    return (
                      <React.Fragment key={run.id}>
                        <div
                          className={cn(
                            'px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer',
                            isExpanded && 'bg-indigo-500/5'
                          )}
                          onClick={() => handleViewRun(run)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
                            <StatusIcon className={cn('h-4 w-4', statusConfig.color, (statusConfig as any).animate && 'animate-spin')} />
                            <div>
                              <p className="text-sm font-medium text-grey">{statusConfig.label} · {formatTime(run.startedAt)}</p>
                              <p className="text-xs text-grey-500">{getTriggerConfig(run.triggeredBy).label} · {formatDuration(run.duration)}</p>
                              <p className="text-xs text-grey-400 font-mono truncate" title={run.jobId}>{run.jobId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-grey-500">{formatDuration(run.duration)}</span>
                            <span className={cn(
                              'text-xs font-medium',
                              run.status === 'completed' && 'text-green',
                              run.status === 'failed' && 'text-red',
                              run.status === 'running' && 'text-indigo-500'
                            )}>{statusConfig.label}</span>
                            <ChevronDown className={cn('h-4 w-4 text-grey-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-border">
                            <JobRunDetailExpanded
                              executionId={run.id}
                              productTag={product?.tag}
                              productName={product?.name}
                              jobName={job?.name || jobTag}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeSection === 'past' && (
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-grey">Past invocations</h3>
                <p className="text-xs text-grey-500 mt-1">{runs.length} runs</p>
              </div>
              <div className="divide-y divide-border">
                {runs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-grey-500 text-sm">
                    No past invocations for this job yet.
                  </div>
                ) : runs.map((run) => {
                  const statusConfig = getStatusConfig(run.status);
                  const StatusIcon = statusConfig.icon;
                  const triggerConfig = getTriggerConfig(run.triggeredBy);
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <React.Fragment key={run.id}>
                      <div
                        className={cn(
                          'px-5 py-4 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer',
                          run.status === 'running' && 'bg-indigo-500/5',
                          run.status === 'failed' && 'bg-red/5',
                          isExpanded && 'bg-indigo-500/5'
                        )}
                        onClick={() => handleViewRun(run)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.dotColor)} />
                          <StatusIcon className={cn('h-4 w-4 flex-shrink-0', statusConfig.color, (statusConfig as any).animate && 'animate-spin')} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-grey truncate">{statusConfig.label} · {formatTime(run.startedAt)}</p>
                            <p className="text-xs text-grey-500">{triggerConfig.label} · {formatDuration(run.duration)}</p>
                            <p className="text-xs text-grey-400 font-mono truncate" title={run.jobId}>{run.jobId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-sm font-mono text-grey-600">{formatDuration(run.duration)}</span>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium border',
                            statusConfig.bg,
                            statusConfig.border
                          )}>{statusConfig.label}</span>
                          <ChevronDown className={cn('h-4 w-4 text-grey-400 transition-transform', isExpanded && 'rotate-180')} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border">
                          <JobRunDetailExpanded
                            executionId={run.id}
                            productTag={product?.tag}
                            productName={product?.name}
                            jobName={job?.name || jobTag}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'future' && (
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-grey">Future invocations</h3>
                <p className="text-xs text-grey-500 mt-1">{scheduled.length} scheduled</p>
              </div>
              <div className="divide-y divide-border">
                {scheduled.length === 0 ? (
                  <div className="px-5 py-8 text-center text-grey-500 text-sm">
                    No future invocations scheduled for this job.
                  </div>
                ) : scheduled.map((s) => (
                  <div key={s.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarClock className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="text-sm font-medium text-grey">
                          {formatTime(s.nextRun, false)}
                        </p>
                        <p className="text-xs text-grey-500">
                          {s.recurrence === 'recurring' && s.cron ? `Cron: ${s.cron}` : 'One-time'}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      s.recurrence === 'recurring' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-grey-100 text-grey-600'
                    )}>
                      {s.recurrence === 'recurring' ? 'Recurring' : 'Once'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

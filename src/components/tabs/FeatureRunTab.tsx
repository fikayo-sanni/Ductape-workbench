import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Activity,
  Timer,
  Pause,
  RotateCcw,
  Copy,
  ExternalLink,
  Zap,
  GitBranch,
  Layers,
  AlertCircle,
  Eye,
  Download,
  MoreVertical,
  Loader2,
  User,
  Webhook,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { getTabState, saveTabState } from '@/lib/tab-state-manager';
import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  fetchFeatureStepResults,
  shortProcessId,
  type ProcessorResultApiItem,
} from '@/services/featureRunsService';

type StepStatus = 'completed' | 'failed' | 'running' | 'pending' | 'skipped' | 'retrying';
type RunStatus = 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'timeout';

/** Normalize API status to UI status for styling */
function stepDisplayStatus(step: ProcessorResultApiItem): StepStatus {
  const s = (step.status ?? '').toLowerCase();
  if (s === 'success' || s === 'completed') return 'completed';
  if (s === 'fail' || s === 'failed') return 'failed';
  if (s === 'running') return 'running';
  if (s === 'pending') return 'pending';
  return 'completed';
}

/** Format list response field (string | object) for display in <pre> - no transformation, just pretty-print */
function formatListFieldForPre(value: string | object | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
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
  steps?: unknown[];
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event' | 'api';
  triggeredByUser?: string;
  version: string;
  tags?: string[];
}

interface FeatureRunTabProps {
  tabId?: string;
  run: FeatureRun;
  featureName?: string;
  featureTag?: string;
  /** Workspace id when run was opened (fallback when store has none) */
  workspaceId?: string | null;
}

interface FeatureRunFormState {
  expandedStepIds: string[];
  activeStepTab: 'output' | 'logs' | 'metadata';
}

// Format helpers
const formatDuration = (ms: number | null) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function FeatureRunTab({ tabId, run, featureName, featureTag, workspaceId: tabWorkspaceId }: FeatureRunTabProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeStepTab, setActiveStepTab] = useState<'output' | 'logs' | 'metadata'>('output');
  const hasRestoredRef = useRef(false);
  const skipNextSaveRef = useRef(true); // skip first save on mount so we don't overwrite restored state
  const hasAlertedDisabledRef = useRef(false);
  const { user, currentWorkspaceId: authWorkspaceId } = useAuth();
  const workbenchWorkspaceId = useWorkbenchStore((s) => s.currentWorkspaceId);
  // Same source as FeatureExplorerTab (auth); then workbench; then workspace saved when run tab was opened
  const currentWorkspaceId = authWorkspaceId ?? workbenchWorkspaceId ?? tabWorkspaceId ?? undefined;

  // Restore state from tab state on mount (page refresh / tab switch back)
  useEffect(() => {
    if (!tabId || hasRestoredRef.current) return;
    const saved = getTabState(tabId);
    const form = saved?.formState as FeatureRunFormState | undefined;
    if (form) {
      if (Array.isArray(form.expandedStepIds)) setExpandedSteps(new Set(form.expandedStepIds));
      if (form.activeStepTab != null) setActiveStepTab(form.activeStepTab);
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
    const formState: FeatureRunFormState = {
      expandedStepIds: Array.from(expandedSteps),
      activeStepTab,
    };
    saveTabState(
      tabId,
      'feature-run',
      `${featureName ?? 'Run'} – ${run.id.slice(0, 8)}`,
      {},
      formState,
      run.id
    );
  }, [tabId, featureName, run.id, expandedSteps, activeStepTab]);

  // Save on unmount (e.g. user switches to another tab) so state is never lost
  useEffect(() => {
    if (!tabId) return;
    return () => {
      const formState: FeatureRunFormState = {
        expandedStepIds: Array.from(expandedSteps),
        activeStepTab,
      };
      saveTabState(
        tabId,
        'feature-run',
        `${featureName ?? 'Run'} – ${run.id.slice(0, 8)}`,
        {},
        formState,
        run.id
      );
    };
  }, [tabId, featureName, run.id, expandedSteps, activeStepTab]);

  // Run id is the feature execution id (process_id of the run); step results are stored with feature_id = this id
  const featureExecutionId = run.id || (run as { process_id?: string }).process_id || '';

  const canFetchSteps =
    Boolean(featureExecutionId) &&
    Boolean(currentWorkspaceId) &&
    Boolean(user?._id) &&
    Boolean(user?.public_key);

  // Enable as soon as we have run id + workspace + auth (no need to wait for store hydration)
  const queryEnabled = canFetchSteps;

  // Troubleshooting: log why steps fetch may not run
  useEffect(() => {
    console.log('[FeatureRunTab] Steps fetch state', {
      featureExecutionId: featureExecutionId || '(empty)',
      currentWorkspaceId: currentWorkspaceId ?? '(null)',
      userId: user?._id ?? '(null)',
      hasPublicKey: Boolean(user?.public_key),
      canFetchSteps,
      queryEnabled,
    });
    if (!queryEnabled && featureExecutionId) {
      const reason = !currentWorkspaceId
        ? 'No workspace selected'
        : !user?._id
          ? 'User not loaded'
          : !user?.public_key
            ? 'No public key'
            : 'Unknown';
      console.warn('[FeatureRunTab] Steps fetch DISABLED:', reason);
      if (!hasAlertedDisabledRef.current) {
        hasAlertedDisabledRef.current = true;
        //alert(`Steps fetch is disabled: ${reason}. Check console for details.`);
      }
    } else if (queryEnabled) {
      hasAlertedDisabledRef.current = false;
    }
  }, [featureExecutionId, currentWorkspaceId, user?._id, user?.public_key, canFetchSteps, queryEnabled]);

  const {
    data: stepResults = [],
    isLoading: stepsLoading,
    isError: stepsError,
    refetch: refetchSteps,
  } = useQuery({
    queryKey: ['feature-run-steps', featureExecutionId, currentWorkspaceId, user?._id],
    queryFn: async () => {
      const results = await fetchFeatureStepResults({
        feature_id: featureExecutionId,
        workspace_id: currentWorkspaceId ?? '',
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
        component: 'feature_step',
        limit: 200,
      });
      console.log('[FeatureRunTab] fetchFeatureStepResults RESULT', { count: results?.length ?? 0, results });
      return results;
    },
    enabled: queryEnabled,
    refetchOnMount: 'always',
  });

  // Troubleshooting: log step results when they change
  useEffect(() => {
    console.log('[FeatureRunTab] stepResults updated', {
      count: stepResults?.length ?? 0,
      isLoading: stepsLoading,
      isError: stepsError,
      stepResults,
    });
  }, [stepResults, stepsLoading, stepsError]);

  // Use step list from backend only. Sort by start so Gantt shows execution order.
  const steps: ProcessorResultApiItem[] = useMemo(
    () => [...stepResults].sort((a, b) => (a.start ?? 0) - (b.start ?? 0)),
    [stepResults]
  );

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  };

  const getStatusConfig = (status: RunStatus | StepStatus): { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string; animate?: boolean; dotColor: string } => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green', bg: 'bg-green/10', border: 'border-green/30', label: 'Completed', dotColor: 'bg-green' },
      failed: { icon: XCircle, color: 'text-red', bg: 'bg-red/10', border: 'border-red/30', label: 'Failed', dotColor: 'bg-red' },
      running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Running', animate: true, dotColor: 'bg-primary' },
      pending: { icon: Clock, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Pending', dotColor: 'bg-grey-400' },
      cancelled: { icon: Pause, color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', label: 'Cancelled', dotColor: 'bg-orange' },
      timeout: { icon: AlertCircle, color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', label: 'Timeout', dotColor: 'bg-yellow' },
      skipped: { icon: AlertTriangle, color: 'text-grey-200', bg: 'bg-grey-400/10', border: 'border-grey-400/30', label: 'Skipped', dotColor: 'bg-grey-400' },
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

  const getStepTypeIcon = (type: string) => {
    const icons = {
      action: <Zap className="h-3.5 w-3.5" />,
      condition: <GitBranch className="h-3.5 w-3.5" />,
      parallel: <Layers className="h-3.5 w-3.5" />,
      wait: <Clock className="h-3.5 w-3.5" />,
      transform: <Activity className="h-3.5 w-3.5" />,
      human: <Eye className="h-3.5 w-3.5" />,
      webhook: <ExternalLink className="h-3.5 w-3.5" />,
      loop: <RotateCcw className="h-3.5 w-3.5" />,
    };
    return icons[type] || icons.action;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const statusConfig = getStatusConfig(run.status);
  const StatusIcon = statusConfig.icon;
  const triggerConfig = getTriggerConfig(run.triggeredBy);
  const completedSteps = steps.filter(s => stepDisplayStatus(s) === 'completed').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Gantt chart: use start, end, step_duration_ms from list response (API may return numbers or strings)
  const runStart = new Date(run.startedAt).getTime();
  const runEnd = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
  let totalDuration = runEnd - runStart;
  const stepDurations = steps.map((s) => {
    const d = Number(s.step_duration_ms);
    if (d > 0 && !Number.isNaN(d)) return d;
    const start = typeof s.start === 'number' ? s.start : Number(s.start);
    const end = typeof s.end === 'number' ? s.end : Number(s.end);
    if (s.start != null && s.end != null && !Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      return end - start;
    }
    return 0;
  });
  const sumStepDurations = stepDurations.reduce((a, b) => a + b, 0);
  if (totalDuration <= 0 && sumStepDurations > 0) totalDuration = sumStepDurations;
  if (totalDuration <= 0) totalDuration = 1;
  const useSequentialLayout = sumStepDurations > 0;
  const ganttScaleMs = useSequentialLayout ? sumStepDurations : totalDuration;
  const cumulativeStarts = useSequentialLayout
    ? stepDurations.reduce<number[]>((acc, d, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1]! + stepDurations[i - 1]!);
        return acc;
      }, [])
    : [];
  // Fallback: if no durations, give each step equal width so bars still show
  const equalWidthPercent = steps.length > 0 ? 100 / steps.length : 0;
  const showStepsLoading = stepsLoading && steps.length === 0;
  const stepsLoadedEmpty = !stepsLoading && !stepsError && stepResults.length === 0 && steps.length === 0;

  return (
    <div className="h-full flex flex-col bg-background-tertiary">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-border">
        <div className="px-6 py-5">
          {/* Top row: Icon, title, status, actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Feature Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>

              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-grey font-mono" title={run.id}>Run {shortProcessId(run.id)}</h1>
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                    statusConfig.bg,
                    statusConfig.border
                  )}>
                    <StatusIcon className={cn('h-3.5 w-3.5', statusConfig.color, statusConfig.animate && 'animate-spin')} />
                    <span className={cn('text-xs font-semibold', statusConfig.color)}>{statusConfig.label}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(run.id, 'Run ID')}
                    className="text-grey-400 hover:text-grey-600 transition-colors"
                    title="Copy Run ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  {featureName && (
                    <div className="flex items-center gap-1.5 text-sm text-grey-600">
                      <span className="font-medium text-grey">{featureName}</span>
                      {featureTag && <code className="text-xs text-grey-400 font-mono">{featureTag}</code>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-grey-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(run.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Timer className="h-3.5 w-3.5 text-grey-600" />
                    {run.duration ? (
                      <span className="text-grey-600">{formatDuration(run.duration)}</span>
                    ) : (
                      <span className="text-primary font-medium">{formatDuration(Date.now() - new Date(run.startedAt).getTime())}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-grey-600">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>{run.version}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {run.status === 'running' && (
                <Button size="sm" variant="outline" className="border-red/30 text-red hover:bg-red/10">
                  <Pause className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
              )}
              {(run.status === 'failed' || run.status === 'timeout') && (
                <Button size="sm" variant="outline" className="border-border text-grey-600 hover:text-grey hover:bg-grey-100">
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Retry
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-grey-400 hover:text-grey">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-border">
                  <DropdownMenuItem className="text-grey focus:text-grey focus:bg-grey-100">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-grey focus:text-grey focus:bg-grey-100">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Run ID
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {/* Trigger */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <triggerConfig.icon className={cn('h-4 w-4', triggerConfig.color)} />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Trigger</span>
              </div>
              <p className={cn('text-sm font-semibold', triggerConfig.color)}>{triggerConfig.label}</p>
              {run.triggeredByUser && run.triggeredByUser !== 'system' && (
                <p className="text-xs text-grey-400 mt-0.5">{run.triggeredByUser}</p>
              )}
            </div>

            {/* Progress */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Progress</span>
              </div>
              <p className="text-sm font-semibold text-grey flex items-center gap-2">
                {stepsLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-grey-500">Loading steps…</span>
                  </>
                ) : (
                  `${completedSteps} / ${totalSteps} steps`
                )}
              </p>
              <div className="mt-2 h-1.5 bg-grey-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500 ease-out rounded-full',
                    run.status === 'completed' && 'bg-green',
                    run.status === 'failed' && 'bg-red',
                    run.status === 'running' && 'bg-primary',
                    run.status === 'timeout' && 'bg-yellow',
                    run.status === 'cancelled' && 'bg-orange',
                    run.status === 'pending' && 'bg-grey-400',
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-yellow" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-sm font-semibold text-grey">{formatDuration(totalDuration)}</p>
              <p className="text-xs text-grey-400 mt-0.5">Total execution time</p>
            </div>

            {/* Tags */}
            <div className="bg-background-tertiary rounded-lg px-4 py-3 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-green" />
                <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Tags</span>
              </div>
              {run.tags && run.tags.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {run.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-grey-400">No tags</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Error Alert */}
          {run.error && (
            <div className="bg-red/10 border border-red/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-4 w-4 text-red" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-red">Execution Failed</p>
                <p className="text-sm text-red/80 mt-1 font-mono">{run.error}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red hover:text-red hover:bg-red/10">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Retry from failure
              </Button>
            </div>
          )}

          {/* Feature visualization: linear flow of steps */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GitBranch className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-grey">Feature</h3>
                  <p className="text-xs text-grey-500">
                    {stepsLoading ? 'Loading…' : `${steps.length} step${steps.length === 1 ? '' : 's'} in execution order`}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                {/* Start node */}
                <div className="flex items-center gap-0">
                  <div className="px-4 py-2.5 rounded-lg bg-grey-100 border border-grey-300 text-sm font-medium text-grey-600">
                    Start
                  </div>
                  {steps.length > 0 && (
                    <ChevronRight className="h-5 w-5 text-grey-400 mx-1 flex-shrink-0" aria-hidden />
                  )}
                </div>
                {/* Step nodes */}
                {showStepsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-grey-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading steps…
                  </div>
                ) : (
                  steps.map((step, index) => {
                    const stepStatus = stepDisplayStatus(step);
                    const stepConfig = getStatusConfig(stepStatus);
                    const StepStatusIcon = stepConfig.icon;
                    const label = step.step_tag ?? step.process_id ?? `Step ${index + 1}`;
                    return (
                      <div key={step.process_id} className="flex items-center gap-0">
                        <button
                          type="button"
                          onClick={() => {
                            toggleStepExpanded(step.process_id);
                            document.getElementById(`step-row-${step.process_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={cn(
                            'px-4 py-2.5 rounded-lg border text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                            'min-w-[120px] max-w-[180px]',
                            stepStatus === 'completed' && 'bg-green/5 border-green/30 text-grey',
                            stepStatus === 'failed' && 'bg-red/5 border-red/30 text-grey',
                            stepStatus === 'running' && 'bg-primary/5 border-primary/30 text-grey',
                            stepStatus === 'pending' && 'bg-grey-50 border-grey-300 text-grey-600',
                            stepStatus === 'skipped' && 'bg-grey-50 border-grey-300 text-grey-500',
                            stepStatus === 'retrying' && 'bg-yellow/5 border-yellow/30 text-grey',
                          )}
                          title={`${label} (${step.step_type ?? 'action'}) – ${stepConfig.label}. Click to scroll to details.`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-6 h-6 rounded flex items-center justify-center flex-shrink-0',
                              stepConfig.bg,
                              stepConfig.color,
                            )}>
                              {stepStatus === 'completed' ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                              ) : stepStatus === 'failed' ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : stepStatus === 'running' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : stepStatus === 'retrying' ? (
                                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <span className="text-xs font-bold">{index + 1}</span>
                              )}
                            </div>
                            <span className="truncate font-medium text-sm">{label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 ml-8 text-xs text-grey-500">
                            {getStepTypeIcon(step.step_type ?? 'action')}
                            <span className="capitalize">{step.step_type ?? 'action'}</span>
                          </div>
                        </button>
                        {index < steps.length - 1 && (
                          <ChevronRight className="h-5 w-5 text-grey-400 mx-1 flex-shrink-0" aria-hidden />
                        )}
                      </div>
                    );
                  })
                )}
                {/* End node */}
                {!showStepsLoading && steps.length > 0 && (
                  <>
                    <ChevronRight className="h-5 w-5 text-grey-400 mx-1 flex-shrink-0" aria-hidden />
                    <div className="px-4 py-2.5 rounded-lg bg-grey-100 border border-grey-300 text-sm font-medium text-grey-600">
                      End
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Visual Timeline */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-grey">Execution Timeline</h3>
                  <p className="text-xs text-grey-200 flex items-center gap-1.5">
                    {stepsLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        Loading steps…
                      </>
                    ) : (
                      `${completedSteps} of ${totalSteps} steps completed`
                    )}
                  </p>
                </div>
              </div>
              <div className="text-sm text-grey-200 font-mono">
                {stepsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  formatDuration(totalDuration)
                )}
              </div>
            </div>

            {/* Gantt-style timeline header (scale matches bar positions) */}
            <div className="px-5 py-2 bg-grey-100 border-b border-border">
              <div className="flex items-center justify-between text-xs text-grey-700 font-mono">
                <span>0ms</span>
                <span>{formatDuration(ganttScaleMs / 4)}</span>
                <span>{formatDuration(ganttScaleMs / 2)}</span>
                <span>{formatDuration((ganttScaleMs / 4) * 3)}</span>
                <span>{formatDuration(ganttScaleMs)}</span>
              </div>
            </div>

            {/* Steps (from ProcessorResults) */}
            <div className="divide-y divide-border">
              {showStepsLoading ? (
                <div className="px-5 py-8 flex items-center justify-center gap-2 text-grey-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading steps…</span>
                </div>
              ) : stepsError ? (
                <div className="px-5 py-8 flex flex-col items-center justify-center gap-3 text-grey-200">
                  <p className="text-sm">Could not load step results from the database.</p>
                  <Button size="sm" variant="outline" onClick={() => refetchSteps()}>
                    Try again
                  </Button>
                </div>
              ) : stepsLoadedEmpty ? (
                <div className="px-5 py-8 flex items-center justify-center text-grey-200 text-sm">
                  No step results found for this run in the database.
                </div>
              ) : (
              steps.map((step, index) => {
                const stepStatus = stepDisplayStatus(step);
                const isExpanded = expandedSteps.has(step.process_id);
                const stepConfig = getStatusConfig(stepStatus);

                // Gantt bar: use step_duration_ms (or end - start) for position and width
                let barStyle: { left: string; width: string } | Record<string, never> = {};
                const stepDurationMs = stepDurations[index] ?? 0;
                if (useSequentialLayout && ganttScaleMs > 0) {
                  const startOffset = cumulativeStarts[index] ?? 0;
                  const widthPct = stepDurationMs > 0 ? (stepDurationMs / ganttScaleMs) * 100 : 4;
                  const left = (startOffset / ganttScaleMs) * 100;
                  barStyle = { left: `${left}%`, width: `${Math.max(widthPct, 4)}%` };
                } else if (step.start != null && step.end != null && ganttScaleMs > 0) {
                  const stepStart = typeof step.start === 'number' ? step.start : Number(step.start);
                  const stepEnd = typeof step.end === 'number' ? step.end : Number(step.end);
                  if (!Number.isNaN(stepStart) && !Number.isNaN(stepEnd)) {
                    const stepDuration = stepDurationMs || (stepStatus === 'running' ? Date.now() - stepStart : stepEnd - stepStart);
                    const left = Math.max(0, ((stepStart - runStart) / ganttScaleMs) * 100);
                    const widthPct = Math.max((stepDuration / ganttScaleMs) * 100, 4);
                    barStyle = { left: `${left}%`, width: `${widthPct}%` };
                  }
                } else if (steps.length > 0 && equalWidthPercent > 0) {
                  barStyle = { left: `${index * equalWidthPercent}%`, width: `${equalWidthPercent}%` };
                }
                const showBar = Object.keys(barStyle).length > 0;

                return (
                  <div
                    key={step.process_id}
                    id={`step-row-${step.process_id}`}
                    className={cn(
                      'transition-colors',
                      stepStatus === 'running' && 'bg-primary/5',
                      stepStatus === 'failed' && 'bg-red/5',
                    )}
                  >
                    <button
                      onClick={() => toggleStepExpanded(step.process_id)}
                      className="w-full px-5 py-3 flex items-center gap-4 text-left hover:bg-grey-100 transition-colors"
                    >
                      {/* Step info */}
                      <div className="flex items-center gap-3 w-56 flex-shrink-0">
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          stepStatus === 'completed' && 'bg-green/10 text-green',
                          stepStatus === 'failed' && 'bg-red/10 text-red',
                          stepStatus === 'running' && 'bg-primary/10 text-primary',
                          stepStatus === 'pending' && 'bg-grey-100 text-grey-700',
                          stepStatus === 'skipped' && 'bg-grey-100 text-grey-700',
                          stepStatus === 'retrying' && 'bg-yellow/10 text-yellow',
                        )}>
                          {stepStatus === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : stepStatus === 'failed' ? (
                            <XCircle className="h-4 w-4" />
                          ) : stepStatus === 'running' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : stepStatus === 'retrying' ? (
                            <RotateCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'font-medium truncate',
                            stepStatus === 'pending' || stepStatus === 'skipped' ? 'text-grey-700' : 'text-grey'
                          )}>
                            {step.step_tag ?? step.process_id}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-grey-700">
                            {getStepTypeIcon(step.step_type ?? 'action')}
                            <span className="capitalize">{step.step_type ?? 'action'}</span>
                            {step.status != null && (
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-xs font-medium capitalize',
                                stepDisplayStatus(step) === 'completed' && 'bg-green/10 text-green',
                                stepDisplayStatus(step) === 'failed' && 'bg-red/10 text-red',
                                stepDisplayStatus(step) === 'running' && 'bg-primary/10 text-primary',
                                stepDisplayStatus(step) === 'pending' && 'bg-grey-100 text-grey-600'
                              )}>
                                {step.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timeline bar area (absolute times or step_duration_ms progression) */}
                      <div className="flex-1 relative h-6">
                        <div className="absolute inset-0 bg-grey-100 rounded" />
                        {showBar && (
                          <div
                            className={cn(
                              'absolute top-0 bottom-0 rounded transition-all min-w-[4px]',
                              stepStatus === 'completed' && 'bg-gradient-to-r from-green to-green/80',
                              stepStatus === 'failed' && 'bg-gradient-to-r from-red to-red/80',
                              stepStatus === 'running' && 'bg-gradient-to-r from-primary to-primary/80 animate-pulse',
                              stepStatus === 'retrying' && 'bg-gradient-to-r from-yellow to-yellow/80 animate-pulse',
                              (stepStatus === 'pending' || stepStatus === 'skipped') && 'bg-grey-400/80',
                            )}
                            style={barStyle}
                          />
                        )}
                      </div>

                      {/* Duration & expand */}
                      <div className="flex items-center gap-3 w-28 justify-end">
                        <span className={cn(
                          'text-sm font-mono tabular-nums',
                          step.status === 'pending' || step.status === 'skipped' ? 'text-grey-400' : 'text-grey-200'
                        )}>
                          {step.status === 'running' && step.start != null
                            ? formatDuration(Date.now() - step.start)
                            : formatDuration(step.step_duration_ms ?? (step.start != null && step.end != null ? step.end - step.start : null))
                          }
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-grey-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-grey-700" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-4">
                        <div className="ml-10 bg-background-tertiary rounded-xl border border-border overflow-hidden">
                          {/* Error banner */}
                          {step.step_error && (
                            <div className="px-4 py-3 bg-red/10 border-b border-red/20 flex items-start gap-3">
                              <AlertCircle className="h-4 w-4 text-red flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-red font-medium">Step Failed</p>
                                <p className="text-sm text-red/80 mt-0.5 font-mono">{step.step_error}</p>
                              </div>
                            </div>
                          )}

                          {/* Tabs */}
                          <div className="px-4 py-2 border-b border-border flex items-center gap-1">
                            {(['output', 'logs', 'metadata'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={(e) => { e.stopPropagation(); setActiveStepTab(tab); }}
                                className={cn(
                                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                                  activeStepTab === tab
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-grey-200 hover:text-grey'
                                )}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          <div className="p-4">
                            {activeStepTab === 'output' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-grey-200 uppercase tracking-wide">Input</span>
                                    {(step.input !== undefined && step.input !== null) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(formatListFieldForPre(step.input), 'Input'); }}
                                        className="text-grey-700 hover:text-grey-200"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <pre className="bg-grey-100 text-grey rounded-lg p-3 text-xs font-mono overflow-auto max-h-40 border border-border">
                                    {formatListFieldForPre(step.input)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-grey-200 uppercase tracking-wide">Result</span>
                                    {(step.result !== undefined && step.result !== null) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(formatListFieldForPre(step.result), 'Result'); }}
                                        className="text-grey-700 hover:text-grey-200"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <pre className="bg-grey-100 text-grey rounded-lg p-3 text-xs font-mono overflow-auto max-h-40 border border-border">
                                    {formatListFieldForPre(step.result)}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {activeStepTab === 'logs' && (
                              <div className="bg-grey-100 rounded-lg p-3 font-mono text-xs space-y-1.5 max-h-48 overflow-auto border border-border">
                                <p className="text-grey-700 text-center py-4">No logs available</p>
                              </div>
                            )}

                            {activeStepTab === 'metadata' && (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Started</p>
                                  <p className="text-sm text-grey font-mono">
                                    {step.start != null ? new Date(step.start).toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Completed</p>
                                  <p className="text-sm text-grey font-mono">
                                    {step.end != null ? new Date(step.end).toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Duration</p>
                                  <p className="text-sm text-grey font-mono">{formatDuration(step.step_duration_ms ?? (step.start != null && step.end != null ? step.end - step.start : null))}</p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">process_id</p>
                                  <p className="text-sm text-grey font-mono truncate" title={step.process_id}>{step.process_id}</p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">step_tag</p>
                                  <p className="text-sm text-grey font-mono">{step.step_tag ?? '—'}</p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">status</p>
                                  <p className="text-sm text-grey font-mono">{step.status ?? '—'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) )}
            </div>
          </div>

          {/* Input/Output */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h4 className="font-medium text-grey text-sm">Feature Input</h4>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(run.input, null, 2), 'Input')}
                  className="text-grey-700 hover:text-grey-200 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-grey-200 overflow-auto max-h-48 bg-grey-100">
                {JSON.stringify(run.input, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h4 className="font-medium text-grey text-sm">Feature Output</h4>
                {run.output && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(run.output, null, 2), 'Output')}
                    className="text-grey-700 hover:text-grey-200 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
              <pre className="p-4 text-sm font-mono text-grey-200 overflow-auto max-h-48 bg-grey-100">
                {run.output ? JSON.stringify(run.output, null, 2) : '—'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

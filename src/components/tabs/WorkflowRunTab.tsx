import { useState, useMemo } from 'react';
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

interface WorkflowRunTabProps {
  run: WorkflowRun;
  workflowName?: string;
  workflowTag?: string;
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

export default function WorkflowRunTab({ run, workflowName, workflowTag }: WorkflowRunTabProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeStepTab, setActiveStepTab] = useState<'output' | 'logs' | 'metadata'>('output');

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

  const getStepTypeIcon = (type: WorkflowStep['type']) => {
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
  const completedSteps = run.steps.filter(s => s.status === 'completed').length;
  const totalSteps = run.steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  // Calculate timeline
  const runStart = new Date(run.startedAt).getTime();
  const runEnd = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
  const totalDuration = runEnd - runStart;

  return (
    <div className="h-full flex flex-col bg-background-tertiary">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-border">
        <div className="px-6 py-5">
          {/* Top row: Icon, title, status, actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Workflow Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>

              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-grey">Run #{run.runNumber}</h1>
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
                  {workflowName && (
                    <div className="flex items-center gap-1.5 text-sm text-grey-600">
                      <span className="font-medium text-grey">{workflowName}</span>
                      {workflowTag && <code className="text-xs text-grey-400 font-mono">{workflowTag}</code>}
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
              <p className="text-sm font-semibold text-grey">{completedSteps} / {totalSteps} steps</p>
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

          {/* Visual Timeline */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-grey">Execution Timeline</h3>
                  <p className="text-xs text-grey-200">{completedSteps} of {totalSteps} steps completed</p>
                </div>
              </div>
              <div className="text-sm text-grey-200 font-mono">
                {formatDuration(totalDuration)}
              </div>
            </div>

            {/* Gantt-style timeline header */}
            <div className="px-5 py-2 bg-grey-100 border-b border-border">
              <div className="flex items-center justify-between text-xs text-grey-700 font-mono">
                <span>0s</span>
                <span>{formatDuration(totalDuration / 4)}</span>
                <span>{formatDuration(totalDuration / 2)}</span>
                <span>{formatDuration((totalDuration / 4) * 3)}</span>
                <span>{formatDuration(totalDuration)}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-border">
              {run.steps.map((step, index) => {
                const isExpanded = expandedSteps.has(step.id);
                const stepConfig = getStatusConfig(step.status);

                // Calculate position in timeline
                let barStyle = {};
                if (step.startedAt) {
                  const stepStart = new Date(step.startedAt).getTime();
                  const stepDuration = step.duration || (step.status === 'running' ? Date.now() - stepStart : 0);
                  const left = ((stepStart - runStart) / totalDuration) * 100;
                  const width = Math.max((stepDuration / totalDuration) * 100, 2);
                  barStyle = { left: `${left}%`, width: `${width}%` };
                }

                return (
                  <div key={step.id} className={cn(
                    'transition-colors',
                    step.status === 'running' && 'bg-primary/5',
                    step.status === 'failed' && 'bg-red/5',
                  )}>
                    <button
                      onClick={() => toggleStepExpanded(step.id)}
                      className="w-full px-5 py-3 flex items-center gap-4 text-left hover:bg-grey-100 transition-colors"
                    >
                      {/* Step info */}
                      <div className="flex items-center gap-3 w-56 flex-shrink-0">
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          step.status === 'completed' && 'bg-green/10 text-green',
                          step.status === 'failed' && 'bg-red/10 text-red',
                          step.status === 'running' && 'bg-primary/10 text-primary',
                          step.status === 'pending' && 'bg-grey-100 text-grey-700',
                          step.status === 'skipped' && 'bg-grey-100 text-grey-700',
                          step.status === 'retrying' && 'bg-yellow/10 text-yellow',
                        )}>
                          {step.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : step.status === 'failed' ? (
                            <XCircle className="h-4 w-4" />
                          ) : step.status === 'running' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : step.status === 'retrying' ? (
                            <RotateCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'font-medium truncate',
                            step.status === 'pending' || step.status === 'skipped' ? 'text-grey-700' : 'text-grey'
                          )}>
                            {step.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-grey-700">
                            {getStepTypeIcon(step.type)}
                            <span className="capitalize">{step.type}</span>
                          </div>
                        </div>
                      </div>

                      {/* Timeline bar area */}
                      <div className="flex-1 relative h-6">
                        <div className="absolute inset-0 bg-grey-100 rounded" />
                        {step.startedAt && (
                          <div
                            className={cn(
                              'absolute top-0 bottom-0 rounded transition-all',
                              step.status === 'completed' && 'bg-gradient-to-r from-green to-green/80',
                              step.status === 'failed' && 'bg-gradient-to-r from-red to-red/80',
                              step.status === 'running' && 'bg-gradient-to-r from-primary to-primary/80 animate-pulse',
                              step.status === 'retrying' && 'bg-gradient-to-r from-yellow to-yellow/80 animate-pulse',
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
                          {step.status === 'running'
                            ? formatDuration(Date.now() - new Date(step.startedAt!).getTime())
                            : formatDuration(step.duration)
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
                          {step.error && (
                            <div className="px-4 py-3 bg-red/10 border-b border-red/20 flex items-start gap-3">
                              <AlertCircle className="h-4 w-4 text-red flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-red font-medium">Step Failed</p>
                                <p className="text-sm text-red/80 mt-0.5 font-mono">{step.error}</p>
                                {step.retryCount !== undefined && (
                                  <p className="text-xs text-red/60 mt-1">
                                    {step.retryCount} of {step.maxRetries} retry attempts exhausted
                                  </p>
                                )}
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
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(step.input, null, 2), 'Input'); }}
                                      className="text-grey-700 hover:text-grey-200"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <pre className="bg-grey-100 text-grey rounded-lg p-3 text-xs font-mono overflow-auto max-h-40 border border-border">
                                    {JSON.stringify(step.input, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-grey-200 uppercase tracking-wide">Output</span>
                                    {step.output && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(step.output, null, 2), 'Output'); }}
                                        className="text-grey-700 hover:text-grey-200"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <pre className="bg-grey-100 text-grey rounded-lg p-3 text-xs font-mono overflow-auto max-h-40 border border-border">
                                    {step.output ? JSON.stringify(step.output, null, 2) : '—'}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {activeStepTab === 'logs' && (
                              <div className="bg-grey-100 rounded-lg p-3 font-mono text-xs space-y-1.5 max-h-48 overflow-auto border border-border">
                                {step.logs.length > 0 ? step.logs.map((log, i) => (
                                  <div key={i} className="flex gap-3 hover:bg-grey-400/20 -mx-2 px-2 py-0.5 rounded">
                                    <span className="text-grey-700 flex-shrink-0 w-20">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={cn(
                                      'flex-shrink-0 uppercase w-12 font-semibold',
                                      log.level === 'info' && 'text-primary',
                                      log.level === 'warn' && 'text-yellow',
                                      log.level === 'error' && 'text-red',
                                      log.level === 'debug' && 'text-grey-700',
                                    )}>
                                      {log.level}
                                    </span>
                                    <span className="text-grey break-all">{log.message}</span>
                                  </div>
                                )) : (
                                  <p className="text-grey-700 text-center py-4">No logs available</p>
                                )}
                              </div>
                            )}

                            {activeStepTab === 'metadata' && (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Started</p>
                                  <p className="text-sm text-grey font-mono">
                                    {step.startedAt ? new Date(step.startedAt).toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Completed</p>
                                  <p className="text-sm text-grey font-mono">
                                    {step.completedAt ? new Date(step.completedAt).toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                  <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Duration</p>
                                  <p className="text-sm text-grey font-mono">{formatDuration(step.duration)}</p>
                                </div>
                                {step.metadata && (
                                  <>
                                    <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                      <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Integration</p>
                                      <p className="text-sm text-grey">{step.metadata.integration || '—'}</p>
                                    </div>
                                    <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                      <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">App</p>
                                      <p className="text-sm text-grey">{step.metadata.app || '—'}</p>
                                    </div>
                                    <div className="bg-grey-100 rounded-lg p-3 border border-border">
                                      <p className="text-xs text-grey-200 uppercase tracking-wide mb-1">Action</p>
                                      <p className="text-sm text-grey">{step.metadata.action || '—'}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input/Output */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h4 className="font-medium text-grey text-sm">Workflow Input</h4>
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
                <h4 className="font-medium text-grey text-sm">Workflow Output</h4>
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

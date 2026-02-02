import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  AlertCircle,
  Box,
  XCircle,
  Clock,
  Zap,
  FileInput,
  FileOutput,
  Tag,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { fetchJobExecutionById, phaseToStatus } from '@/services/jobExecutionsService';

interface JobRunDetailContentProps {
  executionId: string;
  productTag?: string;
  productName?: string;
  jobName?: string;
}

const formatDuration = (ms: number | null | undefined) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const formatTime = (dateStr: string | undefined) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

function JsonBlock({ data, label, icon: Icon }: { data: Record<string, unknown> | undefined; label: string; icon: React.ElementType }) {
  if (data == null || Object.keys(data).length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-2">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="text-sm text-grey-500">No data</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background-secondary p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <pre className="text-xs font-mono text-grey overflow-x-auto p-3 bg-white rounded border border-border max-h-64 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function JobRunDetailContent({ executionId, productTag, productName, jobName }: JobRunDetailContentProps) {
  const { user, currentWorkspaceId } = useAuth();

  const { data: execution, isLoading, error, refetch } = useQuery({
    queryKey: ['job-execution', executionId, currentWorkspaceId, user?._id],
    queryFn: () =>
      fetchJobExecutionById({
        executionId,
        workspace_id: currentWorkspaceId ?? '',
        user_id: user?._id ?? '',
        public_key: user?.public_key ?? '',
      }),
    enabled: !!executionId && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  if (!currentWorkspaceId || !user?._id) {
    return (
      <div className="flex items-center justify-center p-12 text-grey-500 text-sm">
        Select a workspace to view run details.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-red" />
        <p className="text-grey font-medium">Failed to load run details</p>
        <p className="text-grey-500 text-sm text-center max-w-md">
          {(error as Error)?.message ?? 'Run not found.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const status = phaseToStatus(execution.phase ?? '');
  const outputData = execution.output ?? execution.result_metadata ?? undefined;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-background-tertiary">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-white px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Box className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-grey">
              {jobName ?? execution.job_tag?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Job run'}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <code className="text-sm text-grey-600 font-mono">{execution.job_tag}</code>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-500">
                {execution.env}
              </span>
              {execution.operation && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-grey-100 text-grey-600">
                  {execution.operation}
                </span>
              )}
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  status === 'completed' && 'bg-green/10 text-green',
                  status === 'failed' && 'bg-red/10 text-red',
                  status === 'running' && 'bg-indigo-500/10 text-indigo-500',
                  (status === 'pending' || status === 'cancelled') && 'bg-grey-100 text-grey-600'
                )}
              >
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Job type & operation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-1">
              <Layers className="h-4 w-4" />
              Job type
            </div>
            <p className="text-grey font-mono">{execution.job_type ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-1">
              <Zap className="h-4 w-4" />
              Operation
            </div>
            <p className="text-grey font-mono">{execution.operation ?? '—'}</p>
          </div>
        </div>

        {/* Timings */}
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-3">
            <Clock className="h-4 w-4" />
            Timings
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-grey-500 text-xs">Scheduled</p>
              <p className="font-mono text-grey">{formatTime(execution.scheduled_at as string)}</p>
            </div>
            <div>
              <p className="text-grey-500 text-xs">Started</p>
              <p className="font-mono text-grey">{formatTime(execution.started_at as string)}</p>
            </div>
            <div>
              <p className="text-grey-500 text-xs">Completed</p>
              <p className="font-mono text-grey">{formatTime(execution.completed_at as string)}</p>
            </div>
            <div>
              <p className="text-grey-500 text-xs">Duration</p>
              <p className="font-mono text-grey">{formatDuration(execution.duration_ms)}</p>
            </div>
          </div>
        </div>

        {/* Error (if failed) */}
        {execution.error && (
          <div className="rounded-lg border border-red/30 bg-red/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red mb-1">
              <XCircle className="h-4 w-4" />
              Error
            </div>
            <p className="text-sm text-grey font-mono">{execution.error}</p>
            {execution.error_code && (
              <p className="text-xs text-grey-500 mt-1">Code: {execution.error_code}</p>
            )}
          </div>
        )}

        {/* Input */}
        <JsonBlock data={execution.input} label="Input" icon={FileInput} />

        {/* Output */}
        <JsonBlock data={outputData as Record<string, unknown>} label="Output" icon={FileOutput} />

        {/* IDs (collapsed) */}
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-grey-600 mb-2">
            <Tag className="h-4 w-4" />
            Identifiers
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-grey-500">
            <div>
              <span className="text-grey-400">_id</span> {String(execution._id ?? '—')}
            </div>
            <div>
              <span className="text-grey-400">job_id</span> {execution.job_id ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

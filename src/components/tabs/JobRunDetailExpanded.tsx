import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  AlertCircle,
  Clock,
  FileInput,
  FileOutput,
  Tag,
  Layers,
  Zap,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { fetchJobExecutionById, phaseToStatus } from '@/services/jobExecutionsService';

interface JobRunDetailExpandedProps {
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

function JsonBlock({
  data,
  label,
  icon: Icon,
  compact,
}: {
  data: Record<string, unknown> | undefined;
  label: string;
  icon: React.ElementType;
  compact?: boolean;
}) {
  if (data == null || Object.keys(data).length === 0) {
    return (
      <div className="rounded border border-border bg-background-secondary p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="text-xs text-grey-500">No data</p>
      </div>
    );
  }
  return (
    <div className={cn('rounded border border-border bg-background-secondary', compact ? 'p-2' : 'p-3')}>
      <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <pre className="text-xs font-mono text-grey overflow-x-auto p-2 bg-white rounded border border-border max-h-40 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function JobRunDetailExpanded({
  executionId,
  productTag,
  productName,
  jobName,
}: JobRunDetailExpandedProps) {
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
      <div className="p-4 text-grey-500 text-sm">
        Select a workspace to view run details.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="h-10 w-10 text-red" />
        <p className="text-grey font-medium text-sm">Failed to load run details</p>
        <p className="text-grey-500 text-xs text-center max-w-md">
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
    <div className="p-4 bg-background-secondary/50 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="rounded border border-border bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
            <Layers className="h-3.5 w-3.5" />
            Job type
          </div>
          <p className="text-grey text-sm font-mono">{execution.job_type ?? '—'}</p>
        </div>
        <div className="rounded border border-border bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
            <Zap className="h-3.5 w-3.5" />
            Operation
          </div>
          <p className="text-grey text-sm font-mono">{execution.operation ?? '—'}</p>
        </div>
        <div className="rounded border border-border bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
            <Clock className="h-3.5 w-3.5" />
            Timings
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-grey-500">Started</p>
              <p className="font-mono text-grey">{formatTime(execution.started_at as string)}</p>
            </div>
            <div>
              <p className="text-grey-500">Duration</p>
              <p className="font-mono text-grey">{formatDuration(execution.duration_ms)}</p>
            </div>
          </div>
        </div>
        <div className="rounded border border-border bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-1">
            Status
          </div>
          <span
            className={cn(
              'inline-block px-2 py-0.5 rounded text-xs font-medium',
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

      {execution.error && (
        <div className="rounded border border-red/30 bg-red/5 p-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-red mb-1">
            <XCircle className="h-3.5 w-3.5" />
            Error
          </div>
          <p className="text-xs text-grey font-mono">{execution.error}</p>
          {execution.error_code && (
            <p className="text-xs text-grey-500 mt-1">Code: {execution.error_code}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <JsonBlock data={execution.input} label="Input" icon={FileInput} compact />
        <JsonBlock data={outputData as Record<string, unknown>} label="Output" icon={FileOutput} compact />
      </div>

      <div className="rounded border border-border bg-white p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-grey-600 mb-2">
          <Tag className="h-3.5 w-3.5" />
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
  );
}

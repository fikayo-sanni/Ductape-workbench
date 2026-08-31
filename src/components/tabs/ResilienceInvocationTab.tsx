import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, ChevronDown, ChevronRight, Clock, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/JsonViewer';
import { fetchLogs } from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';
import { cn } from '@/lib/utils';

interface Props {
  invocation: Record<string, any>;
  kind: 'healthcheck' | 'quota' | 'fallback';
  resourceName: string;
  resourceTag: string;
  productTag: string;
  env: string;
}

const processId = (item: Record<string, any>) => String(item.process_id || item.execution_id || item._id || item.id || '');
const failed = (item: Record<string, any>) => {
  const value = String(item.status || item.outcome || '').toLowerCase();
  return item.failed_execution === true || value.includes('fail') || value.includes('error');
};
const startTime = (item: Record<string, any>) => Number(item.start) || new Date(item.timestamp || item.created_at || 0).getTime();
const endTime = (item: Record<string, any>) => Number(item.end) || startTime(item) + Number(item.latency || item.duration_ms || item.duration || 0);
const duration = (item: Record<string, any>) => Math.max(0, endTime(item) - startTime(item));
const formatDuration = (ms: number) => ms < 1_000 ? `${Math.round(ms)}ms` : `${(ms / 1_000).toFixed(2)}s`;

export default function ResilienceInvocationTab({ invocation, kind, resourceName, resourceTag, productTag, env }: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const id = processId(invocation);
  const query = useQuery({
    queryKey: ['resilience-invocation-trace', currentWorkspaceId, id],
    queryFn: async () => {
      const response = await fetchLogs(
        { workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key },
        { process_id: id, product_tag: productTag, env, page: 1, limit: 300 },
      );
      return response.data?.logs?.data || [];
    },
    enabled: Boolean(id && currentWorkspaceId && user?._id && user?.public_key),
  });
  const events = useMemo(() => [...(query.data || [])].sort((a, b) => startTime(a) - startTime(b)), [query.data]);
  const runStart = events.length ? Math.min(...events.map(startTime)) : startTime(invocation);
  const runEnd = events.length ? Math.max(...events.map(endTime)) : endTime(invocation);
  const runDuration = Math.max(1, runEnd - runStart);
  const isFailed = failed(invocation) || events.some(failed);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-grey-100 dark:bg-background">
      <header className="flex items-center justify-between border-b border-grey-300 bg-white px-6 py-5 dark:border-grey-400 dark:bg-background">
        <div className="flex min-w-0 items-center gap-4">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', isFailed ? 'bg-red/10 text-red' : 'bg-green/10 text-green')}>
            {isFailed ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0"><h1 className="truncate text-xl font-semibold text-grey">{resourceName} invocation</h1><div className="mt-1 flex items-center gap-2"><code className="text-xs text-grey-500">{resourceTag}</code><span className="text-grey-400">/</span><code className="truncate text-xs text-grey-500">{id}</code><Badge variant="outline">{env}</Badge></div></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={cn('mr-2 h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</Button>
      </header>

      <div className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[['Status', isFailed ? 'Failed' : 'Completed'], ['Duration', formatDuration(runDuration)], ['Events', String(events.length)], ['Component', kind]].map(([label, value]) => <div key={label} className="rounded-lg border border-grey-300 bg-white p-4 dark:border-grey-400 dark:bg-background"><p className="text-xs font-medium text-grey-500">{label}</p><p className={cn('mt-2 text-lg font-semibold capitalize', label === 'Status' && (isFailed ? 'text-red' : 'text-green'))}>{value}</p></div>)}
        </div>

        <section className="rounded-lg border border-grey-300 bg-white dark:border-grey-400 dark:bg-background">
          <div className="border-b border-grey-300 px-5 py-4 dark:border-grey-400"><h2 className="text-sm font-semibold text-grey">Execution timeline</h2><p className="mt-1 text-xs text-grey-500">Ordered activity for this invocation</p></div>
          {query.isLoading ? <div className="p-8 text-center text-sm text-grey-500">Loading invocation trace...</div> : events.length === 0 ? <div className="p-8 text-center text-sm text-grey-500">No trace events were recorded.</div> : <div className="space-y-3 p-5">{events.map((event, index) => {
            const left = Math.max(0, ((startTime(event) - runStart) / runDuration) * 100);
            const width = Math.max(1.5, (duration(event) / runDuration) * 100);
            return <div key={event._id || `${event.process_id}-${index}`} className="grid grid-cols-[180px_1fr_80px] items-center gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-grey">{event.message || event.child_tag || event.name || event.type}</p><p className="truncate text-xs text-grey-500">{event.child_tag || event.type}</p></div><div className="relative h-7 overflow-hidden rounded bg-grey-100 dark:bg-grey-400/20"><div className={cn('absolute top-0 h-full rounded', failed(event) ? 'bg-red' : 'bg-green')} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} /></div><span className="text-right font-mono text-xs text-grey-500">{formatDuration(duration(event))}</span></div>;
          })}</div>}
        </section>

        <section className="overflow-hidden rounded-lg border border-grey-300 bg-white dark:border-grey-400 dark:bg-background">
          <div className="border-b border-grey-300 px-5 py-4 dark:border-grey-400"><h2 className="text-sm font-semibold text-grey">Invocation events</h2></div>
          <div className="divide-y divide-grey-200 dark:divide-grey-400">{events.map((event, index) => { const key = String(event._id || index); const open = expanded.has(key); return <div key={key}><button className="grid w-full grid-cols-[28px_1fr_110px_90px] items-center gap-3 px-5 py-3 text-left hover:bg-grey-50 dark:hover:bg-grey-400/20" onClick={() => setExpanded((current) => { const next = new Set(current); open ? next.delete(key) : next.add(key); return next; })}>{open ? <ChevronDown className="h-4 w-4 text-grey-500" /> : <ChevronRight className="h-4 w-4 text-grey-500" />}<div className="min-w-0"><p className="truncate text-sm font-medium text-grey">{event.message || event.name || event.child_tag || 'Event'}</p><p className="truncate text-xs text-grey-500">{event.parent_tag}{event.child_tag ? `:${event.child_tag}` : ''}</p></div><span className={cn('text-xs font-medium', failed(event) ? 'text-red' : 'text-green')}>{failed(event) ? 'Failed' : 'Completed'}</span><span className="flex items-center justify-end gap-1 font-mono text-xs text-grey-500"><Clock className="h-3 w-3" />{formatDuration(duration(event))}</span></button>{open && <div className="border-t border-grey-200 bg-grey-50 p-5 dark:border-grey-400 dark:bg-background"><JsonViewer data={event.data ?? event} /></div>}</div>; })}</div>
        </section>

        {events.length === 0 && !query.isLoading && <section className="rounded-lg border border-grey-300 bg-white p-5 dark:border-grey-400 dark:bg-background"><div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-grey-500" /><h2 className="text-sm font-semibold text-grey">Invocation data</h2></div><JsonViewer data={invocation.data ?? invocation} /></section>}
      </div></div>
    </div>
  );
}

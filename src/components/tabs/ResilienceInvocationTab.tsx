import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronRight, Copy, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchLogs } from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';
import { cn } from '@/lib/utils';
import { redactSensitive } from '@/utils/redactSensitive';

interface Props { invocation: Record<string, any>; kind: 'healthcheck' | 'quota' | 'fallback'; resourceName: string; resourceTag: string; productTag: string; env: string; }
interface InvocationCall { id: string; provider: string; operation: string; status: 'completed' | 'failed' | 'running'; start: number; end: number; duration: number; input: unknown; output: unknown; data: unknown; }

const processId = (item: Record<string, any>) => String(item.process_id || item.execution_id || item._id || item.id || '');
const isFailed = (item: Record<string, any>) => { const value = String(item.status || item.outcome || item.error_code || '').toLowerCase(); return item.failed_execution === true || Boolean(item.error || item.reason) || value.includes('fail') || value.includes('error'); };
const timestamp = (value: unknown) => { if (typeof value === 'number' && Number.isFinite(value)) return value; const numeric = Number(value); if (Number.isFinite(numeric) && numeric > 0) return numeric; const parsed = new Date(String(value || '')).getTime(); return Number.isFinite(parsed) ? parsed : 0; };
const itemStart = (item: Record<string, any>) => timestamp(item.start || item.started_at || item.startedAt || item.timestamp || item.created_at);
const itemDuration = (item: Record<string, any>) => Math.max(0, Number(item.asset_duration_ms ?? item.step_duration_ms ?? item.latency ?? item.duration_ms ?? item.duration ?? 0) || 0);
const itemEnd = (item: Record<string, any>) => timestamp(item.end || item.ended_at || item.completedAt) || itemStart(item) + itemDuration(item);
const formatDuration = (ms: number) => ms < 1_000 ? `${Math.round(ms)}ms` : `${(ms / 1_000).toFixed(2)}s`;
const parse = (value: unknown): any => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } };
const providerName = (value: unknown) => { const raw = String(value || 'provider'); const parts = raw.split(':').map((part) => part.trim()).filter((part) => part && part.toLowerCase() !== 'ductape'); return (parts[0] || raw).toLowerCase(); };
const formatJson = (value: unknown) => value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const copyJson = async (value: unknown) => { await navigator.clipboard.writeText(formatJson(value)); };
const callPayload = (value: unknown) => {
  const raw = parse(value) || {};
  const nestedData = parse(raw.data) || {};
  const nestedEvent = parse(raw.event) || {};
  const nestedResult = parse(raw.result);
  const input = raw.input ?? nestedEvent.input ?? nestedData.input ?? raw.payload ?? nestedData.payload ?? null;
  const output = raw.output ?? nestedData.output ?? nestedResult?.output ?? nestedResult?.data ?? raw.response ?? nestedData.response ?? nestedResult ?? null;
  return { input: redactSensitive(input), output: redactSensitive(output) };
};

function embeddedAttempts(invocation: Record<string, any>, runStart: number, runDuration: number): InvocationCall[] {
  const roots = [invocation, parse(invocation.data), parse(invocation.result), parse(parse(invocation.data)?.result)];
  let providers: any[] = [];
  for (const root of roots) {
    const parsed = parse(root);
    const details = parsed?.details || parse(parsed?.result)?.details || parsed?.data?.details;
    if (Array.isArray(details?.providers)) { providers = details.providers; break; }
    if (Array.isArray(parsed?.providers)) { providers = parsed.providers; break; }
    if (Array.isArray(parsed?.triedProviders)) {
      providers = parsed.triedProviders.map((provider: string) => ({
        provider,
        action: provider === parsed.provider ? parsed.action : 'execute',
        status: provider === parsed.provider ? 'completed' : 'failed',
      }));
      break;
    }
  }
  const flattened = providers.flatMap((provider, providerIndex) => { const attempts = Array.isArray(provider?.attempts) && provider.attempts.length ? provider.attempts : [provider]; return attempts.map((attempt: any, attemptIndex: number) => ({ provider, attempt, providerIndex, attemptIndex })); });
  if (!flattened.length) return [];
  const fallbackDuration = Math.max(1, runDuration / flattened.length);
  let cursor = runStart;
  return flattened.map(({ provider, attempt, providerIndex, attemptIndex }, index) => { const start = itemStart(attempt) || cursor; const duration = itemDuration(attempt) || fallbackDuration; const end = itemEnd(attempt) || start + duration; const payload = callPayload(attempt); cursor = Math.max(cursor, end); return { id: String(attempt.process_id || attempt.span_id || `${providerIndex}-${attemptIndex}-${index}`), provider: providerName(attempt.provider || attempt.app || provider.provider || provider.app), operation: String(attempt.action || attempt.event || provider.action || 'execute').replace(/_/g, ' '), status: isFailed(attempt) || isFailed(provider) ? 'failed' : 'completed', start, end, duration: Math.max(0, end - start), input: payload.input, output: payload.output, data: redactSensitive(attempt) }; });
}

function loggedCalls(events: Record<string, any>[], kind: Props['kind']): InvocationCall[] {
  return events.filter((event) => { const type = String(event.type || event.component || event.asset_type || '').toLowerCase(); return type !== kind && (event.child_tag || event.app || event.provider || event.asset_tag || type === 'action' || type === 'api'); }).map((event, index) => { const start = itemStart(event); const end = itemEnd(event); const status = String(event.status || '').toLowerCase().includes('run') ? 'running' : isFailed(event) ? 'failed' : 'completed'; const payload = callPayload(event); return { id: String(event.span_id || event._id || event.process_id || index), provider: providerName(event.app || event.provider || event.asset_tag || event.child_tag), operation: String(event.action || event.event || event.asset_operation || event.message || event.child_tag || event.type || 'execute').replace(/_/g, ' '), status, start, end, duration: Math.max(0, end - start), input: payload.input, output: payload.output, data: redactSensitive(event) }; });
}

export default function ResilienceInvocationTab({ invocation, kind, resourceName, resourceTag, productTag, env }: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const id = processId(invocation);
  const query = useQuery({ queryKey: ['resilience-invocation-trace', currentWorkspaceId, id], queryFn: async () => { const response = await fetchLogs({ workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key }, { process_id: id, product_tag: productTag, env, page: 1, limit: 300 }); return response.data?.logs?.data || []; }, enabled: Boolean(id && currentWorkspaceId && user?._id && user?.public_key) });
  const events = useMemo(() => [...(query.data || [])].sort((a, b) => itemStart(a) - itemStart(b)), [query.data]);
  const invocationStart = itemStart(invocation) || Date.now();
  const invocationEnd = itemEnd(invocation) || invocationStart + Math.max(1, itemDuration(invocation));
  const calls = useMemo(() => { const logged = loggedCalls(events, kind); return logged.length ? logged : embeddedAttempts(invocation, invocationStart, Math.max(1, invocationEnd - invocationStart)); }, [events, invocation, invocationEnd, invocationStart, kind]);
  const runStart = calls.length ? Math.min(...calls.map((call) => call.start)) : invocationStart;
  const runEnd = calls.length ? Math.max(...calls.map((call) => call.end)) : invocationEnd;
  const runDuration = Math.max(1, runEnd - runStart);
  const failed = isFailed(invocation) || calls.some((call) => call.status === 'failed');
  const completedCalls = calls.filter((call) => call.status === 'completed').length;
  const safeInvocationData = useMemo(() => redactSensitive(invocation.data ?? invocation), [invocation]);

  return <div className="flex h-full min-h-0 flex-col overflow-hidden bg-grey-100 dark:bg-background">
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-5 dark:bg-background"><div className="flex min-w-0 items-center gap-4"><div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', failed ? 'bg-red/10 text-red' : 'bg-green/10 text-green')}>{failed ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</div><div className="min-w-0"><h1 className="truncate text-xl font-semibold text-grey">{resourceName} invocation</h1><div className="mt-1 flex items-center gap-2"><code className="text-xs text-grey-500">{resourceTag}</code><span className="text-grey-400">/</span><code className="truncate text-xs text-grey-500">{id}</code><Badge variant="outline">{env}</Badge></div></div></div><Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={cn('mr-2 h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</Button></header>
    <div className="flex-1 overflow-auto p-6"><div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-xl border border-border bg-white dark:bg-background">
        <div className="flex items-center justify-between border-b border-border bg-white px-5 py-4 dark:bg-grey"><div className="flex items-center gap-3"><div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', failed ? 'bg-red/10 text-red' : 'bg-green/10 text-green')}>{failed ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</div><div><h2 className="font-semibold text-grey dark:text-white">Execution timeline</h2><p className="text-sm text-grey-600 dark:text-grey-200">{query.isLoading ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading calls…</span> : `${completedCalls} of ${calls.length} calls completed`}</p></div></div><span className="font-mono text-sm text-grey-600 dark:text-grey-200">{formatDuration(runDuration)}</span></div>
        <div className="border-b border-border bg-grey-100 px-5 py-2 dark:bg-background-secondary"><div className="flex items-center justify-between font-mono text-xs text-grey-700"><span>0ms</span><span>{formatDuration(runDuration / 4)}</span><span>{formatDuration(runDuration / 2)}</span><span>{formatDuration(runDuration * .75)}</span><span>{formatDuration(runDuration)}</span></div></div>
        {query.isLoading ? <div className="flex items-center justify-center gap-2 px-5 py-8 text-grey-500"><Loader2 className="h-4 w-4 animate-spin" />Loading invocation calls…</div> : calls.length === 0 ? <div className="px-5 py-8 text-center text-sm text-grey-500">No provider calls were recorded for this invocation.</div> : <div className="divide-y divide-border">{calls.map((call, index) => { const open = expanded.has(call.id); const left = Math.max(0, ((call.start - runStart) / runDuration) * 100); const width = Math.max(1.5, (call.duration / runDuration) * 100); return <div key={call.id} className={cn(call.status === 'failed' && 'bg-red/5', call.status === 'running' && 'bg-primary/5')}><button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); open ? next.delete(call.id) : next.add(call.id); return next; })} className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-grey-100 dark:hover:bg-grey-400/20"><div className="flex w-56 flex-shrink-0 items-center gap-3"><div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', call.status === 'failed' ? 'bg-red/10 text-red' : call.status === 'running' ? 'bg-primary/10 text-primary' : 'bg-green/10 text-green')}>{call.status === 'failed' ? <XCircle className="h-4 w-4" /> : call.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate font-medium text-grey">{call.provider}</p><p className="truncate text-xs capitalize text-grey-700">{index + 1}. {call.operation}</p></div></div><div className="relative h-6 flex-1"><div className="absolute inset-0 rounded bg-grey-100 dark:bg-grey-400/20" /><div className={cn('absolute bottom-0 top-0 min-w-[4px] rounded', call.status === 'failed' ? 'bg-red' : call.status === 'running' ? 'animate-pulse bg-primary' : 'bg-green')} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} /></div><div className="flex w-28 items-center justify-end gap-3"><span className="font-mono text-sm tabular-nums text-grey-600">{formatDuration(call.duration)}</span>{open ? <ChevronDown className="h-4 w-4 text-grey-700" /> : <ChevronRight className="h-4 w-4 text-grey-700" />}</div></button>{open && <div className="px-5 pb-4"><div className="ml-10 overflow-hidden rounded-xl border border-border bg-background-tertiary"><div className="grid grid-cols-2 gap-4 p-4"><div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-grey-200">Input</span><button onClick={() => void copyJson(call.input)} className="text-grey-700 hover:text-grey-200" title="Copy input"><Copy className="h-3 w-3" /></button></div><pre className="max-h-40 overflow-auto rounded-lg border border-border bg-grey-100 p-3 font-mono text-xs text-grey">{formatJson(call.input)}</pre></div><div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-grey-200">Result</span><button onClick={() => void copyJson(call.output)} className="text-grey-700 hover:text-grey-200" title="Copy result"><Copy className="h-3 w-3" /></button></div><pre className="max-h-40 overflow-auto rounded-lg border border-border bg-grey-100 p-3 font-mono text-xs text-grey">{formatJson(call.output)}</pre></div></div></div></div>}</div>; })}</div>}
      </section>
      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-white dark:bg-background"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold text-grey">Invocation data</h2></div><div className="p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-grey-200">Result</span><button onClick={() => void copyJson(safeInvocationData)} className="text-grey-700 hover:text-grey-200" title="Copy invocation data"><Copy className="h-3 w-3" /></button></div><pre className="max-h-64 overflow-auto rounded-lg border border-border bg-grey-100 p-3 font-mono text-xs text-grey">{formatJson(safeInvocationData)}</pre></div></section>
    </div></div>
  </div>;
}

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, FunctionSquare, Gauge, HeartPulse, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/store/useAuth';
import { fetchProductObservability } from '@/services/logsServices';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

type View = 'overview' | 'logs' | 'functions' | 'features' | 'health';

const views: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Logs' },
  { id: 'functions', label: 'Functions' },
  { id: 'features', label: 'Features' },
  { id: 'health', label: 'Health' },
];

const logComponents = ['all', 'actions', 'database', 'storage', 'cache', 'message_broker', 'jobs', 'session', 'feature', 'feature_step', 'functions', 'healthcheck'];
const timeRanges = [{ id: '1h', label: '1 hour', ms: 3_600_000 }, { id: '24h', label: '24 hours', ms: 86_400_000 }, { id: '7d', label: '7 days', ms: 604_800_000 }, { id: '30d', label: '30 days', ms: 2_592_000_000 }];

const isFailure = (row: any) =>
  row?.failed_execution === true || /fail|error|unavailable|unhealthy/i.test(String(row?.status || ''));
const latencyOf = (row: any) => {
  const stored = Number(row?.latency);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const derived = Number(row?.end) - Number(row?.start);
  return Number.isFinite(derived) && derived > 0 ? derived : null;
};
const measuredLatency = (value: unknown) => {
  const latency = Number(value);
  return Number.isFinite(latency) && latency > 0 ? latency : null;
};
const percentile = (values: number[], ratio: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};
const operationOf = (row: any) =>
  row?.function_tag || row?.feature_tag || row?.child_tag || row?.action || row?.parent_tag || row?.type || 'unknown';

export default function ProductObservabilityContent({ product }: { product: any }) {
  const { user, currentWorkspaceId } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [env, setEnv] = useState('all');
  const [logComponent, setLogComponent] = useState('all');
  const [logStatus, setLogStatus] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const range = timeRanges.find((item) => item.id === timeRange) ?? timeRanges[1];
  const startDate = new Date(Date.now() - range.ms).toISOString();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-observability', currentWorkspaceId, product?._id, product?.tag, env, view, logComponent, logStatus, logSearch, timeRange],
    queryFn: () => fetchProductObservability(
      currentWorkspaceId!, user!._id, user!.public_key, product.tag,
      {
        env: env === 'all' ? undefined : env,
        component: view === 'functions' ? 'functions' : view === 'features' ? 'feature,feature_step' : view === 'logs' && logComponent !== 'all' ? logComponent : undefined,
        status: view === 'logs' && logStatus !== 'all' ? logStatus as 'success' | 'fail' | 'processing' : undefined,
        process_id: view === 'logs' && logSearch.trim() ? logSearch.trim() : undefined,
        start_date: startDate,
        end_date: new Date().toISOString(),
        page: 1,
        limit: 200,
      },
    ),
    enabled: Boolean(currentWorkspaceId && user?._id && user?.public_key && product?._id && product?.tag),
    staleTime: 30_000,
  });

  const logs = useMemo(() => data?.logs ?? [], [data]);
  const visibleLogs = useMemo(() => {
    if (view === 'functions') return logs.filter((row: any) => String(row.type).toLowerCase() === 'functions' || row.function_tag);
    if (view === 'features') return logs.filter((row: any) => /^feature(?:_step)?$/i.test(String(row.type)) || row.feature_tag);
    return logs;
  }, [logs, view]);
  const metrics = useMemo(() => {
    const failures = logs.filter(isFailure).length;
    const latencies = logs.map(latencyOf).filter((value: number | null): value is number => value !== null);
    return {
      total: data?.summary?.total ?? logs.length,
      failures: data?.summary?.failures ?? failures,
      errorRate: data?.summary?.errorRatePercent ?? (logs.length ? (failures / logs.length) * 100 : 0),
      p50: measuredLatency(data?.summary?.p50LatencyMs) ?? percentile(latencies, 0.5),
      p95: measuredLatency(data?.summary?.p95LatencyMs) ?? percentile(latencies, 0.95),
    };
  }, [data, logs]);
  const healthchecks = data?.healthchecks ?? product?.healthchecks ?? [];

  const cards = [
    { label: 'Operations', value: metrics.total, icon: Activity },
    { label: 'Error rate', value: `${metrics.errorRate.toFixed(1)}%`, icon: AlertTriangle },
    { label: 'p50 latency', value: metrics.p50 == null ? '—' : `${Math.round(metrics.p50)} ms`, icon: Clock3 },
    { label: 'p95 latency', value: metrics.p95 == null ? '—' : `${Math.round(metrics.p95)} ms`, icon: Gauge },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-grey-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-300 bg-white px-6 py-4">
        <div><h1 className="text-xl font-semibold text-grey">Product observability</h1><p className="text-sm text-grey-500">Runs, logs, functions, health and performance in one place.</p></div>
        <div className="flex items-center gap-2">
          <Select value={env} onValueChange={setEnv}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All environments</SelectItem>{(product?.envs ?? []).map((item: any) => <SelectItem key={item.slug} value={item.slug}>{item.name || item.slug}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={() => void refetch()}>Refresh</Button>
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-grey-300 bg-white px-6">
        {views.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={cn('border-b-2 px-3 py-3 text-sm font-medium', view === item.id ? 'border-primary text-primary' : 'border-transparent text-grey-600 hover:text-grey')}>{item.label}</button>)}
      </nav>
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : isError ? <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-600">Observability data could not be loaded. The product remains available; retry this read-only view.</div> : (
          <div className="mx-auto max-w-7xl space-y-6">
            {view === 'overview' && <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold text-grey">{value}</p><p className="text-xs text-grey-500">{label}</p></div>)}</div>
              <ObservabilityTimeline rows={data?.timeline ?? []} />
              <SlowestOperations rows={(data?.operations ?? []).slice(0, 10)} />
            </>}

            {view === 'health' ? <div className="grid gap-4 lg:grid-cols-2">{healthchecks.length ? healthchecks.map((check: any) => <section key={check.tag} className="rounded-lg border border-grey-300 bg-white p-5"><div className="flex items-center gap-3"><HeartPulse className="h-5 w-5 text-red-500" /><div><h2 className="font-semibold text-grey">{check.name || check.tag}</h2><p className="text-xs text-grey-500">{check.probe?.type || 'healthcheck'} · every {Math.round(Number(check.interval || check.checkIntervals || 0) / 1000)}s</p></div></div><div className="mt-4 space-y-2">{(check.envs ?? []).filter((item: any) => env === 'all' || item.slug === env).map((item: any) => <div key={item.slug} className="flex items-start justify-between rounded bg-grey-100 p-3 text-sm"><div><p className="font-medium text-grey">{item.slug}</p>{item.lastError && <p className="mt-1 max-w-xl text-xs text-red-600">{item.lastError.message || String(item.lastError)}</p>}</div><span className={cn('flex items-center gap-1 capitalize', String(item.status).includes('available') && !String(item.status).includes('unavailable') ? 'text-green' : 'text-red-600')}>{String(item.status).includes('available') && !String(item.status).includes('unavailable') ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{item.status || 'unknown'}</span></div>)}</div></section>) : <p className="rounded-lg border border-grey-300 bg-white p-8 text-center text-sm text-grey-500">No healthchecks are configured.</p>}</div> : null}

            {view === 'logs' && <><div className="rounded-lg border border-grey-300 bg-white p-4 shadow-sm"><div className="flex flex-col gap-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-500" /><Input value={logSearch} onChange={(event) => setLogSearch(event.target.value)} placeholder="Search by exact process ID" className="pl-9" /></div><div className="flex flex-wrap gap-3"><Select value={logComponent} onValueChange={setLogComponent}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{logComponents.map((item) => <SelectItem key={item} value={item}>{item === 'all' ? 'All components' : item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select><Select value={logStatus} onValueChange={setLogStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="fail">Failed</SelectItem><SelectItem value="processing">Processing</SelectItem></SelectContent></Select><div className="flex flex-wrap gap-1">{timeRanges.map((item) => <button key={item.id} onClick={() => setTimeRange(item.id)} className={cn('rounded-md px-3 py-2 text-xs font-medium', timeRange === item.id ? 'bg-primary text-white' : 'bg-grey-100 text-grey-600 hover:text-grey')}>{item.label}</button>)}</div></div></div></div><LogTable rows={visibleLogs} emptyLabel="logs" /></>}
            {(view === 'functions' || view === 'features') && <LogTable rows={visibleLogs} emptyLabel={view} />}
            {view === 'overview' && <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border border-grey-300 bg-white p-5"><div className="flex items-center gap-2"><FunctionSquare className="h-5 w-5 text-violet-600" /><h2 className="font-semibold text-grey">Functions</h2></div><p className="mt-3 text-3xl font-bold text-grey">{logs.filter((row: any) => String(row.type).toLowerCase() === 'functions' || row.function_tag).length}</p><p className="text-xs text-grey-500">invocations in this sample</p></section><section className="rounded-lg border border-grey-300 bg-white p-5"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /><h2 className="font-semibold text-grey">Healthchecks</h2></div><p className="mt-3 text-3xl font-bold text-grey">{healthchecks.length}</p><p className="text-xs text-grey-500">configured checks</p></section></div>}
          </div>
        )}
      </main>
    </div>
  );
}

function ObservabilityTimeline({ rows }: { rows: any[] }) {
  return <section className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm"><h2 className="font-semibold text-grey">Product activity</h2><p className="mb-4 text-xs text-grey-500">Successful and failed operations from the product observability aggregate.</p>{rows.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="successful" name="Successful" stackId="outcome" fill="#22c55e" /><Bar dataKey="failures" name="Failed" stackId="outcome" fill="#ef4444" /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-grey-500">No activity in this time window.</p>}</section>;
}

function SlowestOperations({ rows }: { rows: any[] }) {
  return <section className="rounded-lg border border-grey-300 bg-white shadow-sm"><div className="border-b border-grey-200 p-5"><h2 className="font-semibold text-grey">Slowest operations</h2><p className="text-xs text-grey-500">Server-side aggregates for the selected environment and time window.</p></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-grey-100 text-xs uppercase text-grey-500"><tr><th className="px-5 py-3">Operation</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Calls</th><th className="px-5 py-3">Failures</th><th className="px-5 py-3">Average</th><th className="px-5 py-3">Slowest</th></tr></thead><tbody className="divide-y divide-grey-200">{rows.map((row) => <tr key={`${row.type}:${row.operation}`}><td className="px-5 py-3 font-mono font-medium text-grey">{row.operation || 'unknown'}</td><td className="px-5 py-3 capitalize text-grey-600">{String(row.type || 'unknown').replace(/_/g, ' ')}</td><td className="px-5 py-3 text-grey">{row.calls}</td><td className={cn('px-5 py-3', row.failures ? 'text-red-600' : 'text-grey')}>{row.failures}</td><td className="px-5 py-3 text-grey">{row.averageLatencyMs == null ? '—' : `${Math.round(row.averageLatencyMs)} ms`}</td><td className="px-5 py-3 font-semibold text-grey">{row.maxLatencyMs == null ? '—' : `${Math.round(row.maxLatencyMs)} ms`}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-grey-500">No timed operations found.</p>}</section>;
}

function LogTable({ rows, emptyLabel }: { rows: any[]; emptyLabel: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!rows.length) return <p className="rounded-lg border border-grey-300 bg-white p-8 text-center text-sm text-grey-500">No {emptyLabel} found for this environment and time window.</p>;
  return <div className="overflow-hidden rounded-lg border border-grey-300 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-grey-300 bg-grey-100 text-xs uppercase text-grey-500"><tr><th className="w-10 px-3 py-3" /><th className="px-3 py-3">Time</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Component</th><th className="px-3 py-3">Environment</th><th className="px-3 py-3">Operation</th><th className="px-3 py-3">Message</th><th className="px-3 py-3">Latency</th><th className="px-3 py-3">Process ID</th></tr></thead><tbody className="divide-y divide-grey-200">{rows.map((row: any, index) => { const key = String(row._id || row.process_id || index); const open = expanded[key]; const latency = latencyOf(row); return <Fragment key={key}><tr onClick={() => setExpanded((current) => ({ ...current, [key]: !open }))} className="cursor-pointer hover:bg-grey-50"><td className="px-3 py-3">{open ? <ChevronDown className="h-4 w-4 text-grey-600" /> : <ChevronRight className="h-4 w-4 text-grey-600" />}</td><td className="whitespace-nowrap px-3 py-3 font-medium text-grey">{row.timestamp ? format(new Date(row.timestamp), 'MMM dd, HH:mm:ss') : '—'}</td><td className="px-3 py-3"><span className={cn('inline-flex items-center gap-1.5 capitalize', isFailure(row) ? 'text-red-600' : row.status === 'processing' ? 'text-orange-600' : 'text-green')}><span className={cn('h-2 w-2 rounded-full', isFailure(row) ? 'bg-red' : row.status === 'processing' ? 'bg-orange-500' : 'bg-green')} />{row.status || (isFailure(row) ? 'failed' : 'success')}</span></td><td className="px-3 py-3 capitalize text-grey-600">{String(row.type || row.component || 'unknown').replace(/_/g, ' ')}</td><td className="px-3 py-3"><span className="rounded bg-grey-100 px-2 py-1 text-xs font-medium uppercase text-grey-600">{row.env || row.app_env || '—'}</span></td><td className="px-3 py-3"><code className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">{operationOf(row)}</code></td><td className="max-w-64 truncate px-3 py-3 text-grey-600">{row.message || row.name || '—'}</td><td className="whitespace-nowrap px-3 py-3 text-grey">{latency == null ? '—' : `${Math.round(latency)} ms`}</td><td className="px-3 py-3"><code className="text-xs text-grey-600">{row.process_id ? `${String(row.process_id).slice(0, 12)}${String(row.process_id).length > 12 ? '…' : ''}` : '—'}</code></td></tr>{open && <tr className="bg-grey-50"><td colSpan={9} className="px-12 py-4"><dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-grey-500">Process ID</dt><dd className="mt-1 break-all font-mono text-grey">{row.process_id || '—'}</dd></div><div><dt className="text-grey-500">Feature</dt><dd className="mt-1 font-mono text-grey">{row.feature_tag || '—'}</dd></div><div><dt className="text-grey-500">Function</dt><dd className="mt-1 font-mono text-grey">{row.function_tag || '—'}</dd></div><div><dt className="text-grey-500">Session</dt><dd className="mt-1 font-mono text-grey">{row.session_id || '—'}</dd></div><div className="sm:col-span-2 lg:col-span-4"><dt className="text-grey-500">Correlation</dt><dd className="mt-1 break-all font-mono text-grey">trace {row.trace_id || '—'} · parent {row.parent_process_id || '—'}</dd></div></dl></td></tr>}</Fragment>; })}</tbody></table></div></div>;
}

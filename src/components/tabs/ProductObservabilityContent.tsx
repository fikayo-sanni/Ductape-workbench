import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileText, FunctionSquare, Gauge, HeartPulse, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/store/useAuth';
import { fetchProductObservability } from '@/services/logsServices';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type View = 'overview' | 'logs' | 'functions' | 'features' | 'health' | 'reports';

const views: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Logs' },
  { id: 'functions', label: 'Functions' },
  { id: 'features', label: 'Features' },
  { id: 'health', label: 'Health' },
  { id: 'reports', label: 'Reports' },
];

const isFailure = (row: any) =>
  row?.failed_execution === true || /fail|error|unavailable|unhealthy/i.test(String(row?.status || ''));
const latencyOf = (row: any) => {
  const value = Number(row?.latency ?? (Number(row?.end) - Number(row?.start)));
  return Number.isFinite(value) && value >= 0 ? value : null;
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-observability', currentWorkspaceId, product?._id, product?.tag, env, view],
    queryFn: () => fetchProductObservability(
      currentWorkspaceId!, user!._id, user!.public_key, product.tag,
      {
        env: env === 'all' ? undefined : env,
        component: view === 'functions' ? 'functions' : view === 'features' ? 'feature,feature_step' : undefined,
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
      p50: data?.summary?.p50LatencyMs ?? percentile(latencies, 0.5),
      p95: data?.summary?.p95LatencyMs ?? percentile(latencies, 0.95),
    };
  }, [data, logs]);
  const slowest = useMemo(() => [...logs]
    .filter((row) => latencyOf(row) !== null)
    .sort((a, b) => (latencyOf(b) ?? 0) - (latencyOf(a) ?? 0)).slice(0, 10), [logs]);
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
        <div><h1 className="text-xl font-semibold text-grey">Product observability</h1><p className="text-sm text-grey-500">Runs, logs, functions, health, graphs and reports in one place.</p></div>
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
            {(view === 'overview' || view === 'reports') && <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold text-grey">{value}</p><p className="text-xs text-grey-500">{label}</p></div>)}</div>
              <ObservabilityTimeline rows={data?.timeline ?? []} />
            </>}

            {view === 'health' ? <div className="grid gap-4 lg:grid-cols-2">{healthchecks.length ? healthchecks.map((check: any) => <section key={check.tag} className="rounded-lg border border-grey-300 bg-white p-5"><div className="flex items-center gap-3"><HeartPulse className="h-5 w-5 text-red-500" /><div><h2 className="font-semibold text-grey">{check.name || check.tag}</h2><p className="text-xs text-grey-500">{check.probe?.type || 'healthcheck'} · every {Math.round(Number(check.interval || check.checkIntervals || 0) / 1000)}s</p></div></div><div className="mt-4 space-y-2">{(check.envs ?? []).filter((item: any) => env === 'all' || item.slug === env).map((item: any) => <div key={item.slug} className="flex items-start justify-between rounded bg-grey-100 p-3 text-sm"><div><p className="font-medium text-grey">{item.slug}</p>{item.lastError && <p className="mt-1 max-w-xl text-xs text-red-600">{item.lastError.message || String(item.lastError)}</p>}</div><span className={cn('flex items-center gap-1 capitalize', String(item.status).includes('available') && !String(item.status).includes('unavailable') ? 'text-green' : 'text-red-600')}>{String(item.status).includes('available') && !String(item.status).includes('unavailable') ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{item.status || 'unknown'}</span></div>)}</div></section>) : <p className="rounded-lg border border-grey-300 bg-white p-8 text-center text-sm text-grey-500">No healthchecks are configured.</p>}</div> : null}

            {(view === 'logs' || view === 'functions' || view === 'features') && <LogTable rows={visibleLogs} emptyLabel={view === 'logs' ? 'logs' : view} />}
            {view === 'reports' && <section className="rounded-lg border border-grey-300 bg-white shadow-sm"><div className="border-b border-grey-200 p-5"><h2 className="font-semibold text-grey">Slowest operations</h2><p className="text-xs text-grey-500">Ranked from the current bounded log sample.</p></div><LogTable rows={slowest} emptyLabel="timed operations" compact /></section>}
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

function LogTable({ rows, emptyLabel, compact = false }: { rows: any[]; emptyLabel: string; compact?: boolean }) {
  if (!rows.length) return <p className="rounded-lg border border-grey-300 bg-white p-8 text-center text-sm text-grey-500">No {emptyLabel} found for this environment and time window.</p>;
  return <div className={cn('overflow-hidden rounded-lg border border-grey-300 bg-white', compact && 'rounded-none border-0')}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-grey-100 text-xs uppercase text-grey-500"><tr><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Environment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Time</th></tr></thead><tbody className="divide-y divide-grey-200">{rows.map((row: any, index) => <tr key={row._id || row.process_id || index} className="text-grey"><td className="px-4 py-3 font-medium">{operationOf(row)}</td><td className="px-4 py-3">{row.type || row.component || '—'}</td><td className="px-4 py-3">{row.env || '—'}</td><td className={cn('px-4 py-3 capitalize', isFailure(row) ? 'text-red-600' : 'text-green')}>{row.status || (isFailure(row) ? 'failed' : 'success')}</td><td className="px-4 py-3">{latencyOf(row) == null ? '—' : `${Math.round(latencyOf(row)!)} ms`}</td><td className="px-4 py-3 whitespace-nowrap text-grey-500">{row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></div>;
}

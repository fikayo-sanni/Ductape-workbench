import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, X, Copy, Activity, AlertTriangle, ArrowRight, Timer, Gauge, Clock3, CheckCircle2, Database, Boxes, GitBranch, HardDrive, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/button';
import { Panel, Pill } from '@/components/tabs/ProductSection';
import { fetchResourcePerformance, type QueryPerformance, type ResourceKind } from '@/services/resourcePerformance';

const ms = (value: number | null | undefined) => value == null ? '—' : value >= 1000 ? `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} s` : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`;
const count = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const percent = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const time = (value: string | number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const tip = { background: 'rgba(var(--DEFAULT))', border: '1px solid rgba(var(--border))', borderRadius: 8, color: 'rgba(var(--grey))', fontSize: 12 };
const selectStyle = 'h-8 rounded-md border border-grey-400 bg-white px-2 text-xs text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return 'No comparable previous measurement';
  const difference = (current - previous) / previous * 100;
  return `${difference > 0 ? '+' : ''}${difference.toFixed(1)}% vs previous period`;
}
export default function ResourcePerformanceOverview({ kind, productTag, resourceTag, env }: { kind: ResourceKind; productTag?: string; resourceTag?: string; env?: string }) {
  const { user, currentWorkspaceId } = useAuth();
  const rankingRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [hours, setHours] = useState(1);
  const [slowMs, setSlowMs] = useState(1000);
  const [anchor, setAnchor] = useState(() => Date.now());
  const [ranking, setRanking] = useState<'mostUsed' | 'slowest' | 'mostTime' | 'failing'>('mostUsed');
  const [selected, setSelected] = useState<QueryPerformance | null>(null);
  useEffect(() => { if (!live) return; const timer = setInterval(() => setAnchor(Date.now()), 30000); return () => clearInterval(timer); }, [live]);
  useEffect(() => setSelected(null), [productTag, resourceTag, env, currentWorkspaceId]);
  const window = useMemo(() => ({ start_date: new Date(anchor - hours * 3600000).toISOString(), end_date: new Date(anchor).toISOString() }), [anchor, hours]);
  const query = useQuery({
    queryKey: ['resource-performance', currentWorkspaceId, user?._id, productTag, kind, resourceTag, env, window, slowMs, selected?.operation, selected?.fingerprint],
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!productTag && !!resourceTag,
    queryFn: () => fetchResourcePerformance({ workspace: currentWorkspaceId!, user: user!._id, publicKey: user!.public_key! },
      { product: productTag!, kind, resource: resourceTag! }, { ...window, slow_ms: slowMs, env, ...(selected ? { operation: selected.operation, query_fingerprint: selected.fingerprint ?? undefined, unfingerprinted: !selected.fingerprint ? true : undefined } : {}) }),
    staleTime: 15000, retry: 1,
  });
  const data = query.data;
  const metrics = data?.summary;
  const rankings = data?.rankings[ranking] ?? [];
  const chartData = useMemo(() => {
    if (!data) return [];
    const points = new Map(data.timeline.map(point => [new Date(point.timestamp).getTime(), point]));
    const start = Math.floor(new Date(data.window.start).getTime() / data.window.bucketMs) * data.window.bucketMs;
    const result: Array<{ timestamp: number; calls: number; failures: number; p50: number | null; p95: number | null; p99: number | null }> = [];
    for (let timestamp = start; timestamp < new Date(data.window.end).getTime(); timestamp += data.window.bucketMs) {
      const point = points.get(timestamp);
      result.push({ timestamp, calls: point?.calls ?? 0, failures: point?.failures ?? 0,
        p50: point?.p50LatencyMs ?? null, p95: point?.p95LatencyMs ?? null, p99: point?.p99LatencyMs ?? null });
    }
    return result;
  }, [data]);
  const title = kind === 'vector' ? 'Vector performance' : kind === 'graph' ? 'Graph performance' : kind === 'storage' ? 'Storage performance' : 'Query performance';
  const ResourceIcon = { database: Database, vector: Boxes, graph: GitBranch, storage: HardDrive }[kind];
  const controls = <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-lg border border-grey-400 bg-white p-0.5" role="group" aria-label="Performance time period">
      {[{ hours: 1, label: '1h' }, { hours: 4, label: '4h' }, { hours: 24, label: '24h' }, { hours: 168, label: '7d' }].map(period => <button key={period.hours} type="button" aria-pressed={hours === period.hours} onClick={() => { setHours(period.hours); setAnchor(Date.now()); }} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${hours === period.hours ? 'bg-primary text-white' : 'text-grey/70 hover:text-grey'}`}>{period.label}</button>)}
    </div>
    <label className="text-xs text-grey/70">Slow ≥ <select aria-label="Slow operation threshold" className={selectStyle} value={slowMs} onChange={event => setSlowMs(Number(event.target.value))}><option value={100}>100 ms</option><option value={250}>250 ms</option><option value={500}>500 ms</option><option value={1000}>1 s</option><option value={5000}>5 s</option></select></label>
    <label className="text-xs text-grey/70 inline-flex items-center gap-1"><input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} />Live · 30s</label>
    <Button size="sm" variant="ghost" disabled={query.isFetching} onClick={() => { setAnchor(Date.now()); }} aria-label="Refresh performance"><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
  </div>;
  return <section className="space-y-4 text-grey sm:space-y-5" aria-label={title}>
    <header className="flex flex-col gap-4 rounded-xl border border-grey-400 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ResourceIcon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-grey">{title}</h2><Pill tone="info">{env ?? 'All environments'}</Pill></div>
            <p className="mt-0.5 break-all text-xs text-grey/70">{productTag} <span className="mx-1 text-grey-400">/</span> <span className="font-mono">{resourceTag ?? 'Resource'}</span></p>
          </div>
        </div>
        <p className="text-xs text-grey/70">{live ? 'Updating every 30 seconds' : 'Refresh to update measurements'}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-grey-300 pt-3">
        {controls}
        <p className="text-xs text-grey/70">{new Date(window.start_date).toLocaleString()} – {new Date(window.end_date).toLocaleString()}</p>
      </div>
    </header>

    {!productTag || !currentWorkspaceId ? <Panel className="rounded-xl"><p className="text-sm text-grey/70">Open this resource from a product to view scoped performance.</p></Panel> : query.isPending ? (
      <div role="status" aria-label="Loading performance measurements" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(index => <div key={index} className="h-28 animate-pulse rounded-xl border border-grey-400 bg-white" />)}</div>
    ) : query.isError ? (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-grey-400 bg-white p-4">
        <p className="text-sm text-grey/70">Performance data could not be loaded. Check the logs service connection and retry.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry</Button>
      </div>
    ) : data && metrics ? <>
      {selected && <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"><span>Inspecting <strong>{selected.operation}</strong>{selected.fingerprint ? ` · ${selected.fingerprint.slice(0, 12)}` : ' · operation group'}</span><Button size="sm" variant="ghost" onClick={() => setSelected(null)} aria-label="Clear query filter"><X className="h-4 w-4" /></Button></div>}

      {metrics.calls > 0 && <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${metrics.failures ? 'border-red/25 bg-red/5' : metrics.slowCalls ? 'border-orange/25 bg-orange/5' : 'border-green/25 bg-green/5'}`}>
        <div className="flex items-start gap-3">
          {metrics.failures ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red" /> : metrics.slowCalls ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-orange" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green" />}
          <div><p className="text-sm font-semibold">{metrics.failures ? `${count(metrics.failures)} failed operations in this period` : metrics.slowCalls ? `${count(metrics.slowCalls)} operations exceeded ${ms(slowMs)}` : 'No failures or slow operations recorded'}</p><p className="mt-0.5 text-xs text-grey/70">{percent(metrics.errorRatePercent)} error rate · {count(metrics.slowCalls)} slow operations · {count(metrics.callsPerMinute)} operations/min</p></div>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5 text-grey" onClick={() => { setRanking(metrics.failures ? 'failing' : 'slowest'); rankingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Review operations <ArrowRight className="h-3.5 w-3.5" /></Button>
      </div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <PerformanceMetric icon={Activity} label="Operations" value={count(metrics.calls)} hint={`${count(metrics.callsPerMinute)}/min`} change={delta(metrics.calls, data.previous.calls)} />
        <PerformanceMetric icon={Timer} label="p50 latency" value={ms(metrics.p50LatencyMs)} hint="Median response time" change={delta(metrics.p50LatencyMs, data.previous.p50LatencyMs)} current={metrics.p50LatencyMs} previous={data.previous.p50LatencyMs} />
        <PerformanceMetric icon={Gauge} label="p95 latency" value={ms(metrics.p95LatencyMs)} hint="1 in 20 operations takes longer" change={delta(metrics.p95LatencyMs, data.previous.p95LatencyMs)} current={metrics.p95LatencyMs} previous={data.previous.p95LatencyMs} />
        <PerformanceMetric icon={Clock3} label="p99 latency" value={ms(metrics.p99LatencyMs)} hint="1 in 100 operations takes longer" change={delta(metrics.p99LatencyMs, data.previous.p99LatencyMs)} current={metrics.p99LatencyMs} previous={data.previous.p99LatencyMs} />
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-grey-300 overflow-hidden rounded-xl border border-grey-400 bg-white shadow-sm sm:grid-cols-4 sm:divide-y-0">
        <CompactMetric label="Failed operations" value={count(metrics.failures)} hint={`${percent(metrics.errorRatePercent)} error rate`} tone={metrics.failures ? 'bad' : undefined} />
        <CompactMetric label={`Slow operations ≥ ${ms(slowMs)}`} value={count(metrics.slowCalls)} hint={`${percent(metrics.calls ? metrics.slowCalls / metrics.calls * 100 : 0)} of operations`} tone={metrics.slowCalls ? 'warn' : undefined} />
        <CompactMetric label="Average latency" value={ms(metrics.averageLatencyMs)} hint={`Maximum ${ms(metrics.maxLatencyMs)}`} />
        <CompactMetric label="Cumulative operation time" value={ms(metrics.measured ? metrics.totalLatencyMs : null)} hint="Overlapping calls add up" />
      </div>

      {!metrics.calls && <Panel className="rounded-xl"><div className="py-6 text-center"><Activity className="mx-auto mb-2 h-6 w-6 text-grey/70" /><p className="text-sm text-grey">No completed operations recorded in this period.</p><p className="mt-1 text-xs text-grey/70">Try a longer period or check SDK log publishing. Missing telemetry does not mean this resource is idle.</p></div></Panel>}
    </> : null}
    {!query.isError && data && metrics && metrics.calls > 0 && <>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="rounded-xl xl:col-span-2" title="Latency over time" description="Milliseconds · p50, p95 and p99"><div className="h-52" role="img" aria-label="Latency percentile timeline"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="rgba(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="timestamp" tickFormatter={time} tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} minTickGap={35} /><YAxis tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} width={48} /><Tooltip contentStyle={tip} labelFormatter={value => new Date(Number(value)).toLocaleString()} formatter={value => ms(typeof value === 'number' ? value : null)} /><Line name="p50" dataKey="p50" stroke="#3b82f6" dot={false} connectNulls={false} isAnimationActive={false} /><Line name="p95" dataKey="p95" stroke="#f59e0b" dot={false} connectNulls={false} isAnimationActive={false} /><Line name="p99" dataKey="p99" stroke="#ef4444" dot={false} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-xs text-grey/70">Blue p50 · Amber p95 · Red p99. Gaps have no measurements.</p></Panel>
        <Panel className="rounded-xl" title="Volume and failures" description="Completed operations per time bucket"><div className="h-52" role="img" aria-label="Operation and failure volume timeline"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid stroke="rgba(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="timestamp" tickFormatter={time} tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} minTickGap={35} /><YAxis tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} width={48} allowDecimals={false} /><Tooltip contentStyle={tip} labelFormatter={value => new Date(Number(value)).toLocaleString()} /><Area name="Operations" dataKey="calls" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} isAnimationActive={false} /><Area name="Failures" dataKey="failures" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></Panel>
      </div>
      <Panel className="rounded-xl" title="Latency distribution" description="Completed operations with a recorded duration">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0, 10, 50, 100, 250, 500, 1000, 5000].map((lower, index, buckets) => {
          const calls = data.histogram.find(bucket => bucket._id === lower)?.calls ?? 0;
          const share = metrics.measured ? calls / metrics.measured * 100 : 0;
          return <div key={lower} className="space-y-1"><p className="text-xs text-grey/70">{index === buckets.length - 1 ? '≥ 5 s' : `${ms(lower)} – ${ms(buckets[index + 1])}`}</p><p className="text-sm font-medium text-grey">{count(calls)} <span className="text-xs text-grey/70">({percent(share)})</span></p><div className="h-1.5 rounded bg-grey-100 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${share}%` }} /></div></div>;
        })}</div>
      </Panel>
      <div ref={rankingRef} className="scroll-mt-4"><Panel flush className="rounded-xl [&>div:first-child]:flex-wrap" title={kind === 'storage' ? 'Operation rankings' : 'Query and operation rankings'} description={`Top ${data.coverage.rankingLimit} of ${data.coverage.totalQueryGroups} groups. Select a row to inspect it.`} action={<select aria-label="Query ranking" className={selectStyle} value={ranking} onChange={event => setRanking(event.target.value as typeof ranking)}><option value="mostUsed">Most used</option><option value="slowest">Slowest p95 (3+ measured)</option><option value="mostTime">Most cumulative time</option><option value="failing">Most failures</option></select>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-left text-sm"><thead><tr className="border-b border-grey-400 text-xs text-grey/70 text-left">{[kind === 'storage' ? 'Operation' : 'Operation / query shape', 'Calls', 'Share', 'p50', 'p95', 'p99', 'Failures', 'Total time'].map(label => <th key={label} className="px-4 py-2.5 font-medium whitespace-nowrap">{label}</th>)}</tr></thead><tbody className="divide-y divide-grey-300">{rankings.map(row => <tr key={`${row.operation}:${row.fingerprint}`} className="hover:bg-grey-100"><td className="px-4 py-3"><button className="text-left text-primary focus-visible:underline" onClick={() => setSelected(row)}><span className="font-medium block">{row.operation}</span><span className="font-mono text-[11px] text-grey/70" title={row.fingerprint ?? undefined}>{row.fingerprint ? `${row.fingerprint.slice(0, 12)} · query shape` : (kind === 'storage' ? 'Operation group' : 'Operation group · no fingerprint')}</span></button></td><td className="px-4 tabular-nums">{count(row.calls)}</td><td className="px-4 tabular-nums">{percent(metrics.calls ? row.calls / metrics.calls * 100 : 0)}</td><td className="px-4 whitespace-nowrap">{ms(row.p50LatencyMs)}</td><td className="px-4 whitespace-nowrap">{ms(row.p95LatencyMs)}</td><td className="px-4 whitespace-nowrap">{ms(row.p99LatencyMs)}</td><td className="px-4 tabular-nums">{count(row.failures)} <span className="text-xs text-grey/70">({percent(row.errorRatePercent)})</span></td><td className="px-4 whitespace-nowrap">{ms(row.measured ? row.totalLatencyMs : null)}</td></tr>)}</tbody></table>{!rankings.length && <p className="py-6 text-sm text-grey/70 text-center">No query groups qualify for this ranking.</p>}</div>
      </Panel></div>
      <Panel flush className="rounded-xl" title="Slow operation samples" description={`Slowest ${data.coverage.slowSampleLimit} completed operations ≥ ${ms(slowMs)}. No query values or result data are shown.`}>
        <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-left text-sm"><thead><tr className="text-left border-b border-grey-400 text-xs text-grey/70">{['Time', 'Operation', 'Latency', 'Outcome', 'Trace / process'].map(label => <th key={label} className="px-4 py-2.5 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-grey-300">{data.slowSamples.map((sample, index) => <tr key={`${sample.process_id}:${sample.timestamp}:${index}`} className="hover:bg-grey-100"><td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(sample.timestamp).toLocaleString()}</td><td className="px-4">{sample.operation}<span className="block text-[11px] font-mono text-grey/70">{sample.fingerprint?.slice(0, 12)}</span></td><td className="px-4 whitespace-nowrap">{ms(sample.duration)}</td><td className={`px-4 ${sample.failed ? 'text-red' : 'text-green'}`}>{sample.failed ? 'Failed' : 'Success'}</td><td className="px-4"><CopyTrace value={sample.trace_id ?? sample.process_id} /></td></tr>)}</tbody></table>{!data.slowSamples.length && <p className="text-center py-6 text-sm text-grey/70">No operations exceeded the selected slow threshold.</p>}</div>
      </Panel>
      <details className="rounded-xl border border-grey-400 bg-white text-xs text-grey/70">
        <summary className="cursor-pointer px-4 py-3 font-medium text-grey">Measurement coverage <span className="ml-2 font-normal text-grey/70">{count(data.coverage.measured)} measured · {count(data.coverage.missingLatency)} missing latency</span></summary>
        <div className="space-y-2 border-t border-grey-300 px-4 py-3">
          <p>{kind === 'storage' ? `${count(data.coverage.totalQueryGroups)} operation groups` : `${count(data.coverage.fingerprinted)} fingerprinted operations`}. Percentiles are approximate across all matching measurements.</p>
          {metrics.measured < 100 && <p className="text-orange">Low measurement volume. Tail percentiles can vary substantially with fewer than 100 measurements.</p>}
          {kind !== 'storage' && data.coverage.fingerprinted < metrics.calls && <p>Logs without a query fingerprint are grouped by operation or saved action. Publish an updated SDK and redeploy to distinguish query shapes.</p>}
          <p>SDK timings include client-side work and provider round trips. Engine execution plans and index efficiency require separate provider metrics.</p>
          <p>Last ingested {data.coverage.latestAt ? new Date(data.coverage.latestAt).toLocaleString() : 'unknown'}.</p>
        </div>
      </details>
    </>}
  </section>;
}
function CopyTrace({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-grey/70 text-xs">Not recorded</span>;
  return <button className="inline-flex items-center gap-1 text-xs text-primary font-mono" title={value} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setCopied(false); } }} aria-label={`Copy trace or process ${value}`}><Copy className="h-3 w-3" />{copied ? 'Copied' : `${value.slice(0, 14)}…`}</button>;
}

function PerformanceMetric({ icon: Icon, label, value, hint, change, current, previous }: { icon: LucideIcon; label: string; value: string; hint: string; change: string; current?: number | null; previous?: number | null }) {
  const changeColor = current != null && previous != null && previous > 0 && current !== previous ? current > previous ? 'text-red' : 'text-green' : 'text-grey/70';
  return <div className="rounded-xl border border-grey-400 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2"><p className="text-xs text-grey/70 sm:text-sm">{label}</p><Icon className="h-4 w-4 shrink-0 text-grey/50" /></div>
    <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-grey sm:text-3xl">{value}</p>
    <p className={`mt-1 text-[11px] font-medium sm:text-xs ${changeColor}`}>{change}</p>
    <p className="mt-2 text-[11px] text-grey/70">{hint}</p>
  </div>;
}
function CompactMetric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'bad' | 'warn' }) {
  return <div className="min-w-0 p-3 sm:px-4">
    <p className="text-[11px] text-grey/70">{label}</p>
    <p className={`mt-1 text-lg font-semibold tabular-nums ${tone === 'bad' ? 'text-red' : tone === 'warn' ? 'text-orange' : 'text-grey'}`}>{value}</p>
    <p className="mt-0.5 text-[11px] text-grey/70">{hint}</p>
  </div>;
}

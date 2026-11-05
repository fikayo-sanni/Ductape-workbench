import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, X, Copy, Activity } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/button';
import { Panel, StatTile } from '@/components/tabs/ProductSection';
import { fetchResourcePerformance, type QueryPerformance, type ResourceKind } from '@/services/resourcePerformance';

const ms = (value: number | null | undefined) => value == null ? '—' : value >= 1000 ? `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} s` : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ms`;
const count = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const percent = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const time = (value: string | number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const tip = { background: 'rgba(var(--DEFAULT))', border: '1px solid rgba(var(--border))', borderRadius: 8, color: 'rgba(var(--grey))', fontSize: 12 };
const selectStyle = 'h-8 rounded-md border border-grey-400 bg-white px-2 text-xs text-grey';
function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return 'No comparable previous measurement';
  const difference = (current - previous) / previous * 100;
  return `${difference > 0 ? '+' : ''}${difference.toFixed(1)}% vs previous period`;
}
export default function ResourcePerformanceOverview({ kind, productTag, resourceTag, env }: { kind: ResourceKind; productTag?: string; resourceTag?: string; env?: string }) {
  const { user, currentWorkspaceId } = useAuth();
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
  const controls = <div className="flex flex-wrap items-center gap-2">
    <label className="text-xs text-grey/70">Period <select aria-label="Performance time period" className={selectStyle} value={hours} onChange={event => { setHours(Number(event.target.value)); setAnchor(Date.now()); }}><option value={1}>Last hour</option><option value={4}>Last 4 hours</option><option value={24}>Last 24 hours</option><option value={168}>Last 7 days</option></select></label>
    <label className="text-xs text-grey/70">Slow ≥ <select aria-label="Slow operation threshold" className={selectStyle} value={slowMs} onChange={event => setSlowMs(Number(event.target.value))}><option value={100}>100 ms</option><option value={250}>250 ms</option><option value={500}>500 ms</option><option value={1000}>1 s</option><option value={5000}>5 s</option></select></label>
    <label className="text-xs text-grey/70 inline-flex items-center gap-1"><input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} />Live · 30s</label>
    <Button size="sm" variant="ghost" disabled={query.isFetching} onClick={() => { setAnchor(Date.now()); }} aria-label="Refresh performance"><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
  </div>;
  return <section className="space-y-4 text-grey" aria-label={title}>
    <Panel className="[&>div:first-child]:flex-wrap" title={title} description={`Completed SDK operations for ${resourceTag ?? 'this resource'} · ${env ?? 'all environments'}`} action={controls}>
      {!productTag || !currentWorkspaceId ? <p className="text-sm text-grey/70">Open this resource from a product to view scoped performance.</p> : query.isPending ? <p role="status" className="text-sm text-grey/70">Loading performance measurements…</p> : query.isError ? <div role="alert" className="text-sm text-grey"><p>Performance data could not be loaded. Check the logs service connection and retry.</p><Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>Retry</Button></div> : data && metrics ? <>
        {selected && <div className="flex items-center justify-between mb-4 rounded-md bg-primary/10 p-3 text-sm text-grey"><span>Inspecting {selected.operation}{selected.fingerprint ? ` · ${selected.fingerprint.slice(0, 12)}` : ' · operation group'}</span><Button size="sm" variant="ghost" onClick={() => setSelected(null)} aria-label="Clear query filter"><X className="h-4 w-4" /></Button></div>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Operations" value={count(metrics.calls)} hint={`${count(metrics.callsPerMinute)}/min · ${delta(metrics.calls, data.previous.calls)}`} />
          <StatTile label="p50 latency" value={ms(metrics.p50LatencyMs)} hint={delta(metrics.p50LatencyMs, data.previous.p50LatencyMs)} />
          <StatTile label="p95 latency" value={ms(metrics.p95LatencyMs)} hint={delta(metrics.p95LatencyMs, data.previous.p95LatencyMs)} />
          <StatTile label="p99 latency" value={ms(metrics.p99LatencyMs)} hint={delta(metrics.p99LatencyMs, data.previous.p99LatencyMs)} />
          <StatTile label="Failed operations" value={count(metrics.failures)} hint={`${percent(metrics.errorRatePercent)} error rate`} tone={metrics.failures ? 'bad' : 'neutral'} />
          <StatTile label={`Slow operations ≥ ${ms(slowMs)}`} value={count(metrics.slowCalls)} hint={`${percent(metrics.calls ? metrics.slowCalls / metrics.calls * 100 : 0)} of operations`} tone={metrics.slowCalls ? 'warn' : 'neutral'} />
          <StatTile label="Average latency" value={ms(metrics.averageLatencyMs)} hint={`Maximum ${ms(metrics.maxLatencyMs)}`} />
          <StatTile label="Cumulative operation time" value={ms(metrics.measured ? metrics.totalLatencyMs : null)} hint="Elapsed SDK time; overlapping calls add up" />
        </div>
        <p className="mt-4 text-xs text-grey/70">{new Date(data.window.start).toLocaleString()} – {new Date(data.window.end).toLocaleString()} · {count(data.coverage.measured)} measured · {count(data.coverage.missingLatency)} missing latency · {kind === 'storage' ? `${count(data.coverage.totalQueryGroups)} operation groups` : `${count(data.coverage.fingerprinted)} fingerprinted`} · Percentiles are approximate across all matching measurements.</p>
        {metrics.measured > 0 && metrics.measured < 100 && <p className="mt-1 text-xs text-orange">Low measurement volume. Tail percentiles can vary substantially with fewer than 100 measurements.</p>}
        {kind !== 'storage' && data.coverage.fingerprinted < metrics.calls && metrics.calls > 0 && <p className="mt-1 text-xs text-grey/70">Logs without a query fingerprint are grouped by operation or saved action. Publish an updated SDK and redeploy to distinguish query shapes.</p>}
        {!metrics.calls && <div className="py-8 text-center"><Activity className="h-6 w-6 mx-auto text-grey/70 mb-2" /><p className="text-sm text-grey">No completed operations recorded in this period.</p><p className="text-xs text-grey/70 mt-1">Try a longer period or check SDK log publishing. Missing telemetry does not mean this resource is idle.</p></div>}
      </> : null}
    </Panel>
    {!query.isError && data && metrics && metrics.calls > 0 && <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Latency over time" description="Milliseconds · p50, p95 and p99"><div className="h-52" role="img" aria-label="Latency percentile timeline"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="rgba(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="timestamp" tickFormatter={time} tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} minTickGap={35} /><YAxis tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} width={48} /><Tooltip contentStyle={tip} labelFormatter={value => new Date(Number(value)).toLocaleString()} formatter={value => ms(typeof value === 'number' ? value : null)} /><Line name="p50" dataKey="p50" stroke="#3b82f6" dot={false} connectNulls={false} isAnimationActive={false} /><Line name="p95" dataKey="p95" stroke="#f59e0b" dot={false} connectNulls={false} isAnimationActive={false} /><Line name="p99" dataKey="p99" stroke="#ef4444" dot={false} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-xs text-grey/70">Blue p50 · Amber p95 · Red p99. Gaps have no measurements.</p></Panel>
        <Panel title="Volume and failures" description="Completed operations per time bucket"><div className="h-52" role="img" aria-label="Operation and failure volume timeline"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid stroke="rgba(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="timestamp" tickFormatter={time} tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} minTickGap={35} /><YAxis tick={{ fontSize: 10, fill: 'rgba(var(--grey),0.7)' }} width={48} allowDecimals={false} /><Tooltip contentStyle={tip} labelFormatter={value => new Date(Number(value)).toLocaleString()} /><Area name="Operations" dataKey="calls" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} isAnimationActive={false} /><Area name="Failures" dataKey="failures" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></Panel>
      </div>
      <Panel title="Latency distribution" description="Completed operations with a recorded duration">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0, 10, 50, 100, 250, 500, 1000, 5000].map((lower, index, buckets) => {
          const calls = data.histogram.find(bucket => bucket._id === lower)?.calls ?? 0;
          const share = metrics.measured ? calls / metrics.measured * 100 : 0;
          return <div key={lower} className="space-y-1"><p className="text-xs text-grey/70">{index === buckets.length - 1 ? '≥ 5 s' : `${ms(lower)} – ${ms(buckets[index + 1])}`}</p><p className="text-sm font-medium text-grey">{count(calls)} <span className="text-xs text-grey/70">({percent(share)})</span></p><div className="h-1.5 rounded bg-grey-100 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${share}%` }} /></div></div>;
        })}</div>
      </Panel>
      <Panel className="[&>div:first-child]:flex-wrap" title={kind === 'storage' ? 'Operation rankings' : 'Query and operation rankings'} description={`Top ${data.coverage.rankingLimit} of ${data.coverage.totalQueryGroups} groups. Select a row to inspect it.`} action={<select aria-label="Query ranking" className={selectStyle} value={ranking} onChange={event => setRanking(event.target.value as typeof ranking)}><option value="mostUsed">Most used</option><option value="slowest">Slowest p95 (3+ measured)</option><option value="mostTime">Most cumulative time</option><option value="failing">Most failures</option></select>}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-grey-400 text-xs text-grey/70 text-left">{[kind === 'storage' ? 'Operation' : 'Operation / query shape', 'Calls', 'Share', 'p50', 'p95', 'p99', 'Failures', 'Total time'].map(label => <th key={label} className="px-2 py-2 font-medium whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{rankings.map(row => <tr key={`${row.operation}:${row.fingerprint}`} className="border-b border-grey-400 hover:bg-grey-100"><td className="px-2 py-3"><button className="text-left text-primary focus-visible:underline" onClick={() => setSelected(row)}><span className="font-medium block">{row.operation}</span><span className="font-mono text-[11px] text-grey/70" title={row.fingerprint ?? undefined}>{row.fingerprint ? `${row.fingerprint.slice(0, 12)} · query shape` : (kind === 'storage' ? 'Operation group' : 'Operation group · no fingerprint')}</span></button></td><td className="px-2 tabular-nums">{count(row.calls)}</td><td className="px-2 tabular-nums">{percent(metrics.calls ? row.calls / metrics.calls * 100 : 0)}</td><td className="px-2 whitespace-nowrap">{ms(row.p50LatencyMs)}</td><td className="px-2 whitespace-nowrap">{ms(row.p95LatencyMs)}</td><td className="px-2 whitespace-nowrap">{ms(row.p99LatencyMs)}</td><td className="px-2 tabular-nums">{count(row.failures)} <span className="text-xs text-grey/70">({percent(row.errorRatePercent)})</span></td><td className="px-2 whitespace-nowrap">{ms(row.measured ? row.totalLatencyMs : null)}</td></tr>)}</tbody></table>{!rankings.length && <p className="py-6 text-sm text-grey/70 text-center">No query groups qualify for this ranking.</p>}</div>
      </Panel>
      <Panel title="Slow operation samples" description={`Slowest ${data.coverage.slowSampleLimit} completed operations ≥ ${ms(slowMs)}. No query values or result data are shown.`}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-grey-400 text-xs text-grey/70">{['Time', 'Operation', 'Latency', 'Outcome', 'Trace / process'].map(label => <th key={label} className="px-2 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{data.slowSamples.map((sample, index) => <tr key={`${sample.process_id}:${sample.timestamp}:${index}`} className="border-b border-grey-400"><td className="px-2 py-3 text-xs whitespace-nowrap">{new Date(sample.timestamp).toLocaleString()}</td><td className="px-2">{sample.operation}<span className="block text-[11px] font-mono text-grey/70">{sample.fingerprint?.slice(0, 12)}</span></td><td className="px-2 whitespace-nowrap">{ms(sample.duration)}</td><td className={`px-2 ${sample.failed ? 'text-red' : 'text-green'}`}>{sample.failed ? 'Failed' : 'Success'}</td><td className="px-2"><CopyTrace value={sample.trace_id ?? sample.process_id} /></td></tr>)}</tbody></table>{!data.slowSamples.length && <p className="text-center py-6 text-sm text-grey/70">No operations exceeded the selected slow threshold.</p>}</div>
      </Panel>
      <p className="text-xs text-grey/70">SDK timings include client-side work and provider round trips. Database engine execution plans, index recommendations, scanned rows and vector recall are not inferred from latency logs. Last ingested {data.coverage.latestAt ? new Date(data.coverage.latestAt).toLocaleString() : 'unknown'}.</p>
    </>}
  </section>;
}
function CopyTrace({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-grey/70 text-xs">Not recorded</span>;
  return <button className="inline-flex items-center gap-1 text-xs text-primary font-mono" title={value} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setCopied(false); } }} aria-label={`Copy trace or process ${value}`}><Copy className="h-3 w-3" />{copied ? 'Copied' : `${value.slice(0, 14)}…`}</button>;
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, HeartPulse, Inbox, RefreshCw, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/store/useAuth';
import { fetchProductObservability, fetchWorkspaceLogs } from '@/services/logsServices';
import { LogList, type FetchLogPayload } from '@/components/log-table/LogTable';
import { functionPayload } from '@/utils/functionPayload';
import { describeStatus } from '@/utils/observabilityNarrative';
import { describeStrategy, healthView } from '@/utils/healthcheckStrategy';
import { cn } from '@/lib/utils';
import {
  DataTable,
  Panel,
  Pill,
  SectionEmpty,
  SectionError,
  SectionLoading,
  SectionPage,
  SegmentedTabs,
  StatTile,
  StatusDot,
  type SectionTint,
  type Tone,
} from './ProductSection';

export type ObservabilityView = 'overview' | 'logs' | 'functions' | 'features' | 'health';

const VIEWS: Array<{ id: ObservabilityView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Logs' },
  { id: 'functions', label: 'Functions' },
  { id: 'features', label: 'Features' },
  { id: 'health', label: 'Health' },
];

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };

const LOG_COMPONENTS = ['all', 'actions', 'database', 'storage', 'cache', 'message_broker', 'jobs', 'session', 'feature', 'feature_step', 'functions', 'healthcheck'];

const TIME_RANGES = [
  { id: '1h', label: '1 hour', ms: 3_600_000 },
  { id: '24h', label: '24 hours', ms: 86_400_000 },
  { id: '7d', label: '7 days', ms: 604_800_000 },
  { id: '30d', label: '30 days', ms: 2_592_000_000 },
];

/** Friendly names for the raw log types. */
const KIND_LABELS: Record<string, string> = {
  actions: 'Actions',
  action: 'Actions',
  database: 'Databases',
  storage: 'Storage',
  cache: 'Caches',
  message_broker: 'Message brokers',
  jobs: 'Jobs',
  session: 'Sessions',
  feature: 'Features',
  feature_step: 'Feature steps',
  functions: 'Functions',
  healthcheck: 'Health checks',
  rate_limit: 'Rate limits',
  notification: 'Notifications',
};

const kindLabel = (type: unknown) => {
  const key = String(type || 'unknown');
  return KIND_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
};

type OperationSort = 'calls' | 'slowest' | 'failures';

const SORTS: Array<{ id: OperationSort; label: string }> = [
  { id: 'calls', label: 'Most used' },
  { id: 'slowest', label: 'Slowest' },
  { id: 'failures', label: 'Most failures' },
];

const isFailure = (row: any) => row?.failed_execution === true || /fail|error|unavailable|unhealthy/i.test(String(row?.status || ''));

const latencyOf = (row: any) => {
  const stored = Number(row?.latency);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const derived = Number(row?.end) - Number(row?.start);
  return Number.isFinite(derived) && derived > 0 ? derived : null;
};

const measured = (value: unknown) => {
  const latency = Number(value);
  return Number.isFinite(latency) && latency > 0 ? latency : null;
};

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

const operationOf = (row: any) => row?.function_tag || row?.feature_tag || row?.child_tag || row?.action || row?.parent_tag || row?.type || 'unknown';

const ms = (value: number | null | undefined) => (value == null ? '-' : `${Math.round(value)} ms`);

const isAvailable = (status: unknown) => {
  const text = String(status || '');
  return text.includes('available') && !text.includes('unavailable');
};

interface Props {
  product: any;
  initialView?: ObservabilityView;
  /**
   * Render only the content, without the page header or its own scroll area, so it can sit inside
   * another section's page (for example the Functions "Activity" tab).
   */
  embedded?: boolean;
}

export default function ProductObservabilityContent({ product, initialView = 'overview', embedded = false }: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const [view, setView] = useState<ObservabilityView>(initialView);
  const [env, setEnv] = useState('all');
  const [logComponent, setLogComponent] = useState('all');
  const [logStatus, setLogStatus] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [sort, setSort] = useState<OperationSort>('calls');

  const range = TIME_RANGES.find(item => item.id === timeRange) ?? TIME_RANGES[1];
  const enabled = Boolean(currentWorkspaceId && user?._id && user?.public_key && product?._id && product?.tag);
  // The window is computed when the request runs, so Refresh always reaches "now".
  const read = (extra: Record<string, unknown>) => {
    const now = Date.now();
    return fetchProductObservability(currentWorkspaceId!, user!._id, user!.public_key, product.tag, {
      env: env === 'all' ? undefined : env,
      start_date: new Date(now - range.ms).toISOString(),
      end_date: new Date(now).toISOString(),
      page: 1,
      ...extra,
    } as any);
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['product-observability', currentWorkspaceId, product?._id, product?.tag, env, view, logComponent, logStatus, logSearch, timeRange],
    queryFn: () =>
      read({
        component: view === 'functions' ? 'functions' : view === 'features' ? 'feature,feature_step' : view === 'logs' && logComponent !== 'all' ? logComponent : undefined,
        status: view === 'logs' && logStatus !== 'all' ? logStatus : undefined,
        process_id: view === 'logs' && logSearch.trim() ? logSearch.trim() : undefined,
        limit: 200,
      }),
    enabled,
    staleTime: 30_000,
  });

  // The overview lists the latest failures on their own, so they are not limited to the 200 most recent operations.
  const failuresQuery = useQuery({
    queryKey: ['product-observability-failures', currentWorkspaceId, product?._id, product?.tag, env, timeRange],
    queryFn: () => read({ status: 'fail', limit: 8 }),
    enabled: enabled && view === 'overview',
    staleTime: 30_000,
  });

  const logs: any[] = useMemo(() => data?.logs ?? [], [data]);
  const visibleLogs = useMemo(() => {
    if (view === 'functions') return logs.filter(row => String(row.type).toLowerCase() === 'functions' || row.function_tag);
    if (view === 'features') return logs.filter(row => /^feature(?:_step)?$/i.test(String(row.type)) || row.feature_tag);
    return logs;
  }, [logs, view]);

  const operations: any[] = useMemo(() => data?.operations ?? [], [data]);
  const metrics = useMemo(() => {
    const failures = logs.filter(isFailure).length;
    const latencies = logs.map(latencyOf).filter((value): value is number => value !== null);
    return {
      total: data?.summary?.total ?? logs.length,
      failures: data?.summary?.failures ?? failures,
      errorRate: data?.summary?.errorRatePercent ?? (logs.length ? (failures / logs.length) * 100 : 0),
      p50: measured(data?.summary?.p50LatencyMs) ?? percentile(latencies, 0.5),
      p95: measured(data?.summary?.p95LatencyMs) ?? percentile(latencies, 0.95),
    };
  }, [data, logs]);

  const healthchecks: any[] = data?.healthchecks ?? product?.healthchecks ?? [];
  const unhealthyChecks = healthchecks.filter(check => (check.envs ?? []).some((item: any) => (env === 'all' || item.slug === env) && item.status && !isAvailable(item.status))).length;

  const topFailing = useMemo(() => {
    const worst = [...operations].filter(row => row.failures > 0).sort((a, b) => b.failures - a.failures)[0];
    return worst ? { operation: String(worst.operation || 'unknown'), failures: Number(worst.failures) } : undefined;
  }, [operations]);

  const narrative = describeStatus({
    total: metrics.total,
    failures: metrics.failures,
    errorRatePercent: metrics.errorRate,
    topFailing,
    unhealthyChecks,
    totalChecks: healthchecks.length,
    rangeLabel: range.label,
  });

  const openFailures = () => {
    setLogComponent('all');
    setLogSearch('');
    setLogStatus('fail');
    setView('logs');
  };

  const filters = (
    <>
      <Select value={env} onValueChange={setEnv}>
        <SelectTrigger className="h-9 w-40 bg-white" aria-label="Environment">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All environments</SelectItem>
          {(product?.envs ?? []).map((item: any) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.name || item.slug}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="h-9 w-36 bg-white" aria-label="Time range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGES.map(item => (
            <SelectItem key={item.id} value={item.id}>
              Last {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={isFetching}
        onClick={() => {
          void refetch();
          if (view === 'overview') void failuresQuery.refetch();
        }}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </>
  );

  const body = isLoading ? (
    <SectionLoading label="Loading activity..." />
  ) : isError ? (
    <SectionError onRetry={() => void refetch()}>Activity could not be loaded. Your product is unaffected; this is a read-only view.</SectionError>
  ) : (
    <>
      {view === 'overview' && (
        <Overview
          narrative={narrative}
          metrics={metrics}
          timeline={data?.timeline ?? []}
          operations={operations}
          sort={sort}
          onSort={setSort}
          failures={failuresQuery.data?.logs ?? []}
          failuresLoading={failuresQuery.isLoading}
          healthchecks={healthchecks}
          env={env}
          onOpenFailures={openFailures}
          onOpenHealth={() => setView('health')}
        />
      )}
      {view === 'health' && <HealthView healthchecks={healthchecks} env={env} />}
      {view === 'logs' && (
        <>
          <Panel>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-500" />
                <Input value={logSearch} onChange={event => setLogSearch(event.target.value)} placeholder="Find one run by its exact process ID" className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={logComponent} onValueChange={setLogComponent}>
                  <SelectTrigger className="h-9 w-48 bg-white" aria-label="Component">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_COMPONENTS.map(item => (
                      <SelectItem key={item} value={item}>
                        {item === 'all' ? 'All components' : kindLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={logStatus} onValueChange={setLogStatus}>
                  <SelectTrigger className="h-9 w-40 bg-white" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Succeeded</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                    <SelectItem value="processing">Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Panel>
          <LogTable rows={visibleLogs} emptyLabel="logs" product={product} />
        </>
      )}
      {(view === 'functions' || view === 'features') && (
        <>
          <KindSummary operations={operations} kinds={view === 'functions' ? ['functions'] : ['feature', 'feature_step']} />
          <LogTable rows={visibleLogs} emptyLabel={view} product={product} />
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">{filters}</div>
        {body}
      </>
    );
  }

  return (
    <SectionPage
      icon={BarChart3}
      tint={TINT}
      title="Observability"
      subtitle={`How ${product?.name || 'this product'} has been running in the last ${range.label}`}
      actions={filters}
      toolbar={<SegmentedTabs label="Observability views" value={view} onChange={setView} options={VIEWS} />}
    >
      {body}
    </SectionPage>
  );
}

function Overview({
  narrative,
  metrics,
  timeline,
  operations,
  sort,
  onSort,
  failures,
  failuresLoading,
  healthchecks,
  env,
  onOpenFailures,
  onOpenHealth,
}: {
  narrative: ReturnType<typeof describeStatus>;
  metrics: { total: number; failures: number; errorRate: number; p50: number | null; p95: number | null };
  timeline: any[];
  operations: any[];
  sort: OperationSort;
  onSort: (next: OperationSort) => void;
  failures: any[];
  failuresLoading: boolean;
  healthchecks: any[];
  env: string;
  onOpenFailures: () => void;
  onOpenHealth: () => void;
}) {
  const tone: Tone = narrative.tone;
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'neutral' ? Activity : AlertTriangle;

  const sorted = useMemo(() => {
    const rows = [...operations];
    if (sort === 'slowest') rows.sort((a, b) => (b.maxLatencyMs ?? 0) - (a.maxLatencyMs ?? 0));
    else if (sort === 'failures') rows.sort((a, b) => b.failures - a.failures || b.calls - a.calls);
    else rows.sort((a, b) => b.calls - a.calls);
    return rows.slice(0, 8);
  }, [operations, sort]);

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border p-4 sm:p-5',
          tone === 'good' && 'border-green/30 bg-green/5',
          tone === 'warn' && 'border-orange/40 bg-orange/5',
          tone === 'bad' && 'border-red/30 bg-red/5',
          tone === 'neutral' && 'border-grey-400 bg-white',
        )}
      >
        <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', tone === 'good' && 'text-green', tone === 'warn' && 'text-orange', tone === 'bad' && 'text-red', tone === 'neutral' && 'text-grey-500')} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-grey sm:text-base">{narrative.title}</h2>
          <p className="mt-0.5 text-xs text-grey-600 sm:text-sm">{narrative.detail}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Operations" value={metrics.total.toLocaleString()} hint="actions, features, functions and more" tone="info" />
        <StatTile label="Failed" value={metrics.failures.toLocaleString()} hint={`${metrics.errorRate >= 10 ? Math.round(metrics.errorRate) : metrics.errorRate.toFixed(1)}% of operations`} tone={metrics.failures ? 'bad' : 'good'} />
        <StatTile label="Typical response" value={ms(metrics.p50)} hint="half of operations finish faster" />
        <StatTile label="Slow responses" value={ms(metrics.p95)} hint="1 in 20 operations takes longer" tone={metrics.p95 && metrics.p95 > 5000 ? 'warn' : 'neutral'} />
      </div>

      <Panel title="Activity over time" description="Successful and failed operations, per day.">
        {timeline.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={value => format(new Date(`${value}T00:00:00`), 'MMM d')} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" name="Succeeded" stackId="outcome" fill="#00875A" />
                <Bar dataKey="failures" name="Failed" stackId="outcome" fill="#DC3444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-grey-500">No activity in this time window.</p>
        )}
      </Panel>

      <KindSummary operations={operations} />

      <Panel
        title="Latest failures"
        description="The most recent operations that did not succeed."
        action={
          failures.length ? (
            <Button variant="ghost" size="sm" onClick={onOpenFailures}>
              See all in Logs
            </Button>
          ) : undefined
        }
        flush
      >
        {failuresLoading ? (
          <SectionLoading label="Loading failures..." />
        ) : failures.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-grey-500">No failures in this time window.</p>
        ) : (
          <ul className="divide-y divide-grey-300">
            {failures.map((row, index) => (
              <li key={String(row._id || row.process_id || index)} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-28 flex-shrink-0 text-xs text-grey-500" title={row.timestamp ? new Date(row.timestamp).toLocaleString() : ''}>
                  {row.timestamp ? formatDistanceToNow(new Date(row.timestamp), { addSuffix: true }) : '-'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{operationOf(row)}</code>
                    <Pill>{kindLabel(row.type || row.component)}</Pill>
                    {row.env || row.app_env ? <Pill>{row.env || row.app_env}</Pill> : null}
                  </div>
                  <p className="mt-1 break-words text-xs text-grey-600 sm:text-sm">{row.message || row.name || 'No error message was recorded.'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="What is running"
        description="Each operation your product performed in this period."
        action={<SegmentedTabs label="Sort operations" value={sort} onChange={onSort} options={SORTS} />}
        flush
      >
        {sorted.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-grey-500">No operations were recorded in this period.</p>
        ) : (
          <DataTable head={['Operation', 'Kind', 'Calls', 'Failed', 'Average', 'Slowest']} minWidth={640}>
            {sorted.map(row => (
              <tr key={`${row.type}:${row.operation}`} className="hover:bg-grey-100">
                <td className="px-4 py-3 font-mono text-xs font-medium text-grey sm:text-sm">{row.operation || 'unknown'}</td>
                <td className="px-4 py-3 text-grey-600">{kindLabel(row.type)}</td>
                <td className="px-4 py-3 text-grey">{Number(row.calls).toLocaleString()}</td>
                <td className={cn('px-4 py-3', row.failures ? 'font-medium text-red' : 'text-grey-500')}>{row.failures ? Number(row.failures).toLocaleString() : '0'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-grey-600">{ms(row.averageLatencyMs)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-grey">{ms(row.maxLatencyMs)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <HealthSummary healthchecks={healthchecks} env={env} onOpen={onOpenHealth} />
    </>
  );
}

/** One tile per kind of thing that ran (actions, features, functions...), built from the per-operation aggregates. */
function KindSummary({ operations, kinds }: { operations: any[]; kinds?: string[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { type: string; calls: number; failures: number; weighted: number; timed: number }>();
    for (const row of operations) {
      const type = String(row.type || 'unknown');
      if (kinds && !kinds.includes(type)) continue;
      const group = map.get(type) ?? { type, calls: 0, failures: 0, weighted: 0, timed: 0 };
      group.calls += Number(row.calls) || 0;
      group.failures += Number(row.failures) || 0;
      if (row.averageLatencyMs != null) {
        group.weighted += row.averageLatencyMs * row.calls;
        group.timed += row.calls;
      }
      map.set(type, group);
    }
    return [...map.values()].sort((a, b) => b.calls - a.calls);
  }, [operations, kinds]);

  if (!groups.length) return null;
  return (
    <Panel title="What ran" description="Operations grouped by what kind of thing they are.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(group => {
          const failedShare = group.calls ? Math.round((group.failures / group.calls) * 100) : 0;
          return (
            <div key={group.type} className="rounded-lg border border-grey-300 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-grey">{kindLabel(group.type)}</h3>
                {group.failures ? <Pill tone="bad">{failedShare}% failed</Pill> : <Pill tone="good">All succeeded</Pill>}
              </div>
              <p className="mt-2 text-2xl font-bold text-grey">{group.calls.toLocaleString()}</p>
              <p className="text-xs text-grey-500">
                {group.calls === 1 ? 'call' : 'calls'}
                {group.timed ? ` · ${ms(group.weighted / group.timed)} on average` : ''}
              </p>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-grey-100" aria-hidden="true">
                <div className="h-full bg-green" style={{ width: `${100 - failedShare}%` }} />
                <div className="h-full bg-red" style={{ width: `${failedShare}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function envStatuses(check: any, env: string) {
  return (check.envs ?? []).filter((item: any) => env === 'all' || item.slug === env);
}

function HealthSummary({ healthchecks, env, onOpen }: { healthchecks: any[]; env: string; onOpen: () => void }) {
  return (
    <Panel
      title="Health checks"
      description="Whether the things your product depends on are reachable."
      action={
        healthchecks.length ? (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            Details
          </Button>
        ) : undefined
      }
      flush
    >
      {healthchecks.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-grey-500">No health checks are configured for this product.</p>
      ) : (
        <ul className="divide-y divide-grey-300">
          {healthchecks.map(check => (
            <li key={check.tag} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="text-sm font-medium text-grey">{check.name || check.tag}</span>
              <div className="flex flex-wrap gap-2">
                {envStatuses(check, env).map((item: any) => (
                  <span key={item.slug} className="inline-flex items-center gap-1.5 text-xs text-grey-600">
                    <StatusDot tone={healthView(item).tone} />
                    {item.slug}: {healthView(item).label.toLowerCase()}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function HealthView({ healthchecks, env }: { healthchecks: any[]; env: string }) {
  if (!healthchecks.length) {
    return <SectionEmpty icon={HeartPulse} tint={TINT} title="No health checks yet" description="Health checks probe the apps, databases and other things your product depends on. Add one under Resilience to see it here." />;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {healthchecks.map(check => (
        <Panel
          key={check.tag}
          title={check.name || check.tag}
          description={`${check.probe?.type || 'healthcheck'} probe. ${describeStrategy(check, `every ${Math.round(Number(check.interval || check.checkIntervals || 0) / 1000)} seconds`)}`}
        >
          <div className="space-y-2">
            {envStatuses(check, env).map((item: any) => {
              const view = healthView(item);
              const ok = view.tone === 'good';
              return (
                <div key={item.slug} className="flex items-start justify-between gap-3 rounded-lg bg-grey-100 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-grey">{item.slug}</p>
                    {healthView(item).note ? <p className="mt-0.5 text-xs text-grey-500">{healthView(item).note}</p> : null}
                    {item.lastError ? <p className="mt-1 break-words text-xs text-red">{item.lastError.message || String(item.lastError)}</p> : null}
                  </div>
                  <Pill tone={view.tone}>
                    {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {view.label}
                  </Pill>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function LogTable({ rows, emptyLabel, product }: { rows: any[]; emptyLabel: string; product: any }) {
  const { user, currentWorkspaceId } = useAuth();
  // The observability list leaves each payload out to stay light, so an opened row loads its own.
  const fetchPayload: FetchLogPayload = async log => {
    const response = await fetchWorkspaceLogs(
      { user_id: user?._id ?? '', public_key: user?.public_key ?? '', workspace_id: currentWorkspaceId ?? '' },
      { process_id: log.process_id, product_tag: product.tag, limit: 20 },
    );
    const found = response?.data?.logs?.data ?? [];
    const exact = found.find(item => log._id && item._id === log._id);
    if (log.type === 'functions') return functionPayload(exact?.data);
    return exact?.data ?? { payload_unavailable: true,
      reason: 'No retained payload was returned for this exact activity record. Contract publication does not capture execution samples.' };
  };
  return (
    <div className="bg-white rounded-lg border border-grey-400 shadow-sm overflow-hidden">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Inbox className="h-12 w-12 text-grey-400 mb-3" />
          <p className="text-grey-600 font-medium">No {emptyLabel} found</p>
          <p className="text-sm text-grey-500 mt-1">Nothing was recorded for this environment and time window.</p>
        </div>
      ) : (
        <LogList logs={rows} fetchPayload={fetchPayload} />
      )}
    </div>
  );
}

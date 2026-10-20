import { useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  HeartPulse,
  Plus,
  RefreshCw,
  Rocket,
  Settings2,
  Trash2,
  Grid3x3,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { fetchProductObservability } from '@/services/logsServices';
import { describeStatus } from '@/utils/observabilityNarrative';
import { formatLatencyMs, formatThroughput } from '@/utils/functionTraffic';
import {
  attentionItems,
  formatPercent,
  groupCategories,
  setupSteps,
  successRate,
  summarizeHealth,
  type Severity,
} from '@/utils/productOverview';
import { kindLabel, operationOf } from './ProductObservabilityContent';
import { Panel, Pill, StatusDot, type Tone } from './ProductSection';

export interface OverviewCategory {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  count: number;
}

export interface OverviewDeployment {
  id: string;
  name: string;
  version?: string;
  env: string;
  label: string;
  tone: Tone;
  updatedAt: string;
}

export interface OverviewDeployments {
  /** False when the server cannot say (for example it has no deploy support). */
  known: boolean;
  loading: boolean;
  total: number;
  active: number;
  inFlight: number;
  attention: number;
  recent: OverviewDeployment[];
  byEnv: Record<string, { total: number; active: number; attention: number }>;
}

interface Props {
  product: any;
  categories: OverviewCategory[];
  deployments: OverviewDeployments;
  refreshing?: boolean;
  onRefresh: () => void;
  onOpenCategory: (id: string) => void;
  onConnectApp: () => void;
  onAddDatabase: () => void;
  onCreateFeature: () => void;
  onAddEnvironment: () => void;
  onEditEnvironment: (env: any) => void;
  onDeleteProduct: () => void;
}

const PERIODS = [
  { id: '24h', label: '24 hours', ms: 86_400_000 },
  { id: '7d', label: '7 days', ms: 604_800_000 },
  { id: '30d', label: '30 days', ms: 2_592_000_000 },
] as const;
type PeriodId = (typeof PERIODS)[number]['id'];

const SEVERITY: Record<Severity, { icon: ComponentType<{ className?: string }>; tile: string; text: string }> = {
  bad: { icon: AlertTriangle, tile: 'bg-red/10', text: 'text-red' },
  warn: { icon: AlertTriangle, tile: 'bg-orange/10', text: 'text-orange' },
  info: { icon: Rocket, tile: 'bg-primary/10', text: 'text-primary' },
};

const BANNER: Record<'good' | 'warn' | 'bad' | 'neutral', { box: string; icon: string }> = {
  good: { box: 'border-green/30 bg-green/5', icon: 'text-green' },
  warn: { box: 'border-orange/30 bg-orange/5', icon: 'text-orange' },
  bad: { box: 'border-red/30 bg-red/5', icon: 'text-red' },
  neutral: { box: 'border-grey-400 bg-grey-100', icon: 'text-grey-600' },
};

const initials = (name: string) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const envTag = (slug: string) => {
  const value = String(slug || '').toLowerCase();
  if (value.includes('prod') || value === 'live' || value === 'prd') return { label: 'Production', className: 'bg-red/10 text-red' };
  if (value.includes('stag') || value.includes('uat') || value === 'stg') return { label: 'Staging', className: 'bg-orange/10 text-orange' };
  return null;
};

export default function ProductOverview({
  product,
  categories,
  deployments,
  refreshing,
  onRefresh,
  onOpenCategory,
  onConnectApp,
  onAddDatabase,
  onCreateFeature,
  onAddEnvironment,
  onEditEnvironment,
  onDeleteProduct,
}: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const [periodId, setPeriodId] = useState<PeriodId>('24h');
  const period = PERIODS.find(item => item.id === periodId) ?? PERIODS[0];
  const enabled = Boolean(currentWorkspaceId && user?._id && user?.public_key && product?._id && product?.tag);

  // Real operations for this product. Read again whenever the period changes, and when the page is refreshed.
  const pulse = useQuery({
    queryKey: ['product-overview-pulse', currentWorkspaceId, product?._id, product?.tag, periodId],
    queryFn: () => {
      const now = Date.now();
      return fetchProductObservability(currentWorkspaceId!, user!._id, user!.public_key, product.tag, {
        start_date: new Date(now - period.ms).toISOString(),
        end_date: new Date(now).toISOString(),
        page: 1,
        limit: 8,
      } as any);
    },
    enabled,
    staleTime: 30_000,
  });

  const summary = pulse.data?.summary;
  const timeline: any[] = pulse.data?.timeline ?? [];
  const operations: any[] = pulse.data?.operations ?? [];
  const recentOperations: any[] = pulse.data?.logs ?? [];
  const total = Number(summary?.total ?? 0);
  const failures = Number(summary?.failures ?? 0);

  const health = useMemo(() => summarizeHealth(product?.healthchecks), [product?.healthchecks]);
  const countOf = (id: string) => categories.find(category => category.id === id)?.count ?? 0;
  const environments: any[] = (product?.envs ?? []).filter((env: any) => env?.deleted !== true);

  const topFailing = useMemo(() => {
    const worst = [...operations].filter(row => row.failures > 0).sort((a, b) => b.failures - a.failures)[0];
    return worst ? { operation: String(worst.operation || 'unknown'), failures: Number(worst.failures) } : undefined;
  }, [operations]);

  const activity = pulse.data
    ? { total, failures, errorRatePercent: Number(summary?.errorRatePercent ?? 0), topFailing }
    : undefined;

  const attention = useMemo(
    () =>
      attentionItems({
        health,
        activity,
        deployments: deployments.known ? { total: deployments.total, attention: deployments.attention, inFlight: deployments.inFlight } : undefined,
        environments,
        periodLabel: period.label,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [health, pulse.data, deployments.known, deployments.total, deployments.attention, deployments.inFlight, product?.envs, period.label],
  );

  const steps = useMemo(
    () =>
      setupSteps({
        environments: environments.length,
        apps: countOf('apps'),
        databases: countOf('databases'),
        features: countOf('features'),
        functions: countOf('functions'),
        healthchecks: (product?.healthchecks ?? []).filter((check: any) => check?.deleted !== true).length,
        fallbacks: (product?.fallback ?? []).length,
        quotas: (product?.quota ?? []).length,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, product?.envs, product?.healthchecks, product?.fallback, product?.quota],
  );
  const stepsDone = steps.filter(step => step.done).length;

  const narrative = pulse.data
    ? describeStatus({
        total,
        failures,
        errorRatePercent: Number(summary?.errorRatePercent ?? 0),
        topFailing,
        unhealthyChecks: health.problems.length,
        totalChecks: health.total,
        rangeLabel: period.label,
      })
    : undefined;

  const groups = useMemo(() => groupCategories(categories), [categories]);
  const rate = successRate(total, failures);
  const minutes = period.ms / 60_000;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
        {/* Header */}
        <section className="rounded-xl border border-grey-400 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-white sm:h-14 sm:w-14 md:h-16 md:w-16 md:text-xl">
                {product?.logo ? (
                  <img src={product.logo} alt={product.name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  initials(product?.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-xl font-bold text-grey sm:text-2xl">{product?.name}</h1>
                  {product?.status ? <Pill tone={product.status === 'active' ? 'good' : 'neutral'} className="capitalize">{product.status}</Pill> : null}
                </div>
                <code className="mt-1 inline-block break-all rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs text-grey-600">{product?.tag}</code>
                {product?.description ? (
                  <div className="mt-3 max-w-2xl text-sm text-grey-600">
                    <MarkdownViewer content={product.description} />
                  </div>
                ) : null}
                {environments.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {environments.map((env: any) => (
                      <button
                        key={env._id ?? env.slug}
                        type="button"
                        onClick={() => onEditEnvironment(env)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-grey-400 px-2.5 py-1 text-xs text-grey-600 transition-colors hover:border-primary hover:text-grey"
                        title={env.active ? 'Active. Click to edit.' : 'Inactive. Click to edit.'}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', env.active ? 'bg-green' : 'bg-grey-200')} />
                        {env.slug}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={onConnectApp}>
                <Grid3x3 className="h-3.5 w-3.5" />
                Connect app
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={onAddDatabase}>
                <Database className="h-3.5 w-3.5" />
                Add database
              </Button>
              <Button size="sm" className="gap-2" onClick={onCreateFeature}>
                <GitBranch className="h-3.5 w-3.5" />
                Create feature
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </section>

        {/* Setup checklist, until the product has the basics */}
        {stepsDone < steps.length ? (
          <Panel
            title="Get this product set up"
            description={`${stepsDone} of ${steps.length} done`}
            action={
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-grey-100 sm:w-40" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
              </div>
            }
            flush
          >
            <ul className="divide-y divide-grey-300">
              {steps.map(step => (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={step.done}
                    onClick={() => onOpenCategory(step.target)}
                    className={cn('flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5', step.done ? 'cursor-default' : 'hover:bg-grey-100')}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                        step.done ? 'border-green bg-green text-white' : 'border-grey-400 text-transparent',
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-medium', step.done ? 'text-grey-600 line-through' : 'text-grey')}>{step.label}</span>
                      {step.done ? null : <span className="block text-xs text-grey-600">{step.hint}</span>}
                    </span>
                    {step.done ? null : <ArrowRight className="h-4 w-4 flex-shrink-0 text-grey-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {/* How it is doing */}
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-grey sm:text-base">How it is doing</h2>
            <div className="inline-flex rounded-lg border border-grey-400 bg-white p-0.5" role="tablist" aria-label="Period">
              {PERIODS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={periodId === item.id}
                  onClick={() => setPeriodId(item.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    periodId === item.id ? 'bg-primary text-white' : 'text-grey-600 hover:text-grey',
                  )}
                >
                  {item.id}
                </button>
              ))}
            </div>
          </div>

          {pulse.isLoading ? (
            <div className="space-y-3" aria-busy>
              <div className="h-16 animate-pulse rounded-xl bg-grey-100" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-grey-100" />
                ))}
              </div>
            </div>
          ) : pulse.isError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-grey-400 bg-white p-4">
              <p className="text-sm text-grey-600">Activity could not be loaded. The numbers below are not available.</p>
              <Button variant="outline" size="sm" onClick={() => void pulse.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {narrative ? (
                <button
                  type="button"
                  onClick={() => onOpenCategory('observability')}
                  className={cn('flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-shadow hover:shadow-sm', BANNER[narrative.tone].box)}
                >
                  {narrative.tone === 'good' ? (
                    <CheckCircle2 className={cn('mt-0.5 h-5 w-5 flex-shrink-0', BANNER[narrative.tone].icon)} />
                  ) : narrative.tone === 'neutral' ? (
                    <Activity className={cn('mt-0.5 h-5 w-5 flex-shrink-0', BANNER[narrative.tone].icon)} />
                  ) : (
                    <AlertTriangle className={cn('mt-0.5 h-5 w-5 flex-shrink-0', BANNER[narrative.tone].icon)} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-grey sm:text-base">{narrative.title}</span>
                    <span className="mt-0.5 block text-xs text-grey-600 sm:text-sm">{narrative.detail}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-grey-600" />
                </button>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Metric
                  icon={Activity}
                  label="Operations"
                  value={total.toLocaleString()}
                  hint={`in ${period.label}`}
                  onClick={() => onOpenCategory('observability')}
                />
                <Metric
                  icon={CheckCircle2}
                  label="Success rate"
                  value={formatPercent(rate)}
                  hint={failures ? `${failures.toLocaleString()} failed` : total ? 'none failed' : 'no activity'}
                  tone={rate === null ? 'neutral' : failures === 0 ? 'good' : Number(summary?.errorRatePercent ?? 0) >= 10 ? 'bad' : 'warn'}
                  onClick={() => onOpenCategory('observability')}
                />
                <Metric
                  icon={Clock3}
                  label="Response time"
                  value={formatLatencyMs(numberOrNull(summary?.p50LatencyMs))}
                  hint={summary?.p95LatencyMs ? `slowest 5% over ${formatLatencyMs(numberOrNull(summary.p95LatencyMs))}` : 'typical'}
                  onClick={() => onOpenCategory('observability')}
                />
                <Metric
                  icon={Gauge}
                  label="Throughput"
                  value={total ? formatThroughput(total / minutes) : '-'}
                  hint="averaged over the period"
                  onClick={() => onOpenCategory('observability')}
                />
                <Metric
                  icon={HeartPulse}
                  label="Health checks"
                  value={health.total ? `${health.healthy}/${health.total}` : '-'}
                  hint={health.total ? (health.problems.length ? `${health.problems.length} need a look` : 'all healthy') : 'none set up'}
                  tone={health.total === 0 ? 'neutral' : health.down ? 'bad' : health.recovering ? 'warn' : 'good'}
                  onClick={() => onOpenCategory('resilience')}
                />
              </div>
            </>
          )}
        </section>

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          <div className="space-y-4 sm:space-y-5 lg:col-span-2">
            <Panel title="Activity" description="Successful and failed operations, per day." action={<Pill>{period.label}</Pill>}>
              {pulse.isLoading ? (
                <div className="h-56 animate-pulse rounded-lg bg-grey-100" />
              ) : timeline.length ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeline} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={value => format(new Date(`${value}T00:00:00`), 'MMM d')} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="successful" name="Succeeded" stackId="outcome" fill="#00875A" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failures" name="Failed" stackId="outcome" fill="#DC3444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyNote title="No activity in this period" body="Operations show up here once something runs: an action, a feature, a function or a job." />
              )}
            </Panel>

            <Panel
              title="Busiest operations"
              description="What ran most in this period."
              action={
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => onOpenCategory('observability')}>
                  See all
                </button>
              }
              flush
            >
              {operations.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-grey-300 text-[11px] uppercase tracking-wide text-grey-600">
                        <th className="px-4 py-2 font-medium sm:px-5">Operation</th>
                        <th className="px-3 py-2 text-right font-medium">Calls</th>
                        <th className="px-3 py-2 text-right font-medium">Failed</th>
                        <th className="px-4 py-2 text-right font-medium sm:px-5">Average</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-grey-300">
                      {[...operations]
                        .sort((a, b) => b.calls - a.calls)
                        .slice(0, 6)
                        .map((row, index) => (
                          <tr key={`${row.type}:${row.operation}:${index}`}>
                            <td className="px-4 py-2.5 sm:px-5">
                              <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{row.operation}</code>
                              <span className="ml-2 text-xs text-grey-600">{kindLabel(row.type)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-grey">{Number(row.calls).toLocaleString()}</td>
                            <td className={cn('px-3 py-2.5 text-right tabular-nums', row.failures ? 'font-medium text-red' : 'text-grey-600')}>
                              {row.failures ? `${Number(row.failures).toLocaleString()} (${formatErrorRate(row.errorRatePercent)})` : '0'}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-grey-600 sm:px-5">{formatLatencyMs(numberOrNull(row.averageLatencyMs))}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyNote title="Nothing has run yet" body="The operations that run most will be listed here, with how often they fail." />
                </div>
              )}
            </Panel>
          </div>

          {/* On large screens this column is exactly as tall as Activity plus Busiest operations; what does not
              fit scrolls inside its card. Stacked on small screens, so the lists just have a sensible maximum. */}
          <div className="relative">
            <div className="flex flex-col gap-4 sm:gap-5 lg:absolute lg:inset-0">
            <Panel
              title="Needs attention"
              description={attention.length ? `${attention.length} to look at` : undefined}
              flush={attention.length > 0}
              className="flex min-h-0 flex-col lg:flex-1"
              bodyClassName="min-h-0 max-h-80 flex-1 overflow-y-auto lg:max-h-none"
            >
              {attention.length ? (
                <ul className="divide-y divide-grey-300">
                  {attention.map(item => {
                    const style = SEVERITY[item.severity];
                    const Icon = style.icon;
                    return (
                      <li key={item.id}>
                        <button type="button" onClick={() => onOpenCategory(item.target)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-grey-100 sm:px-5">
                          <span className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', style.tile)}>
                            <Icon className={cn('h-4 w-4', style.text)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-grey">{item.title}</span>
                            {item.detail ? <span className="mt-0.5 block text-xs text-grey-600">{item.detail}</span> : null}
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-grey-600" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green/10">
                    <CheckCircle2 className="h-4 w-4 text-green" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-grey">All clear</p>
                    <p className="mt-0.5 text-xs text-grey-600">No failing health checks, no deployments needing attention and no spike in errors.</p>
                  </div>
                </div>
              )}
            </Panel>

            <Panel
              title="Environments"
              className="flex min-h-0 flex-col lg:max-h-[45%] lg:flex-shrink-0"
              bodyClassName="min-h-0 max-h-72 flex-1 overflow-y-auto lg:max-h-none"
              description={`${environments.length} ${environments.length === 1 ? 'environment' : 'environments'}`}
              action={
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onAddEnvironment}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              }
              flush={environments.length > 0}
            >
              {environments.length ? (
                <ul className="divide-y divide-grey-300">
                  {environments.map((env: any) => {
                    const tag = envTag(env.slug);
                    const deployed = deployments.byEnv[env.slug];
                    const envHealth = summarizeHealth(
                      (product?.healthchecks ?? []).map((check: any) => ({ ...check, envs: (check.envs ?? []).filter((item: any) => item.slug === env.slug) })),
                    );
                    return (
                      <li key={env._id ?? env.slug}>
                        <button type="button" onClick={() => onEditEnvironment(env)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-grey-100 sm:px-5">
                          <StatusDot tone={env.active ? 'good' : 'neutral'} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-grey">{env.env_name || env.name || env.slug}</span>
                              {tag ? <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tag.className)}>{tag.label}</span> : null}
                            </span>
                            <span className="text-xs text-grey-600">{env.slug}{env.active ? '' : ' (inactive)'}</span>
                          </span>
                          {envHealth.problems.length ? (
                            <Pill tone="bad">
                              <HeartPulse className="h-3 w-3" />
                              {envHealth.problems.length}
                            </Pill>
                          ) : null}
                          {deployed && deployed.total > 0 ? (
                            <Pill tone={deployed.attention > 0 ? 'bad' : 'neutral'} className="flex-shrink-0">
                              <Rocket className="h-3 w-3" />
                              {deployed.total}
                            </Pill>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyNote title="No environments yet" body="Add dev, staging and production so the product has somewhere to run." />
              )}
            </Panel>
            </div>
          </div>
        </div>

        {/* What is in the product */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-grey sm:text-base">What is in this product</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {groups.map(group => (
              <Panel key={group.id} title={group.title} description={group.description} flush>
                <ul className="divide-y divide-grey-300">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button type="button" onClick={() => onOpenCategory(item.id)} className="group flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-grey-100 sm:px-5">
                          <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', item.bgColor)}>
                            <Icon className={cn('h-4 w-4', item.color)} />
                          </span>
                          <span className={cn('min-w-0 flex-1 truncate text-sm', item.count ? 'font-medium text-grey' : 'text-grey-600')}>{item.label}</span>
                          {item.count ? (
                            <span className="rounded-full bg-grey-100 px-2 py-0.5 text-xs font-medium tabular-nums text-grey">{item.count}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-grey-600 opacity-0 transition-opacity group-hover:opacity-100">
                              <Plus className="h-3 w-3" />
                              Add
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
          </div>
        </section>

        {/* What happened lately */}
        <Panel
          title="Recently"
          description="Latest operations and deployments."
          action={
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => onOpenCategory('observability')}>
              Open observability
            </button>
          }
          flush
        >
          {deployments.recent.length === 0 && recentOperations.length === 0 ? (
            <div className="p-5">
              <EmptyNote title="Nothing yet" body="Deployments and operations will be listed here as they happen." />
            </div>
          ) : (
            <ul className="divide-y divide-grey-300">
              {deployments.recent.map(item => (
                <li key={`deployment:${item.id}`}>
                  <button type="button" onClick={() => onOpenCategory('deployments')} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-grey-100 sm:px-5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Rocket className="h-4 w-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-grey">
                      {item.name}
                      {item.version ? ` ${item.version}` : ''} in {item.env}
                    </span>
                    <Pill tone={item.tone}>{item.label}</Pill>
                    <time className="hidden w-24 flex-shrink-0 text-right text-xs text-grey-600 sm:block">{ago(item.updatedAt)}</time>
                  </button>
                </li>
              ))}
              {recentOperations.slice(0, 6).map((row, index) => {
                const failed = row?.failed_execution === true || /fail/i.test(String(row?.status || ''));
                return (
                  <li key={String(row._id ?? row.process_id ?? index)}>
                    <button type="button" onClick={() => onOpenCategory('observability')} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-grey-100 sm:px-5">
                      <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', failed ? 'bg-red/10' : 'bg-green/10')}>
                        {failed ? <AlertTriangle className="h-4 w-4 text-red" /> : <CheckCircle2 className="h-4 w-4 text-green" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <code className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{operationOf(row)}</code>
                          <span className="hidden text-xs text-grey-600 sm:inline">{kindLabel(row.type || row.component)}</span>
                        </span>
                        {row.message || row.name ? <span className="mt-0.5 block truncate text-xs text-grey-600">{row.message || row.name}</span> : null}
                      </span>
                      <time className="w-24 flex-shrink-0 text-right text-xs text-grey-600">{ago(row.timestamp)}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Settings and danger */}
        <details className="group rounded-xl border border-grey-400 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-grey-600 hover:text-grey sm:px-5">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-grey-300 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-red">Delete this product</h3>
            <p className="mb-3 mt-1 text-xs text-grey-600 sm:text-sm">Permanently delete this product and all of its resources. This cannot be undone.</p>
            <Button variant="outline" className="gap-2 border-red/40 text-red hover:bg-red/10 hover:text-red" onClick={onDeleteProduct}>
              <Trash2 className="h-4 w-4" />
              Delete product
            </Button>
          </div>
        </details>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
}) {
  const valueColor: Record<Tone, string> = {
    good: 'text-green',
    bad: 'text-red',
    warn: 'text-orange',
    info: 'text-primary',
    neutral: 'text-grey',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-grey-400 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary"
    >
      <span className="flex items-center gap-2 text-xs font-medium text-grey-600">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={cn('mt-2 block text-2xl font-bold tabular-nums', valueColor[tone])}>{value}</span>
      {hint ? <span className="mt-0.5 block truncate text-xs text-grey-600">{hint}</span> : null}
    </button>
  );
}

function EmptyNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm font-medium text-grey">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-grey-600">{body}</p>
    </div>
  );
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatErrorRate(percent: unknown): string {
  const value = Number(percent);
  if (!Number.isFinite(value)) return '';
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`;
}

function ago(value: unknown): string {
  const date = value ? new Date(value as string) : null;
  return date && !Number.isNaN(date.getTime()) ? formatDistanceToNow(date, { addSuffix: true }) : '';
}

import { AlertTriangle, CheckCircle2, Gauge, HeartPulse, Loader2, RefreshCw, ScrollText, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Panel, Pill, type Tone } from '@/components/tabs/ProductSection';
import { usePlatformHealth } from '@/hooks/usePlatformHealth';
import ResourceUsage, { ProductUsage } from '@/components/dashboard/ResourceUsage';
import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, countStatuses, formatCount, formatDuration, formatPercent, logsFilterFor,
  orderSystems, sparkBars, summarize, timeAgo, type IHealthAlert, type IInventoryItem, type IPlatformHealth, type ISystemHealth,
} from '@/utils/platformHealth';

const bannerStyle: Record<Tone, string> = {
  good: 'border-green/30 bg-green/5',
  warn: 'border-orange/30 bg-orange/5',
  bad: 'border-red/30 bg-red/5',
  info: 'border-primary/30 bg-primary/5',
  neutral: 'border-grey-400 bg-grey-100',
};
const barColor: Record<ISystemHealth['status'], string> = { healthy: 'bg-primary/60', degraded: 'bg-orange/70', down: 'bg-red/70', idle: 'bg-grey-400' };
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-grey-400 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs text-grey-600 sm:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-grey sm:text-2xl">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-grey-600 sm:text-xs">{sub}</p> : null}
    </div>
  );
}

function Spark({ system }: { system: ISystemHealth }) {
  const bars = sparkBars(system.timeline);
  if (bars.length === 0) return <div className="h-8" />;
  return (
    <div className="flex h-8 items-end gap-px" role="img" aria-label={`Calls over time for ${system.label}`}>
      {bars.map((bar, index) => (
        <div key={index} className="relative flex-1 self-stretch">
          <div className={cn('absolute bottom-0 w-full rounded-sm', barColor[system.status])} style={{ height: `${bar.height * 100}%` }} />
          {bar.failedHeight > 0 ? <div className="absolute bottom-0 w-full rounded-sm bg-red" style={{ height: `${bar.failedHeight * 100}%` }} /> : null}
        </div>
      ))}
    </div>
  );
}

function SystemCard({ system, onOpen }: { system: ISystemHealth; onOpen: (system: ISystemHealth, failures: boolean) => void }) {
  const { current, previous } = system;
  const failing = current.failures > 0;
  return (
    <div className="flex flex-col rounded-xl border border-grey-400 bg-white p-3 shadow-sm sm:p-4" data-testid={`system-${system.id}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-grey">{system.label}</p>
        <Pill tone={STATUS_TONE[system.status]}>{STATUS_LABEL[system.status]}</Pill>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-lg font-bold tabular-nums text-grey">{formatCount(current.total)}</p>
          <p className="text-[11px] text-grey-600">calls</p>
        </div>
        <div>
          <p className={cn('text-lg font-bold tabular-nums', failing ? 'text-red' : 'text-grey')}>{formatPercent(current.errorRatePercent)}</p>
          <p className="text-[11px] text-grey-600">errors</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-grey">{formatDuration(current.p95LatencyMs)}</p>
          <p className="text-[11px] text-grey-600">p95</p>
        </div>
      </div>
      <div className="mt-3"><Spark system={system} /></div>
      <p className="mt-2 text-[11px] text-grey-600">
        p50 {formatDuration(current.p50LatencyMs)} · p99 {formatDuration(current.p99LatencyMs)} · slowest {formatDuration(current.maxLatencyMs)}
      </p>
      {system.topErrors[0] ? (
        <p className="mt-2 truncate rounded-md bg-red/5 px-2 py-1 text-[11px] text-red" title={system.topErrors[0].message}>
          {formatCount(system.topErrors[0].count)}x {system.topErrors[0].message}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="h-7 flex-1 gap-1 px-2 text-xs" onClick={() => onOpen(system, false)}>
          <ScrollText className="h-3 w-3" />Logs
        </Button>
        {failing ? (
          <Button variant="outline" size="sm" className="h-7 flex-1 gap-1 px-2 text-xs text-red" onClick={() => onOpen(system, true)}>
            <XCircle className="h-3 w-3" />Failures
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AlertRow({ alert, onOpen }: { alert: IHealthAlert; onOpen: () => void }) {
  const Icon = alert.severity === 'info' ? HeartPulse : AlertTriangle;
  const tone = SEVERITY_TONE[alert.severity];
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-grey-100">
      <Icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', tone === 'bad' ? 'text-red' : tone === 'warn' ? 'text-orange' : 'text-primary')} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-grey">{alert.title}</p>
          <Pill tone={tone}>{SEVERITY_LABEL[alert.severity]}</Pill>
        </div>
        <p className="mt-0.5 text-xs text-grey-600">{alert.detail}</p>
      </div>
    </button>
  );
}

export interface PlatformHealthProps {
  workspaceId: string;
  userId: string;
  publicKey: string;
  timeRange: string;
  productTag?: string;
  appId?: string;
  rangeLabel: string;
  /** How many databases, buckets, caches and queues exist, from the workspace dashboard. */
  inventory?: IInventoryItem[];
}

export default function PlatformHealth({ workspaceId, userId, publicKey, timeRange, productTag, appId, rangeLabel, inventory = [] }: PlatformHealthProps) {
  const { setLogsFilters, openLogsTab, setActiveIconSidebar } = useWorkbenchStore();
  const { data, isLoading, error, refetch, isFetching } = usePlatformHealth({ workspaceId, userId, publicKey, timeRange, productTag, appId });

  const openLogs = (system: ISystemHealth | undefined, failuresOnly: boolean) => {
    setLogsFilters({ ...logsFilterFor(system, failuresOnly), timeRange, product: productTag ?? 'all', app: appId ?? 'all', searchTerm: '', startDate: '', endDate: '' });
    setActiveIconSidebar('logs');
    openLogsTab();
  };

  if (isLoading) {
    return (
      <Panel title="Platform health">
        <div className="flex items-center gap-2 py-6 text-sm text-grey-600"><Loader2 className="h-4 w-4 animate-spin text-primary" />Reading the state of every system...</div>
      </Panel>
    );
  }
  // Only when there is nothing to show. A refresh that fails keeps the last good answer on screen and says so below.
  if (!data) {
    return (
      <Panel title="Platform health" action={<Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-2 text-xs"><RefreshCw className="h-3 w-3" />Try again</Button>}>
        <p className="py-4 text-sm text-grey-600">The state of your systems could not be loaded. {error instanceof Error ? error.message : ''}</p>
      </Panel>
    );
  }

  const summary = summarize(data);
  const counts = countStatuses(data.systems);
  const active = orderSystems(data.systems.filter((system) => system.status !== 'idle'));
  const idle = data.systems.filter((system) => system.status === 'idle');
  const { current, previous } = data.overall;
  const SummaryIcon = summary.tone === 'good' ? CheckCircle2 : summary.tone === 'neutral' ? HeartPulse : AlertTriangle;

  return (
    <section className="space-y-4 sm:space-y-5" aria-label="Platform health" data-testid="platform-health">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-grey sm:text-lg">Platform health</h2>
          <p className="text-xs text-grey-600">
            Every system, {rangeLabel.toLowerCase()}, compared with the period before. Updated {new Date(data.generatedAt).toLocaleTimeString()}.
            {error ? <span className="ml-1 text-orange">The last refresh failed, so this may be out of date.</span> : null}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-2 px-2 text-xs sm:px-3" aria-label="Refresh platform health">
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      <div className={cn('flex items-start gap-3 rounded-xl border p-4', bannerStyle[summary.tone])}>
        <SummaryIcon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', summary.tone === 'good' ? 'text-green' : summary.tone === 'bad' ? 'text-red' : summary.tone === 'warn' ? 'text-orange' : 'text-grey-600')} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-grey sm:text-base">{summary.title}</p>
          <p className="mt-0.5 text-xs text-grey-600 sm:text-sm">{summary.detail}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Calls" value={formatCount(current.total)} sub={`${formatCount(current.failures)} failed`} />
        <Tile label="Error rate" value={formatPercent(current.errorRatePercent)} sub={`${formatCount(previous.failures)} failed before`} />
        <Tile label="p95 latency" value={formatDuration(current.p95LatencyMs)} sub={`p50 ${formatDuration(current.p50LatencyMs)} · p99 ${formatDuration(current.p99LatencyMs)}`} />
        <Tile label="Systems" value={`${counts.healthy + counts.degraded + counts.down} active`} sub={`${counts.healthy} healthy · ${counts.degraded} degraded · ${counts.down} failing`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <Panel
          title="Alerts"
          description={data.alerts.length === 0 ? undefined : `${data.alerts.length} ${data.alerts.length === 1 ? 'thing needs' : 'things need'} a look`}
          flush
          action={<Gauge className="h-4 w-4 text-grey-600" />}
        >
          {data.alerts.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-grey-600"><CheckCircle2 className="h-4 w-4 text-green" />No alerts. Every system is inside its error and latency limits.</div>
          ) : (
            <div className="divide-y divide-grey-400">
              {data.alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onOpen={() => openLogs(data.systems.find((system) => system.id === alert.system), alert.id.endsWith(':errors') || alert.id.endsWith(':errors-rising'))} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Latest errors" description={data.recentErrors.length === 0 ? undefined : 'Newest first. Open one to see the logs behind it.'} flush action={<XCircle className="h-4 w-4 text-grey-600" />}>
          {data.recentErrors.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-grey-600"><CheckCircle2 className="h-4 w-4 text-green" />Nothing has failed in this period.</div>
          ) : (
            <div className="max-h-[22rem] divide-y divide-grey-400 overflow-y-auto">
              {data.recentErrors.map((error) => (
                <button key={error.id} type="button" onClick={() => openLogs(data.systems.find((system) => system.id === error.system), true)} className="block w-full px-4 py-2.5 text-left hover:bg-grey-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-grey">{error.systemLabel}{error.operation ? ` · ${error.operation}` : ''}</p>
                    <span className="flex-shrink-0 text-[11px] text-grey-600">{timeAgo(error.at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-red" title={error.message}>{error.message}</p>
                  {error.product ? <p className="mt-0.5 text-[11px] text-grey-600">{error.product}{error.env ? ` · ${error.env}` : ''}</p> : null}
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {active.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {active.map((system) => <SystemCard key={system.id} system={system} onOpen={openLogs} />)}
        </div>
      ) : null}
      {idle.length > 0 && active.length > 0 ? (
        <p className="text-xs text-grey-600">No activity in this period: {idle.map((system) => system.label).join(', ')}.</p>
      ) : null}

      <ResourceUsage health={data} inventory={inventory} rangeLabel={rangeLabel} />
      <ProductUsage rows={data.products} totalCalls={current.total} rangeLabel={rangeLabel} />
    </section>
  );
}

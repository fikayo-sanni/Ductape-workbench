import { BarChart3, Gauge, Package, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/tabs/ProductSection';
import {
  formatCount,
  formatDuration,
  formatPercent,
  productDisplayName,
  sparkBars,
  type HealthTone,
  type IPlatformHealth,
} from '@/utils/platformHealth';
import { aggregateTimeline, busiestBucket, periodTiles, productShares, slowestOperations, topOperations, type IOperationRow } from '@/utils/metricsOverview';

const deltaColor: Record<HealthTone, string> = { good: 'text-green', bad: 'text-red', warn: 'text-orange', info: 'text-primary', neutral: 'text-grey-600' };
const valueColor: Record<HealthTone, string> = { good: 'text-grey', bad: 'text-red', warn: 'text-orange', info: 'text-grey', neutral: 'text-grey' };

function bucketLabel(date: string, bucket: IPlatformHealth['window']['bucket']): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return bucket === 'hour'
    ? parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function OperationList({ rows, emptyText, metric }: { rows: IOperationRow[]; emptyText: string; metric: 'calls' | 'p95' }) {
  if (rows.length === 0) return <p className="px-4 py-6 text-sm text-grey-600">{emptyText}</p>;
  return (
    <ul className="divide-y divide-grey-300">
      {rows.map((row) => (
        <li key={`${row.systemId}:${row.name}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-grey" title={row.name}>{row.name || 'Unnamed'}</p>
            <p className="truncate text-xs text-grey-600">{row.systemLabel}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-grey">{metric === 'calls' ? formatCount(row.calls) : formatDuration(row.p95LatencyMs)}</p>
            <p className={cn('text-[11px] tabular-nums', row.failures > 0 ? 'text-red' : 'text-grey-600')}>
              {metric === 'calls' ? (row.failures > 0 ? `${formatPercent(row.errorRatePercent)} failing` : `${formatDuration(row.avgLatencyMs)} avg`) : `${formatCount(row.calls)} calls`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The usage numbers for the period: how many calls, how many worked, how fast, and how each moved since the period before, then
 * calls over time, which products carry the traffic and which operations are busiest and slowest. All of it comes from the
 * platform health read the rest of the dashboard already uses.
 */
export default function MetricsOverview({ health, rangeLabel }: { health: IPlatformHealth; rangeLabel: string }) {
  const tiles = periodTiles(health.overall);
  const line = aggregateTimeline(health.systems);
  const bars = sparkBars(line);
  const busiest = busiestBucket(line);
  const products = productShares(health.products, health.overall.current.total);
  const busy = topOperations(health.systems);
  const slow = slowestOperations(health.systems);

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="metrics-overview">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {tiles.map((tile) => (
          <div key={tile.id} className="rounded-xl border border-grey-400 bg-white p-3 shadow-sm sm:p-4" data-testid={`metric-${tile.id}`}>
            <p className="text-xs text-grey-600 sm:text-sm">{tile.label}</p>
            <p className={cn('mt-1 text-xl font-bold tabular-nums sm:text-2xl', valueColor[tile.tone ?? 'neutral'])}>{tile.value}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-grey-600 sm:text-xs">
              {tile.delta && tile.delta.direction !== 'none' ? <span className={cn('font-medium', deltaColor[tile.delta.tone])}>{tile.delta.text}</span> : null}
              {tile.sub ? <span>{tile.sub}</span> : null}
            </div>
          </div>
        ))}
      </div>

      <Panel
        title="Calls over time"
        description={busiest ? `${rangeLabel}. Busiest: ${bucketLabel(busiest.date, health.window.bucket)} with ${formatCount(busiest.count)} calls${busiest.failures > 0 ? `, ${formatCount(busiest.failures)} failed` : ''}.` : rangeLabel}
        action={<BarChart3 className="h-4 w-4 text-grey-600" />}
      >
        {bars.length === 0 || !busiest ? (
          <p className="py-8 text-center text-sm text-grey-600">No calls in this period.</p>
        ) : (
          <div>
            <div className="flex h-32 items-end gap-px" role="img" aria-label="Calls over time, with failures marked in red">
              {bars.map((bar, index) => (
                <div key={index} className="relative flex-1 self-stretch" title={`${bucketLabel(line[index].date, health.window.bucket)}: ${formatCount(line[index].count)} calls${line[index].failures ? `, ${formatCount(line[index].failures)} failed` : ''}`}>
                  <div className="absolute bottom-0 w-full rounded-sm bg-primary/60" style={{ height: `${bar.height * 100}%` }} />
                  {bar.failedHeight > 0 ? <div className="absolute bottom-0 w-full rounded-sm bg-red" style={{ height: `${bar.failedHeight * 100}%` }} /> : null}
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-grey-600">
              <span>{bucketLabel(line[0].date, health.window.bucket)}</span>
              <span>{bucketLabel(line[line.length - 1].date, health.window.bucket)}</span>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Usage by product" description={`Share of calls, ${rangeLabel.toLowerCase()}.`} flush action={<Package className="h-4 w-4 text-grey-600" />}>
        {products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-grey-600">No product made calls in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-grey-300 text-xs text-grey-600">
                  <th className="px-4 py-2 font-medium" scope="col">Product</th>
                  <th className="px-4 py-2 font-medium" scope="col">Calls</th>
                  <th className="px-4 py-2 font-medium" scope="col">Failing</th>
                  <th className="px-4 py-2 font-medium" scope="col">Avg latency</th>
                  <th className="px-4 py-2 font-medium" scope="col">p95 latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-300">
                {products.map((product) => (
                  <tr key={product.name}>
                    <td className="px-4 py-2.5 font-medium text-grey">{productDisplayName(product.name)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-14 tabular-nums text-grey">{formatCount(product.calls)}</span>
                        <div className="h-1.5 w-24 rounded-full bg-grey-200"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${product.share}%` }} /></div>
                        <span className="text-xs tabular-nums text-grey-600">{formatPercent(product.share)}</span>
                      </div>
                    </td>
                    <td className={cn('px-4 py-2.5 tabular-nums', product.failures > 0 ? 'text-red' : 'text-grey-600')}>{product.failures > 0 ? `${formatCount(product.failures)} (${formatPercent(product.errorRatePercent)})` : '0'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-grey">{formatDuration(product.avgLatencyMs)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-grey">{formatDuration(product.p95LatencyMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <Panel title="Busiest operations" description="Most calls, across every system." flush action={<Gauge className="h-4 w-4 text-grey-600" />}>
          <OperationList rows={busy} metric="calls" emptyText="No operations ran in this period." />
        </Panel>
        <Panel title="Slowest operations" description="By p95 latency, with at least 5 calls." flush action={<Timer className="h-4 w-4 text-grey-600" />}>
          <OperationList rows={slow} metric="p95" emptyText="Nothing has enough calls to rank yet." />
        </Panel>
      </div>
    </div>
  );
}

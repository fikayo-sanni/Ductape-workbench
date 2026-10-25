import { Hammer, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/tabs/ProductSection';
import { useInfraSummaryData } from '@/hooks/useInfraSummary';
import { summarizeDelivery } from '@/utils/deliveryMetrics';
import { formatCount, formatDuration, formatPercent, timeAgo } from '@/utils/platformHealth';

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl border border-grey-400 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs text-grey-600 sm:text-sm">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums sm:text-2xl', tone === 'bad' ? 'text-red' : tone === 'warn' ? 'text-orange' : tone === 'good' ? 'text-green' : 'text-grey')}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-grey-600 sm:text-xs">{sub}</p> : null}
    </div>
  );
}

/** How releases are going: whether builds succeed and how long they take, how often a deployment is rolled back, when something last went out, and which products ship most. */
export default function DeliveryMetrics() {
  const { deployments, builds } = useInfraSummaryData();
  const deployList = Array.isArray(deployments.data) ? deployments.data : [];
  const buildList = Array.isArray(builds.data) ? builds.data : [];
  // Nothing to say until either has loaded and something exists; the summaries above explain the empty and failed states.
  if (deployments.isLoading || builds.isLoading || (deployList.length === 0 && buildList.length === 0)) return null;
  const delivery = summarizeDelivery(deployList, buildList);

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="delivery-metrics">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Tile
          label="Build success rate"
          value={delivery.buildSuccessRate === null ? '-' : formatPercent(delivery.buildSuccessRate)}
          sub={delivery.finishedBuilds > 0 ? `${formatCount(delivery.finishedBuilds)} finished builds` : 'No build has finished yet'}
          tone={delivery.buildSuccessRate === null ? undefined : delivery.buildSuccessRate < 80 ? 'bad' : delivery.buildSuccessRate < 95 ? 'warn' : 'good'}
        />
        <Tile label="Average build time" value={formatDuration(delivery.avgBuildMs)} sub={delivery.slowestBuildMs !== null ? `slowest ${formatDuration(delivery.slowestBuildMs)}` : undefined} />
        <Tile label="Builds this week" value={formatCount(delivery.buildsThisWeek)} />
        <Tile
          label="Rolled back"
          value={delivery.rollbackRate === null ? '-' : formatPercent(delivery.rollbackRate)}
          sub={delivery.rolledBack > 0 ? `${formatCount(delivery.rolledBack)} of ${formatCount(deployList.length)} deployments` : undefined}
          tone={delivery.rolledBack > 0 ? 'warn' : undefined}
        />
        <Tile
          label="Last deployed"
          value={delivery.lastDeployedAt ? timeAgo(delivery.lastDeployedAt) : '-'}
          sub={delivery.partialTraffic > 0 ? `${delivery.partialTraffic} taking part of the traffic` : undefined}
        />
      </div>

      {delivery.byProduct.length > 0 ? (
        <Panel title="Deployments by product" description="Which products ship most, and which have something to look at." flush action={<Package className="h-4 w-4 text-grey-600" />}>
          <ul className="divide-y divide-grey-300">
            {delivery.byProduct.map((row) => (
              <li key={row.product} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 truncate text-sm font-medium text-grey">{row.product}</p>
                <p className="flex-shrink-0 text-xs tabular-nums text-grey-600">
                  {row.total} {row.total === 1 ? 'deployment' : 'deployments'}, {row.active} active
                  {row.attention > 0 ? <span className="text-red">, {row.attention} to check</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel title="Deployments by product" action={<Hammer className="h-4 w-4 text-grey-600" />}>
          <p className="text-sm text-grey-600">Builds exist but nothing has been deployed yet.</p>
        </Panel>
      )}
    </div>
  );
}

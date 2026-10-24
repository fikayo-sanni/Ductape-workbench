import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, Pill } from '@/components/tabs/ProductSection';
import {
  STATUS_LABEL, STATUS_TONE, formatCost, formatCount, formatDuration, formatPercent, productDisplayName, provisionedFor, shareOfCalls, usageDetail, WORKSPACE_PRODUCT_LABEL,
  type IBreakdownRow, type IInventoryItem, type IPlatformHealth, type ISystemHealth,
} from '@/utils/platformHealth';

function Breakdown({ title, rows, empty, productNames }: { title: string; rows: IBreakdownRow[]; empty: string; productNames?: boolean }) {
  const hasCost = rows.some((row) => row.cost > 0);
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-grey-600">{empty}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-grey-600">
              <th className="py-1 pr-2 font-medium">Name</th>
              <th className="px-2 py-1 text-right font-medium">Calls</th>
              <th className="px-2 py-1 text-right font-medium">Errors</th>
              <th className="px-2 py-1 text-right font-medium">Avg</th>
              <th className={cn('py-1 pl-2 text-right font-medium', hasCost && 'px-2')}>p95</th>
              {hasCost ? <th className="py-1 pl-2 text-right font-medium">Cost</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-grey-400/60">
                <td className="max-w-[10rem] truncate py-1.5 pr-2 text-grey" title={row.name}>{productNames ? productDisplayName(row.name) : row.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCount(row.calls)}</td>
                <td className={cn('px-2 py-1.5 text-right tabular-nums', row.failures > 0 && 'text-red')}>{formatPercent(row.errorRatePercent)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatDuration(row.avgLatencyMs)}</td>
                <td className={cn('py-1.5 text-right tabular-nums', hasCost ? 'px-2' : 'pl-2')}>{formatDuration(row.p95LatencyMs)}</td>
                {hasCost ? <td className="py-1.5 pl-2 text-right tabular-nums">{formatCost(row.cost)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * What each kind of resource is used for: how many exist, how much they were called, how well, how fast, what that cost, and the one thing
 * particular to it (data written, cache hit rate, calls over the plan). Open a row to see which operations and products make up the use.
 */
export default function ResourceUsage({ health, inventory, rangeLabel }: { health: IPlatformHealth; inventory: IInventoryItem[]; rangeLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const totalCalls = health.overall.current.total;
  // A usage table: the most used first, whatever their state (the status pill says how each is doing).
  const rows = [...health.systems].sort((a, b) => b.current.total - a.current.total || a.label.localeCompare(b.label));
  const used = rows.filter((system) => system.current.total > 0 || provisionedFor(system.id, inventory));
  // A column nothing has data for is not shown.
  const hasCost = used.some((system) => system.current.cost > 0);
  const hasUsage = used.some((system) => usageDetail(system) !== '');

  return (
    <Panel
      title="Resource usage"
      description={`How each kind of resource was used, ${rangeLabel.toLowerCase()}.`}
      flush
      action={<Database className="h-4 w-4 text-grey-600" />}
    >
      {used.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Database className="mb-2 h-10 w-10 text-grey-600" />
          <p className="text-sm font-medium text-grey-600">No resource data available</p>
          <p className="mt-1 px-4 text-center text-xs text-grey-600">Usage appears here once products start using their resources.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm" data-testid="resource-usage">
            <thead>
              <tr className="border-b border-grey-400 text-left text-xs text-grey-600">
                <th className="w-8 px-3 py-2" />
                <th className="px-2 py-2 font-medium">Resource</th>
                <th className="px-2 py-2 font-medium">Calls</th>
                <th className="px-2 py-2 text-right font-medium">Errors</th>
                <th className="px-2 py-2 text-right font-medium">Avg</th>
                <th className="px-2 py-2 text-right font-medium">p95</th>
                {hasCost ? <th className="px-2 py-2 text-right font-medium">Cost</th> : null}
                {hasUsage ? <th className="px-4 py-2 font-medium">Usage</th> : null}
              </tr>
            </thead>
            <tbody>
              {used.map((system: ISystemHealth) => {
                const provisioned = provisionedFor(system.id, inventory);
                const share = shareOfCalls(system.current.total, totalCalls);
                const expanded = open === system.id;
                return (
                  <Fragment key={system.id}>
                    <tr className="cursor-pointer border-b border-grey-400/60 hover:bg-grey-100" onClick={() => setOpen(expanded ? null : system.id)}>
                      <td className="px-3 py-3 text-grey-600">
                        <button type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} what makes up ${system.label}`}>
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-grey">{system.label}</span>
                          <Pill tone={STATUS_TONE[system.status]}>{STATUS_LABEL[system.status]}</Pill>
                        </div>
                        {provisioned ? <p className="mt-0.5 text-[11px] text-grey-600">{formatCount(provisioned.count)} {provisioned.name.toLowerCase()}</p> : null}
                      </td>
                      <td className="min-w-[9rem] px-2 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="tabular-nums font-medium text-grey">{formatCount(system.current.total)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-grey-100" title={`${formatPercent(share)} of all calls`}>
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(share, system.current.total > 0 ? 2 : 0)}%` }} />
                        </div>
                      </td>
                      <td className={cn('px-2 py-3 text-right tabular-nums', system.current.failures > 0 && 'text-red')}>
                        {system.current.total > 0 ? formatPercent(system.current.errorRatePercent) : '-'}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatDuration(system.current.avgLatencyMs)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatDuration(system.current.p95LatencyMs)}</td>
                      {hasCost ? <td className="px-2 py-3 text-right tabular-nums">{formatCost(system.current.cost)}</td> : null}
                      {hasUsage ? <td className="px-4 py-3 text-xs text-grey-600">{usageDetail(system) || '-'}</td> : null}
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-grey-400/60 bg-grey-100/60">
                        <td />
                        <td colSpan={5 + (hasCost ? 1 : 0) + (hasUsage ? 1 : 0)} className="px-2 py-4 pr-4">
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <Breakdown title="Busiest operations" rows={system.topOperations} empty="No calls in this period." />
                            <Breakdown title="Used by product" rows={system.topProducts} empty="No calls in this period." productNames />
                          </div>
                          {system.topErrors.length > 0 ? (
                            <div className="mt-4">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">Most common errors</p>
                              <ul className="space-y-1">
                                {system.topErrors.map((error) => (
                                  <li key={error.message} className="flex items-start justify-between gap-3 text-xs">
                                    <span className="min-w-0 truncate text-red" title={error.message}>{error.message}</span>
                                    <span className="flex-shrink-0 tabular-nums text-grey-600">{formatCount(error.count)}x</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Products ranked by how much they used the platform, across every system. Requests tied to no product are the workspace's own. */
export function ProductUsage({ rows, totalCalls, rangeLabel }: { rows: IBreakdownRow[]; totalCalls: number; rangeLabel: string }) {
  const hasCost = rows.some((row) => row.cost > 0);
  return (
    <Panel title="Usage by product" description={`Which products used the platform most, ${rangeLabel.toLowerCase()}. The workspace is requests not tied to a product.`} flush>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-grey-600">Nothing has made a call in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-grey-400 text-left text-xs text-grey-600">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Calls</th>
                <th className="px-2 py-2 text-right font-medium">Errors</th>
                <th className="px-2 py-2 text-right font-medium">Avg latency</th>
                <th className={cn('py-2 text-right font-medium', hasCost ? 'px-2' : 'px-4')}>p95 latency</th>
                {hasCost ? <th className="px-4 py-2 text-right font-medium">Cost</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name || WORKSPACE_PRODUCT_LABEL} className="border-b border-grey-400/60">
                  <td className="max-w-[14rem] truncate px-4 py-2.5 font-medium text-grey" title={row.name === '' ? 'Requests tied to the workspace, not to a product' : row.name}>{productDisplayName(row.name)}</td>
                  <td className="min-w-[9rem] px-2 py-2.5">
                    <span className="tabular-nums text-grey">{formatCount(row.calls)}</span>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-grey-100"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(shareOfCalls(row.calls, totalCalls), 2)}%` }} /></div>
                  </td>
                  <td className={cn('px-2 py-2.5 text-right tabular-nums', row.failures > 0 && 'text-red')}>{formatPercent(row.errorRatePercent)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{formatDuration(row.avgLatencyMs)}</td>
                  <td className={cn('py-2.5 text-right tabular-nums', hasCost ? 'px-2' : 'px-4')}>{formatDuration(row.p95LatencyMs)}</td>
                  {hasCost ? <td className="px-4 py-2.5 text-right tabular-nums">{formatCost(row.cost)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

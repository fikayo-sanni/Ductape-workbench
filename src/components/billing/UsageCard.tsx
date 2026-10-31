import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import pricingServices from '@/services/pricingServices';
import { useAuth } from '@/store/useAuth';
import { describePeriod, formatBytes, topSources } from '@/utils/usage';

/**
 * How much log data this workspace has sent this billing period, and which projects sent it. Measured only: no plan
 * charges for it yet, which the card says, so nobody reads it as a bill.
 */
export default function UsageCard() {
  const { user, currentWorkspaceId } = useAuth();
  const usage = useQuery({
    queryKey: ['pricing', 'usage', currentWorkspaceId],
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId,
    queryFn: () => pricingServices.fetchWorkspaceUsage({ user_id: user!._id, public_key: user!.public_key, workspace_id: currentWorkspaceId! }),
    staleTime: 60_000,
  });

  // Hidden until there is something to show: before metering is switched on, or for a workspace that sent no logs.
  if (usage.isLoading || usage.error || !usage.data || !usage.data.byDay.length) return null;
  const { range, basis } = describePeriod(usage.data.period);
  const sources = topSources(usage.data);
  const peak = Math.max(1, ...usage.data.byDay.map((d) => d.bytes));

  return (
    <section className="mt-4 rounded-[5px] border border-grey-400 p-4" data-testid="usage-card">
      <div className="mb-3 flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-grey">Log data sent</p>
          <p className="text-xs text-grey-600">
            {basis}, {range}. Measured only: no plan charges for it.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-grey" data-testid="usage-total">{formatBytes(usage.data.total.bytes)}</p>
          <p className="text-xs text-grey-600">{usage.data.total.logs.toLocaleString('en-US')} logs</p>
          {usage.data.stored ? (
            <p className="text-xs text-grey-600" title={`Measured ${usage.data.stored.day}`}>{formatBytes(usage.data.stored.bytes)} kept</p>
          ) : null}
        </div>
      </div>
      <div className="mb-3 flex h-12 items-end gap-[2px]" aria-label="Log data by day">
        {usage.data.byDay.map((d) => (
          <div
              key={d.day}
              title={`${d.day}: ${formatBytes(d.bytes)}, ${d.logs.toLocaleString('en-US')} logs`}
              className="min-w-[3px] flex-1 rounded-t-sm bg-primary/70"
              style={{ height: `${Math.max(4, Math.round((d.bytes / peak) * 100))}%` }}
            />
          ))}
      </div>
      {sources.length ? (
        <ul className="space-y-1">
          {sources.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-grey">{s.label}</span>
              <span className="whitespace-nowrap text-grey-600">
                {formatBytes(s.bytes)} · {s.share}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

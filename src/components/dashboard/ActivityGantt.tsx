import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/tabs/ProductSection';
import { bucketLabel, formatCount, formatPercent, ganttAxis, ganttRows, type IPlatformHealth } from '@/utils/platformHealth';

/**
 * Activity by type as a Gantt chart: a row for each kind of resource, the period across, and a bar for every unbroken stretch of time in
 * which it was used. A bar is darker where it was busier and red where most of what ran failed.
 */
export default function ActivityGantt({ health, rangeLabel }: { health: IPlatformHealth; rangeLabel: string }) {
  const rows = ganttRows(health.systems, health.overall.current.total);
  const bucket = health.window.bucket;
  const timeline = health.systems.find((system) => system.timeline.length > 0)?.timeline ?? [];
  const buckets = timeline.length;
  const axis = ganttAxis(timeline, bucket);
  const percent = (index: number) => `${(index / Math.max(buckets, 1)) * 100}%`;

  return (
    <Panel
      title="Activity by type"
      description={`When each kind of resource was used, ${rangeLabel.toLowerCase()}. A bar is an unbroken stretch of activity: darker is busier, red is mostly failing.`}
      className="lg:col-span-3"
      action={<BarChart3 className="h-4 w-4 text-grey-600" />}
    >
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="mb-2 h-10 w-10 text-grey-600" />
          <p className="text-sm font-medium text-grey-600">No activity data</p>
          <p className="mt-1 px-4 text-center text-xs text-grey-600">The chart appears here once something runs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto" data-testid="activity-gantt">
          <div className="min-w-[38rem]">
            <div className="flex items-end gap-3 pb-1">
              <div className="w-36 flex-shrink-0" />
              <div className="relative h-4 flex-1">
                {axis.map((mark) => (
                  <span key={mark.index} className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-grey-600" style={{ left: `${((mark.index + 0.5) / buckets) * 100}%` }}>{mark.label}</span>
                ))}
              </div>
              <div className="w-20 flex-shrink-0 text-right text-[10px] text-grey-600">Calls</div>
            </div>
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3" data-testid={`gantt-${row.id}`}>
                  <div className="w-36 flex-shrink-0 truncate text-xs font-medium text-grey" title={row.label}>{row.label}</div>
                  <div className="relative h-6 flex-1 rounded-md bg-grey-100">
                    {axis.map((mark) => <span key={mark.index} className="absolute inset-y-0 w-px bg-grey-400/50" style={{ left: `${((mark.index + 0.5) / buckets) * 100}%` }} />)}
                    {row.spans.map((span) => (
                      <div
                        key={span.from}
                        className="absolute inset-y-1 flex overflow-hidden rounded-md"
                        style={{ left: percent(span.from), width: `${((span.to - span.from + 1) / buckets) * 100}%`, minWidth: 6 }}
                        title={`${row.label}: ${bucketLabel(span.start, bucket)} to ${bucketLabel(span.end, bucket)}, ${formatCount(span.calls)} calls${span.failures > 0 ? `, ${formatCount(span.failures)} failed` : ''}`}
                      >
                        {row.cells.slice(span.from, span.to + 1).map((cell) => (
                          <div key={cell.index} className={cn('h-full flex-1', cell.failing ? 'bg-red' : 'bg-primary')} style={{ opacity: cell.intensity }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="w-20 flex-shrink-0 text-right text-xs tabular-nums text-grey">
                    {formatCount(row.total)}
                    <span className="ml-1 text-[10px] text-grey-600">{formatPercent(row.share)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

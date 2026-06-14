import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Calendar, Layers, LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ActivityPeriodPreset } from '@/lib/activity-period';
import {
  useActivityTimeline,
  type UseActivityTimelineParams,
} from '@/hooks/useActivityTimeline';

export type ActivityTimelineViewMode = 'volume' | 'latency' | 'outcomes';

const PERIOD_OPTIONS: { id: ActivityPeriodPreset; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '1m', label: '1 month' },
  { id: '6m', label: '6 months' },
  { id: 'custom', label: 'Custom' },
];

export interface ActivityTimelinePanelProps
  extends Omit<UseActivityTimelineParams, 'period' | 'customStart' | 'customEnd'> {
  title?: string;
  className?: string;
  /** Label for volume bars, e.g. "operations", "requests" */
  countLabel?: string;
}

export function ActivityTimelinePanel({
  title = 'Activity timeline',
  className,
  countLabel = 'requests',
  ...timelineParams
}: ActivityTimelinePanelProps) {
  const [period, setPeriod] = useState<ActivityPeriodPreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [viewMode, setViewMode] = useState<ActivityTimelineViewMode>('volume');
  const [customOpen, setCustomOpen] = useState(false);

  const { data: points = [], isLoading, isFetching } = useActivityTimeline({
    ...timelineParams,
    period,
    customStart: period === 'custom' ? customStart : undefined,
    customEnd: period === 'custom' ? customEnd : undefined,
  });

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        latency: p.avgLatencyMs ?? 0,
      })),
    [points],
  );

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const maxOutcome = Math.max(...points.map((p) => p.successful + p.failed), 1);
  const hasLatency = points.some((p) => p.avgLatencyMs !== null);
  const hasOutcomes = points.some((p) => p.successful > 0 || p.failed > 0);
  const hasVolume = points.some((p) => p.count > 0);

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      setPeriod('custom');
      setCustomOpen(false);
    }
  };

  const renderOutcomesChart = () => {
    if (!hasOutcomes) {
      return (
        <p className="text-sm text-grey-500 py-8 text-center">
          No success/failure data in this period.
        </p>
      );
    }

    if (chartData.length > 14) {
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-grey-200" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name === 'successful' ? 'Successful' : 'Failed',
                ]}
                labelFormatter={(label) => label}
              />
              <Legend
                formatter={(value) => (value === 'successful' ? 'Successful' : 'Failed')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="successful" stackId="outcome" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={32} />
              <Bar dataKey="failed" stackId="outcome" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {points.map((day) => {
          const total = day.successful + day.failed;
          const successPct = total > 0 ? (day.successful / total) * 100 : 0;
          const failPct = total > 0 ? (day.failed / total) * 100 : 0;
          const scale = maxOutcome > 0 ? (total / maxOutcome) * 100 : 0;
          return (
            <div key={day.date} className="flex items-center gap-3">
              <div className="w-16 text-xs font-medium text-grey-600 shrink-0">{day.label}</div>
              <div
                className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative flex"
                style={{ width: `${Math.max(scale, total > 0 ? 8 : 0)}%`, minWidth: total > 0 ? '4rem' : undefined }}
              >
                {day.successful > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${successPct}%` }}
                    title={`${day.successful} successful`}
                  />
                )}
                {day.failed > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${failPct}%` }}
                    title={`${day.failed} failed`}
                  />
                )}
              </div>
              <div className="text-xs text-grey-600 shrink-0 w-28 text-right">
                <span className="text-green-600">{day.successful}</span>
                {' / '}
                <span className="text-red-500">{day.failed}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-grey">{title}</h2>
          {(isLoading || isFetching) && (
            <Loader2 className="h-4 w-4 animate-spin text-grey-400" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-grey-300 overflow-hidden">
            {PERIOD_OPTIONS.map((opt) =>
              opt.id === 'custom' ? (
                <Popover key={opt.id} open={customOpen} onOpenChange={setCustomOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-none h-8 px-3 text-xs',
                        period === 'custom' && 'bg-primary/10 text-primary',
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {period === 'custom' && customStart && customEnd
                        ? 'Custom'
                        : opt.label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto" align="end">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-grey">Custom range</p>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-grey-600">
                          Start
                          <Input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-xs text-grey-600">
                          End
                          <Input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="mt-1"
                          />
                        </label>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={applyCustomRange}
                        disabled={!customStart || !customEnd || customStart > customEnd}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  key={opt.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'rounded-none h-8 px-3 text-xs',
                    period === opt.id && 'bg-primary/10 text-primary',
                  )}
                  onClick={() => setPeriod(opt.id)}
                >
                  {opt.label}
                </Button>
              ),
            )}
          </div>

          <div className="flex rounded-lg border border-grey-300 overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Activity volume"
              className={cn(
                'rounded-none h-8 px-2.5',
                viewMode === 'volume' && 'bg-primary/10 text-primary',
              )}
              onClick={() => setViewMode('volume')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Success vs failure over time"
              className={cn(
                'rounded-none h-8 px-2.5',
                viewMode === 'outcomes' && 'bg-primary/10 text-primary',
              )}
              onClick={() => setViewMode('outcomes')}
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Average latency over time"
              className={cn(
                'rounded-none h-8 px-2.5',
                viewMode === 'latency' && 'bg-primary/10 text-primary',
              )}
              onClick={() => setViewMode('latency')}
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-4 bg-grey-200 rounded animate-pulse" />
              <div className="flex-1 h-8 bg-grey-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : viewMode === 'outcomes' ? (
        <div className="w-full">
          {!hasOutcomes && hasVolume ? (
            <p className="text-sm text-grey-500 py-8 text-center">
              Volume is available, but success/failure breakdown is not returned for this resource yet.
              Restart the logs service if you recently deployed timeline updates.
            </p>
          ) : (
            renderOutcomesChart()
          )}
        </div>
      ) : viewMode === 'latency' ? (
        <div className="h-64 w-full">
          {hasLatency ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-grey-200" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  unit="ms"
                  width={48}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [`${Math.round(value)} ms`, 'Avg latency']}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-grey-500 py-8 text-center">
              {hasVolume
                ? 'Operations were recorded, but none have duration (start/end or latency) for this period.'
                : 'No latency data in this period.'}
            </p>
          )}
        </div>
      ) : points.length === 0 ? (
        <p className="text-sm text-grey-500 py-8 text-center">No activity in this period.</p>
      ) : chartData.length > 14 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-grey-200" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), countLabel]}
                labelFormatter={(label) => label}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3">
          {points.map((day) => {
            const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            return (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-16 text-xs font-medium text-grey-600 shrink-0">{day.label}</div>
                <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {day.count.toLocaleString()} {countLabel}
                      {day.avgLatencyMs !== null && day.avgLatencyMs > 0 && (
                        <span className="opacity-90 ml-2">· {day.avgLatencyMs}ms avg</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

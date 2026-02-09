import { TrendingUp, TrendingDown, Users, Activity, Clock, BarChart3, UserPlus, Loader2 } from 'lucide-react';
import { cn, getLast7CalendarDays } from '@/lib/utils';
import { ISessionDashboardResult } from '@/services/sessionUsersService';

interface SessionDashboardProps {
  session: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
  dashboardData?: ISessionDashboardResult;
  isLoading?: boolean;
}

// Fallback dummy data when no real data is available
const FALLBACK_DATA = {
  dau: { current: 0, previous: 0, change: 0 },
  wau: { current: 0, previous: 0, change: 0 },
  mau: { current: 0, previous: 0, change: 0 },
  avgSessionDuration: { current: '0s', previous: '0s', change: 0 },
  totalSessions: 0,
  newUsersThisWeek: 0,
  peakHours: [] as Array<{ hour: string; count: number }>,
  activityTimeline: [] as Array<{ date: string; sessions: number }>,
};

export default function SessionDashboard({
  sessionTag,
  productName,
  dashboardData,
  isLoading = false,
}: SessionDashboardProps) {
  // Use real data if available, otherwise fallback
  const data = dashboardData ? {
    dau: dashboardData.dau,
    wau: dashboardData.wau,
    mau: dashboardData.mau,
    avgSessionDuration: dashboardData.avgSessionDuration,
    totalSessions: dashboardData.totalSessions,
    newUsersThisWeek: dashboardData.newUsersThisWeek,
    peakHours: dashboardData.peakHours,
    activityTimeline: dashboardData.activityTimeline,
  } : FALLBACK_DATA;

  // Stats array for metric cards - matching workspace Dashboard pattern
  const stats = [
    {
      title: 'Daily Active',
      value: data?.dau?.current?.toLocaleString() || '0',
      change: `${Math.abs(data?.dau?.change || 0).toFixed(1)}%`,
      trend: (data?.dau?.change || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Weekly Active',
      value: data?.wau?.current?.toLocaleString() || '0',
      change: `${Math.abs(data?.wau?.change || 0).toFixed(1)}%`,
      trend: (data?.wau?.change || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Monthly Active',
      value: data?.mau?.current?.toLocaleString() || '0',
      change: `${Math.abs(data?.mau?.change || 0).toFixed(1)}%`,
      trend: (data?.mau?.change || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-green',
      bgColor: 'bg-green/10',
    },
    {
      title: 'Total Sessions',
      value: data?.totalSessions?.toLocaleString() || '0',
      change: null,
      trend: null,
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Avg. Duration',
      value: data?.avgSessionDuration?.current || '0s',
      change: `${Math.abs(data?.avgSessionDuration?.change || 0).toFixed(1)}%`,
      trend: (data?.avgSessionDuration?.change || 0) >= 0 ? 'up' : 'down',
      icon: Clock,
      color: 'text-yellow',
      bgColor: 'bg-yellow/10',
    },
    {
      title: 'New Users',
      value: data?.newUsersThisWeek?.toLocaleString() || '0',
      change: null,
      trend: null,
      icon: UserPlus,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-auto bg-grey-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div>
            <div className="h-8 w-48 bg-grey-200 rounded animate-pulse mb-2" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-24 bg-grey-200 rounded animate-pulse" />
              <span className="text-grey-400">•</span>
              <div className="h-5 w-32 bg-grey-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-grey-200 animate-pulse" />
                  <div className="w-14 h-6 rounded bg-grey-200 animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-grey-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-20 bg-grey-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Timeline Skeleton */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-48 bg-grey-200 rounded animate-pulse" />
                <div className="h-5 w-5 bg-grey-200 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-4 bg-grey-200 rounded animate-pulse" />
                    <div className="flex-1 h-8 bg-grey-200 rounded-lg animate-pulse" />
                  </div>
                ))}
                <div className="pt-4 border-t border-grey-400">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-grey-200 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-grey-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Peak Hours Skeleton */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-40 bg-grey-200 rounded animate-pulse" />
                <div className="h-5 w-5 bg-grey-200 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-14 bg-grey-200 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-grey-200 rounded animate-pulse" />
                    </div>
                    <div className="w-full h-2 bg-grey-200 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-grey-600">Loading analytics data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-grey mb-1">Session Analytics</h1>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
              {sessionTag}
            </code>
            {productName && (
              <>
                <span className="text-grey-400">•</span>
                <span className="text-sm text-grey-600">{productName}</span>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid - matching workspace Dashboard pattern exactly */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bgColor)}>
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  {stat.trend && stat.change && (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded',
                        stat.trend === 'up'
                          ? 'text-green bg-green/10'
                          : 'text-red bg-red/10'
                      )}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {stat.change}
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-grey mb-1">{stat.value}</h3>
                <p className="text-sm text-grey-600">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Timeline (7 Days) - last 7 days with 0 for no activity */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Activity Timeline (Last 7 Days)</h2>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-4 bg-grey-200 rounded animate-pulse" />
                    <div className="flex-1 h-8 bg-grey-100 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const normalized = getLast7CalendarDays(data?.activityTimeline ?? [], (d) => d.sessions ?? 0);
                  const maxCount = Math.max(...normalized.map((d) => d.value), 1);
                  return normalized.map((day) => {
                    const percentage = maxCount > 0 ? (day.value / maxCount) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <div className="w-12 text-xs font-medium text-grey-600">{day.label}</div>
                        <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-xs font-semibold text-white drop-shadow-sm">
                              {day.value.toLocaleString()} sessions
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div className="pt-4 border-t border-grey-400">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-grey-600">Total sessions</span>
                    <span className="font-semibold text-grey">
                      {getLast7CalendarDays(data?.activityTimeline ?? [], (d) => d.sessions ?? 0).reduce((sum, d) => sum + d.value, 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Peak Activity Hours</h2>
              <BarChart3 className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {data?.peakHours?.length > 0 ? (
                data.peakHours.slice(0, 6).map((hour, index) => {
                  const maxCount = Math.max(...data.peakHours.map(h => h.count), 1);
                  const percentage = (hour.count / maxCount) * 100;

                  // Color mapping for ranked items
                  const getBarColor = (idx: number) => {
                    const colors: Record<number, string> = {
                      0: 'bg-orange-500',
                      1: 'bg-orange-400',
                      2: 'bg-orange-300',
                    };
                    return colors[idx] || 'bg-grey-400';
                  };

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-grey font-medium">{hour.hour}</span>
                        <span className="text-grey-600">{hour.count} sessions</span>
                      </div>
                      <div className="w-full bg-grey-200 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full transition-all', getBarColor(index))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-grey-400 mb-3" />
                  <p className="text-grey-600 font-medium">No peak hours data</p>
                  <p className="text-sm text-grey-500 mt-1">Patterns will emerge over time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, Clock, Calendar, BarChart3, PieChart } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SessionDashboardProps {
  session: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
}

// Dummy analytics data
const ANALYTICS_DATA = {
  dau: {
    current: 1234,
    previous: 1156,
    change: 6.7,
  },
  wau: {
    current: 5678,
    previous: 5234,
    change: 8.5,
  },
  mau: {
    current: 18456,
    previous: 17234,
    change: 7.1,
  },
  avgSessionDuration: {
    current: '24m 32s',
    previous: '22m 15s',
    change: 10.2,
  },
  totalSessions: {
    current: 45678,
    previous: 42134,
    change: 8.4,
  },
  newUsers: {
    current: 892,
    previous: 745,
    change: 19.7,
  },
  peakHours: [
    { hour: '9 AM', count: 234 },
    { hour: '12 PM', count: 456 },
    { hour: '3 PM', count: 389 },
    { hour: '6 PM', count: 512 },
    { hour: '9 PM', count: 298 },
  ],
  environmentBreakdown: [
    { env: 'production', count: 12345, percentage: 67 },
    { env: 'staging', count: 4567, percentage: 25 },
    { env: 'development', count: 1544, percentage: 8 },
  ],
  activityTimeline: [
    { date: 'Mon', sessions: 3456 },
    { date: 'Tue', sessions: 3789 },
    { date: 'Wed', sessions: 4123 },
    { date: 'Thu', sessions: 3912 },
    { date: 'Fri', sessions: 4567 },
    { date: 'Sat', sessions: 2345 },
    { date: 'Sun', sessions: 2123 },
  ],
};

export default function SessionDashboard({
  sessionTag,
  productName,
}: SessionDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');

  const getEnvBadgeColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-green/10 text-green border-green/20';
      case 'staging':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'development':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-grey-100 text-grey-600 border-grey-300';
    }
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    change: number,
    icon: React.ReactNode,
    iconBg: string
  ) => (
    <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-green' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-grey mb-1">{value}</div>
      <div className="text-xs text-grey-600 font-medium">{title}</div>
    </div>
  );

  return (
    <div className="h-full overflow-auto bg-grey-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey mb-2">Session Dashboard</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-grey-100 text-grey-700 font-mono font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    {sessionTag}
                  </span>
                  {productName && (
                    <>
                      <span className="text-grey-400">•</span>
                      <span className="text-grey-600 font-medium">{productName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderMetricCard(
            'Daily Active Users',
            ANALYTICS_DATA.dau.current.toLocaleString(),
            ANALYTICS_DATA.dau.change,
            <Users className="h-5 w-5 text-blue-600" />,
            'bg-blue-500/10'
          )}
          {renderMetricCard(
            'Weekly Active Users',
            ANALYTICS_DATA.wau.current.toLocaleString(),
            ANALYTICS_DATA.wau.change,
            <Users className="h-5 w-5 text-purple-600" />,
            'bg-purple-500/10'
          )}
          {renderMetricCard(
            'Monthly Active Users',
            ANALYTICS_DATA.mau.current.toLocaleString(),
            ANALYTICS_DATA.mau.change,
            <Users className="h-5 w-5 text-green" />,
            'bg-green/10'
          )}
          {renderMetricCard(
            'Total Sessions',
            ANALYTICS_DATA.totalSessions.current.toLocaleString(),
            ANALYTICS_DATA.totalSessions.change,
            <Activity className="h-5 w-5 text-orange-600" />,
            'bg-orange-500/10'
          )}
          {renderMetricCard(
            'Avg. Session Duration',
            ANALYTICS_DATA.avgSessionDuration.current,
            ANALYTICS_DATA.avgSessionDuration.change,
            <Clock className="h-5 w-5 text-indigo-600" />,
            'bg-indigo-500/10'
          )}
          {renderMetricCard(
            'New Users',
            ANALYTICS_DATA.newUsers.current.toLocaleString(),
            ANALYTICS_DATA.newUsers.change,
            <Calendar className="h-5 w-5 text-teal-600" />,
            'bg-teal-500/10'
          )}
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Activity Timeline</h2>
          <div className="space-y-3">
            {ANALYTICS_DATA.activityTimeline.map((day) => {
              const maxSessions = Math.max(...ANALYTICS_DATA.activityTimeline.map(d => d.sessions));
              const percentage = (day.sessions / maxSessions) * 100;

              return (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-grey-600">{day.date}</div>
                  <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-semibold text-grey-700">
                        {day.sessions.toLocaleString()} sessions
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Hours */}
          <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-grey">Peak Activity Hours</h2>
            </div>
            <div className="space-y-3">
              {ANALYTICS_DATA.peakHours.map((hour) => {
                const maxCount = Math.max(...ANALYTICS_DATA.peakHours.map(h => h.count));
                const percentage = (hour.count / maxCount) * 100;

                return (
                  <div key={hour.hour} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium text-grey-600">{hour.hour}</div>
                    <div className="flex-1 h-6 bg-grey-100 rounded overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs font-semibold text-grey-700">
                          {hour.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Environment Breakdown */}
          <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-grey">Environment Distribution</h2>
            </div>
            <div className="space-y-4">
              {ANALYTICS_DATA.environmentBreakdown.map((env) => (
                <div key={env.env} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${getEnvBadgeColor(env.env)}`}>
                      {env.env}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-grey-600 font-medium">{env.count.toLocaleString()}</span>
                      <span className="text-grey-700 font-bold min-w-[3rem] text-right">{env.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        env.env === 'production'
                          ? 'bg-green'
                          : env.env === 'staging'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${env.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">About Session Analytics</h3>
          <p className="text-xs text-grey-600">
            This dashboard provides real-time analytics for the <strong>{sessionTag}</strong> session.
            Data is updated every 5 minutes and shows aggregated metrics across all environments.
            Use the time range selector to view different periods.
          </p>
        </div>
      </div>
    </div>
  );
}

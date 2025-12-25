import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, Clock, BarChart3, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/store/useAuth';
import { fetchSessionDashboard, SessionDashboardMetrics } from '@/services/logsServices';

interface SessionDashboardProps {
  session: any;
  sessionTag: string;
  productTag: string;
  productName?: string;
}

export default function SessionDashboard({
  sessionTag,
  productTag,
  productName,
}: SessionDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const { user, currentWorkspaceId } = useAuth();

  // Calculate date range based on time selection
  const dateRange = useMemo(() => {
    const today = new Date();
    const ago = new Date();
    let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';

    switch (timeRange) {
      case '24h':
        ago.setDate(today.getDate() - 1);
        groupBy = 'hour';
        break;
      case '7d':
        ago.setDate(today.getDate() - 7);
        groupBy = 'day';
        break;
      case '30d':
        ago.setDate(today.getDate() - 30);
        groupBy = 'day';
        break;
      case '90d':
        ago.setDate(today.getDate() - 90);
        groupBy = 'week';
        break;
      default:
        ago.setDate(today.getDate() - 7);
    }

    return {
      start_date: ago.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      groupBy,
    };
  }, [timeRange]);

  // Fetch session dashboard metrics
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['session-dashboard', currentWorkspaceId, productTag, sessionTag, dateRange],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key || !productTag || !sessionTag) {
        throw new Error('Missing required parameters');
      }
      return fetchSessionDashboard(
        currentWorkspaceId,
        user._id,
        user.public_key,
        {
          product_tag: productTag,
          session_tag: sessionTag,
          ...dateRange,
        }
      );
    },
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key && !!productTag && !!sessionTag,
  });

  // Format duration in seconds to human-readable format
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    iconBg: string,
    subtitle?: string
  ) => (
    <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-grey mb-1">{value}</div>
      <div className="text-xs text-grey-600 font-medium">{title}</div>
      {subtitle && <div className="text-xs text-grey-500 mt-1">{subtitle}</div>}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading session analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Failed to load session analytics</p>
          <p className="text-grey-500 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

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
            'Total Sessions',
            (metrics?.totalSessions ?? 0).toLocaleString(),
            <Activity className="h-5 w-5 text-blue-600" />,
            'bg-blue-500/10'
          )}
          {renderMetricCard(
            'Active Sessions',
            (metrics?.activeSessions ?? 0).toLocaleString(),
            <CheckCircle className="h-5 w-5 text-green" />,
            'bg-green/10'
          )}
          {renderMetricCard(
            'Expired Sessions',
            (metrics?.expiredSessions ?? 0).toLocaleString(),
            <XCircle className="h-5 w-5 text-orange-600" />,
            'bg-orange-500/10'
          )}
          {renderMetricCard(
            'Total Users',
            (metrics?.totalUsers ?? 0).toLocaleString(),
            <Users className="h-5 w-5 text-purple-600" />,
            'bg-purple-500/10'
          )}
          {renderMetricCard(
            'Active Users',
            (metrics?.activeUsers ?? 0).toLocaleString(),
            <Users className="h-5 w-5 text-teal-600" />,
            'bg-teal-500/10'
          )}
          {renderMetricCard(
            'Avg. Session Duration',
            formatDuration(metrics?.averageSessionDuration ?? 0),
            <Clock className="h-5 w-5 text-indigo-600" />,
            'bg-indigo-500/10'
          )}
        </div>

        {/* Success/Error Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-grey">{(metrics?.successRate ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-grey-600 font-medium">Success Rate</div>
                </div>
              </div>
            </div>
            <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green rounded-full transition-all duration-500"
                style={{ width: `${metrics?.successRate ?? 0}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-grey">{(metrics?.errorRate ?? 0).toFixed(1)}%</div>
                  <div className="text-xs text-grey-600 font-medium">Error Rate</div>
                </div>
              </div>
            </div>
            <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.errorRate ?? 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sessions Over Time */}
        {metrics?.sessionsOverTime && metrics.sessionsOverTime.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Sessions Over Time</h2>
            <div className="space-y-3">
              {metrics.sessionsOverTime.map((period) => {
                const maxSessions = Math.max(...metrics.sessionsOverTime.map(p => p.created + p.expired));
                const total = period.created + period.expired;
                const percentage = maxSessions > 0 ? (total / maxSessions) * 100 : 0;

                return (
                  <div key={period.period} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-grey-600 truncate">{period.period}</div>
                    <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-semibold text-white dark:text-grey">
                          {period.created} created, {period.expired} expired
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operations Over Time */}
        {metrics?.operationsOverTime && metrics.operationsOverTime.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Operations Over Time</h2>
            <div className="space-y-3">
              {metrics.operationsOverTime.map((period) => {
                const total = period.create + period.verify + period.refresh + period.revoke;
                const maxOps = Math.max(...metrics.operationsOverTime.map(p => p.create + p.verify + p.refresh + p.revoke));
                const percentage = maxOps > 0 ? (total / maxOps) * 100 : 0;

                return (
                  <div key={period.period} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-grey-600">{period.period}</span>
                      <span className="text-grey-500">{total.toLocaleString()} ops</span>
                    </div>
                    <div className="flex h-6 bg-grey-100 rounded overflow-hidden">
                      {period.create > 0 && (
                        <div
                          className="bg-green h-full flex items-center justify-center"
                          style={{ width: `${(period.create / total) * percentage}%` }}
                          title={`Create: ${period.create}`}
                        >
                          {period.create > 5 && <span className="text-[10px] text-white font-medium">C</span>}
                        </div>
                      )}
                      {period.verify > 0 && (
                        <div
                          className="bg-blue-500 h-full flex items-center justify-center"
                          style={{ width: `${(period.verify / total) * percentage}%` }}
                          title={`Verify: ${period.verify}`}
                        >
                          {period.verify > 5 && <span className="text-[10px] text-white font-medium">V</span>}
                        </div>
                      )}
                      {period.refresh > 0 && (
                        <div
                          className="bg-purple-500 h-full flex items-center justify-center"
                          style={{ width: `${(period.refresh / total) * percentage}%` }}
                          title={`Refresh: ${period.refresh}`}
                        >
                          {period.refresh > 5 && <span className="text-[10px] text-white font-medium">R</span>}
                        </div>
                      )}
                      {period.revoke > 0 && (
                        <div
                          className="bg-red-500 h-full flex items-center justify-center"
                          style={{ width: `${(period.revoke / total) * percentage}%` }}
                          title={`Revoke: ${period.revoke}`}
                        >
                          {period.revoke > 5 && <span className="text-[10px] text-white font-medium">X</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green"></div>
                <span className="text-grey-600">Create</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-grey-600">Verify</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-grey-600">Refresh</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-grey-600">Revoke</span>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">About Session Analytics</h3>
          <p className="text-xs text-grey-600">
            This dashboard provides analytics for the <strong>{sessionTag}</strong> session.
            Data shows aggregated metrics across all environments for the selected time range.
            Use the time range selector to view different periods.
          </p>
        </div>
      </div>
    </div>
  );
}

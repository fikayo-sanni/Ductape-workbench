import {
  Activity,
  TrendingUp,
  TrendingDown,
  Package,
  Grid3x3,
  Zap,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Loader2,
  Inbox,
  HardDrive,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useQuery } from '@tanstack/react-query';
import workspaceServices from '@/services/workspaceServices';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { currentWorkspaceId, user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', currentWorkspaceId],
    queryFn: () =>
      workspaceServices.fetchDashboardData({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update last updated time
  useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date());
    }
  }, [dashboardData]);

  // Map backend data to component props
  const stats = [
    {
      title: 'Active Products',
      value: dashboardData?.data?.stats[0]?.value || '0',
      change: dashboardData?.data?.stats[0]?.change || '0%',
      trend: dashboardData?.data?.stats[0]?.trend || 'up',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Apps',
      value: dashboardData?.data?.stats[1]?.value || '0',
      change: dashboardData?.data?.stats[1]?.change || '0%',
      trend: dashboardData?.data?.stats[1]?.trend || 'up',
      icon: Grid3x3,
      color: 'text-green',
      bgColor: 'bg-green/10',
    },
    {
      title: 'API Calls In',
      value: dashboardData?.data?.stats[2]?.value || '0',
      change: dashboardData?.data?.stats[2]?.change || '0%',
      trend: dashboardData?.data?.stats[2]?.trend || 'up',
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'API Calls Out',
      value: dashboardData?.data?.stats[3]?.value || '0',
      change: dashboardData?.data?.stats[3]?.change || '0%',
      trend: dashboardData?.data?.stats[3]?.trend || 'up',
      icon: Activity,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Features Deployed',
      value: dashboardData?.data?.stats[4]?.value || '0',
      change: dashboardData?.data?.stats[4]?.change || '0%',
      trend: dashboardData?.data?.stats[4]?.trend || 'up',
      icon: Zap,
      color: 'text-yellow',
      bgColor: 'bg-yellow/10',
    },
  ];

  const productHealth: Array<{ name: string; status: string; apps: number; apiCalls: string }> = dashboardData?.data?.productHealth || [];
  const recentActivity: Array<{ time: string; event: string; type: string }> = dashboardData?.data?.recentActivity || [];
  const topProducts: Array<{ name: string; apps: number; requests: string; growth: string }> = dashboardData?.data?.topProducts || [];
  const resourceUsage: Array<{ name: string; count: number; type: string; status: string }> = dashboardData?.data?.resourceUsage || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-grey-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red mb-4" />
            <p className="text-grey-600">Failed to load dashboard data</p>
            <p className="text-sm text-grey-600 mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-grey mb-1">Workspace Dashboard</h1>
            <p className="text-sm text-grey-600">
              Monitor your products, apps, and infrastructure in real-time
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-grey-600">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>
                <h3 className="text-2xl font-bold text-grey mb-1">{stat.value}</h3>
                <p className="text-sm text-grey-600">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Health */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Product Health</h2>
              <Package className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {productHealth.length > 0 ? (
                productHealth.map((product) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          product.status === 'healthy' && 'bg-green',
                          product.status === 'warning' && 'bg-yellow',
                          product.status === 'error' && 'bg-red'
                        )}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-grey">{product.name}</h4>
                        <p className="text-xs text-grey-600">
                          {product.apps} apps • {product.apiCalls}
                        </p>
                      </div>
                    </div>
                    {product.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green" />
                    ) : product.status === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red" />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-12 w-12 text-grey-400 mb-3" />
                  <p className="text-grey-600 font-medium">No healthchecks yet</p>
                  <p className="text-sm text-grey-500 mt-1">Create your first healthcheck to see health metrics</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Recent Activity</h2>
              <Activity className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => {
                  // Parse text with quotes and apply styling
                  const renderEventText = (text: string) => {
                    const parts = text.split(/"([^"]*)"/g);
                    return parts.map((part, i) => 
                      i % 2 === 1 ? (
                        <span key={i} className="text-primary font-medium">"{part}"</span>
                      ) : (
                        part
                      )
                    );
                  };

                  return (
                    <div 
                      key={index} 
                      className="flex items-start gap-3"
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                          activity.type === 'success' && 'bg-green',
                          activity.type === 'warning' && 'bg-yellow',
                          activity.type === 'error' && 'bg-red'
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-grey leading-relaxed break-words">
                          {renderEventText(activity.event)}
                        </p>
                        <p className="text-xs text-grey-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-grey-400 mb-3" />
                  <p className="text-grey-600 font-medium">No recent activity</p>
                  <p className="text-sm text-grey-500 mt-1">Activity will appear here as you use your workspace</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products by Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Top Products by Usage</h2>
            <BarChart3 className="h-5 w-5 text-grey-600" />
          </div>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-grey-400">
                    <th className="text-left text-sm font-medium text-grey-600 pb-3">Product</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Apps</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">API Calls</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={index} className="border-b border-grey-400 last:border-b-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-grey-600" />
                          <span className="text-sm text-grey font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="text-right text-sm text-grey">{product.apps}</td>
                      <td className="text-right text-sm text-grey">{product.requests}</td>
                      <td className="text-right">
                        <span className="text-sm font-medium text-green">
                          {product.growth}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-grey-400 mb-3" />
              <p className="text-grey-600 font-medium">No usage data available</p>
              <p className="text-sm text-grey-500 mt-1">Product usage statistics will appear here</p>
            </div>
          )}
        </div>

        {/* Resource Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Resource Usage</h2>
            <Database className="h-5 w-5 text-grey-600" />
          </div>
          {resourceUsage.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {resourceUsage.map((resource) => {
                // Get appropriate icon based on resource type
                const getResourceIcon = (type: string) => {
                  switch (type?.toLowerCase()) {
                    case 'database':
                      return Database;
                    case 'storage':
                      return HardDrive;
                    case 'cache':
                      return Zap;
                    case 'queue':
                      return MessageSquare;
                    default:
                      return Database;
                  }
                };
                
                const IconComponent = getResourceIcon(resource.type);
                
                return (
                  <div
                    key={resource.name}
                    className="p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className="h-5 w-5 text-grey-600" />
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          resource.status === 'healthy' && 'bg-green',
                          resource.status === 'warning' && 'bg-yellow',
                          resource.status === 'error' && 'bg-red'
                        )}
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-grey mb-1">{resource.count}</h3>
                    <p className="text-sm text-grey-600">{resource.name}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-grey-400 mb-3" />
              <p className="text-grey-600 font-medium">No resource data available</p>
              <p className="text-sm text-grey-500 mt-1">Resource usage metrics will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

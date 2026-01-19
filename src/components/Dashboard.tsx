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
  BarChart3,
  Loader2,
  HardDrive,
  MessageSquare,
  Filter,
  X as CloseIcon,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useQuery } from '@tanstack/react-query';
import workspaceServices from '@/services/workspaceServices';
import appServices from '@/services/appServices';
import productServices from '@/services/productServices';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { currentWorkspaceId, user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter state
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [showFilters, setShowFilters] = useState(false);

  // Time range options
  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  // Fetch apps for filter dropdown
  const { data: appsData } = useQuery({
    queryKey: ['workspace-apps', currentWorkspaceId],
    queryFn: () =>
      appServices.fetchWorkspaceApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  // Fetch products for filter dropdown
  const { data: productsData } = useQuery({
    queryKey: ['workspace-products', currentWorkspaceId],
    queryFn: () =>
      productServices.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  // Fetch dashboard data with filters
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', currentWorkspaceId, selectedAppId, selectedProductId, selectedTimeRange],
    queryFn: () =>
      workspaceServices.fetchDashboardData({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        app_id: selectedAppId !== 'all' ? selectedAppId : undefined,
        product_id: selectedProductId !== 'all' ? selectedProductId : undefined,
        time_range: selectedTimeRange,
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

  // Clear all filters
  const clearFilters = () => {
    setSelectedAppId('all');
    setSelectedProductId('all');
    setSelectedTimeRange('7d');
  };

  // Check if any filters are active
  const hasActiveFilters = selectedAppId !== 'all' || selectedProductId !== 'all' || selectedTimeRange !== '7d';

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
      title: 'Internal Calls',
      value: dashboardData?.data?.stats[1]?.value || '0',
      change: dashboardData?.data?.stats[1]?.change || '0%',
      trend: dashboardData?.data?.stats[1]?.trend || 'up',
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'External Outbound',
      value: dashboardData?.data?.stats[2]?.value || '0',
      change: dashboardData?.data?.stats[2]?.change || '0%',
      trend: dashboardData?.data?.stats[2]?.trend || 'up',
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'External Inbound',
      value: dashboardData?.data?.stats[3]?.value || '0',
      change: dashboardData?.data?.stats[3]?.change || '0%',
      trend: dashboardData?.data?.stats[3]?.trend || 'up',
      icon: Zap,
      color: 'text-green',
      bgColor: 'bg-green/10',
    },
    {
      title: 'Total Resources',
      value: dashboardData?.data?.stats[4]?.value || '0',
      change: dashboardData?.data?.stats[4]?.change || '0%',
      trend: dashboardData?.data?.stats[4]?.trend || 'up',
      icon: Database,
      color: 'text-yellow',
      bgColor: 'bg-yellow/10',
    },
  ];

  const activityTimeline: Array<{ date: string; count: number }> = dashboardData?.data?.activityTimeline || [];
  const activityByType: Array<{ type: string; count: number; percentage: number }> = dashboardData?.data?.activityByType || [];
  const topProducts: Array<{ name: string; resources: number; internalCalls: string; externalOutbound: string; externalInbound: string; growth: string }> = dashboardData?.data?.topProducts || [];
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
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-primary text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {[selectedAppId !== 'all', selectedProductId !== 'all', selectedTimeRange !== '7d'].filter(Boolean).length}
                </span>
              )}
            </Button>
            <div className="flex items-center gap-2 text-sm text-grey-600">
              <Clock className="h-4 w-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-grey flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Dashboard Data
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-grey-600 hover:text-grey"
                >
                  <CloseIcon className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* App Filter */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Internal App
                </label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Apps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apps</SelectItem>
                    {appsData?.data?.map((app: any) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Product
                </label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {productsData?.data?.map((product: any) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Filter */}
              <div>
                <label className="text-sm font-medium text-grey-600 mb-2 block">
                  Time Range
                </label>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAppId !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>App: {appsData?.data?.find((a: any) => a._id === selectedAppId)?.app_name}</span>
                      <button onClick={() => setSelectedAppId('all')} className="hover:bg-primary/20 rounded p-0.5">
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedProductId !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>Product: {productsData?.data?.find((p: any) => p._id === selectedProductId)?.name}</span>
                      <button onClick={() => setSelectedProductId('all')} className="hover:bg-primary/20 rounded p-0.5">
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedTimeRange !== '7d' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>{timeRanges.find(r => r.value === selectedTimeRange)?.label}</span>
                      <button onClick={() => setSelectedTimeRange('7d')} className="hover:bg-primary/20 rounded p-0.5">
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          {/* Activity Timeline (Last 7 days) */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Activity Timeline (Last 7 days)</h2>
              <Activity className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {activityTimeline.length > 0 ? (
                <>
                  {activityTimeline.map((day, index) => {
                    const maxCount = Math.max(...activityTimeline.map(d => d.count), 1);
                    const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-12 text-xs font-medium text-grey-600">{day.date}</div>
                        <div className="flex-1 h-8 bg-grey-200 dark:bg-grey-700 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className={cn(
                              "text-xs font-semibold",
                              percentage > 30 ? "text-white" : "text-grey"
                            )}>
                              {day.count} activities
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Summary */}
                  <div className="pt-4 border-t border-grey-400">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-grey-600">Total activities</span>
                      <span className="font-semibold text-grey">
                        {activityTimeline.reduce((sum, day) => sum + day.count, 0)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-grey-400 mb-3" />
                  <p className="text-grey-600 font-medium">No activity yet</p>
                  <p className="text-sm text-grey-500 mt-1">Activity timeline will appear here as you use your workspace</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity by Type */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Activity by Type</h2>
              <BarChart3 className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {activityByType.length > 0 ? (
                activityByType.map((activity, index) => {
                  // Color mapping for different activity types
                  const getTypeColor = (type: string) => {
                    const typeColors: Record<string, string> = {
                      'Actions': 'bg-blue-500',
                      'Session': 'bg-green',
                      'Storage': 'bg-purple-500',
                      'Cache': 'bg-yellow',
                      'Notifications': 'bg-indigo-500',
                      'Database': 'bg-pink-500',
                      'Queue': 'bg-orange-500',
                      'Feature': 'bg-cyan-500',
                      'Other': 'bg-grey-500',
                    };
                    return typeColors[type] || 'bg-primary';
                  };

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-grey font-medium">{activity.type}</span>
                        <span className="text-grey-600">{activity.count} ({activity.percentage}%)</span>
                      </div>
                      <div className="w-full bg-grey-200 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full transition-all', getTypeColor(activity.type))}
                          style={{ width: `${activity.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-grey-400 mb-3" />
                  <p className="text-grey-600 font-medium">No activity data</p>
                  <p className="text-sm text-grey-500 mt-1">Activity breakdown will appear here</p>
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
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Resources</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Internal</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Outbound</th>
                    <th className="text-right text-sm font-medium text-grey-600 pb-3">Inbound</th>
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
                      <td className="text-right text-sm text-grey">{product.resources}</td>
                      <td className="text-right text-sm text-grey">{product.internalCalls}</td>
                      <td className="text-right text-sm text-grey">{product.externalOutbound}</td>
                      <td className="text-right text-sm text-grey">{product.externalInbound}</td>
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
                      return Layers;
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

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
import {cn} from '@/lib/utils';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import {useAuth} from '@/store/useAuth';
import {useQuery} from '@tanstack/react-query';
import workspaceServices from '@/services/workspaceServices';
import appServices from '@/services/appServices';
import productServices from '@/services/productServices';
import {useEffect, useState} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Button} from '@/components/ui/button';

export default function Dashboard() {
  const {currentWorkspaceId, user} = useAuth();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter state
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [showFilters, setShowFilters] = useState(false);

  // Time range options
  const timeRanges = [
    {value: '24h', label: 'Last 24 Hours'},
    {value: '7d', label: 'Last 7 Days'},
    {value: '30d', label: 'Last 30 Days'},
    {value: '90d', label: 'Last 90 Days'},
    {value: '1y', label: 'Last Year'},
  ];

  // Fetch apps for filter dropdown
  const {data: appsData} = useQuery({
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
  const {data: productsData} = useQuery({
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
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'dashboard',
      currentWorkspaceId,
      selectedAppId,
      selectedProductId,
      selectedTimeRange,
    ],
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
  const hasActiveFilters =
    selectedAppId !== 'all' ||
    selectedProductId !== 'all' ||
    selectedTimeRange !== '7d';

  const dashboardPayload = dashboardData?.data ?? dashboardData;
  const statsFromApi: Array<{
    title?: string;
    value?: string;
    change?: string;
    trend?: string;
  }> = dashboardPayload?.stats ?? [];

  const stat = (index: number) => statsFromApi[index] ?? {};

  // Map backend data to component props
  const stats = [
    {
      title: 'Active Products',
      value: stat(0).value || '0',
      change: stat(0).change || '0%',
      trend: stat(0).trend || 'up',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Internal Calls',
      value: stat(1).value || '0',
      change: stat(1).change || '0%',
      trend: stat(1).trend || 'up',
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'External Outbound',
      value: stat(2).value || '0',
      change: stat(2).change || '0%',
      trend: stat(2).trend || 'up',
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'External Inbound',
      value: stat(3).value || '0',
      change: stat(3).change || '0%',
      trend: stat(3).trend || 'up',
      icon: Zap,
      color: 'text-green',
      bgColor: 'bg-green/10',
    },
    {
      title: 'Total Resources',
      value: stat(4).value || '0',
      change: stat(4).change || '0%',
      trend: stat(4).trend || 'up',
      icon: Database,
      color: 'text-yellow',
      bgColor: 'bg-yellow/10',
    },
  ];

  const activityByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }> = dashboardPayload?.activityByType || [];
  const topProducts: Array<{
    name: string;
    resources: number;
    internalCalls: string;
    externalOutbound: string;
    externalInbound: string;
    growth: string;
  }> = dashboardPayload?.topProducts || [];
  const resourceUsage: Array<{
    name: string;
    count: number;
    type: string;
    status: string;
  }> = dashboardPayload?.resourceUsage || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-grey-100 p-4 sm:p-6 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-sm sm:text-base text-grey-600">
              Loading dashboard data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-grey-100 p-4 sm:p-6 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-16">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red mb-4" />
            <p className="text-sm sm:text-base text-grey-600">
              Failed to load dashboard data
            </p>
            <p className="text-xs sm:text-sm text-grey-600 mt-2">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-grey-100 w-full p-3 sm:p-4 md:p-6 pb-10">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-grey mb-1">
              Workspace Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-grey-600">
              Monitor your products, apps, and infrastructure in real-time
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-primary text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs flex items-center justify-center">
                  {
                    [
                      selectedAppId !== 'all',
                      selectedProductId !== 'all',
                      selectedTimeRange !== '7d',
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-grey-600">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Last updated:</span>
              <span>{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-grey-400 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-grey flex items-center gap-2 text-sm sm:text-base">
                <Filter className="h-4 w-4" />
                Filter Dashboard Data
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-grey-600 hover:text-grey text-xs sm:text-sm px-2 sm:px-3"
                >
                  <CloseIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* App Filter */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-grey-600 mb-1 sm:mb-2 block">
                  Internal App
                </label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                <label className="text-xs sm:text-sm font-medium text-grey-600 mb-1 sm:mb-2 block">
                  Product
                </label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                <label className="text-xs sm:text-sm font-medium text-grey-600 mb-1 sm:mb-2 block">
                  Time Range
                </label>
                <Select
                  value={selectedTimeRange}
                  onValueChange={setSelectedTimeRange}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map(range => (
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
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600 mb-2">Active Filters:</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedAppId !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span className="max-w-[150px] sm:max-w-none truncate">
                        App:{' '}
                        {
                          appsData?.data?.find(
                            (a: any) => a._id === selectedAppId,
                          )?.app_name
                        }
                      </span>
                      <button
                        onClick={() => setSelectedAppId('all')}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedProductId !== 'all' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span className="max-w-[150px] sm:max-w-none truncate">
                        Product:{' '}
                        {
                          productsData?.data?.find(
                            (p: any) => p._id === selectedProductId,
                          )?.name
                        }
                      </span>
                      <button
                        onClick={() => setSelectedProductId('all')}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedTimeRange !== '7d' && (
                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      <span>
                        {
                          timeRanges.find(r => r.value === selectedTimeRange)
                            ?.label
                        }
                      </span>
                      <button
                        onClick={() => setSelectedTimeRange('7d')}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map(stat => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-lg border border-grey-400 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center',
                      stat.bgColor,
                    )}
                  >
                    <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.color)} />
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded',
                      stat.trend === 'up'
                        ? 'text-green bg-green/10'
                        : 'text-red bg-red/10',
                    )}
                  >
                    <TrendIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {stat.change}
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-grey mb-0.5 sm:mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs sm:text-sm text-grey-600">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <ActivityTimelinePanel
            title="Activity timeline"
            kind="workspace"
            countLabel="activities"
            enabled={!!currentWorkspaceId}
            className="lg:col-span-2 border-grey-400"
          />

          {/* Activity by Type */}
          <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-grey">
                Activity by Type
              </h2>
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-grey-600" />
            </div>
            <div className="space-y-2 sm:space-y-3">
              {activityByType.length > 0 ? (
                activityByType.map((activity, index) => {
                  // Color mapping for different activity types
                  const getTypeColor = (type: string) => {
                    const typeColors: Record<string, string> = {
                      Actions: 'bg-blue-500',
                      Session: 'bg-green',
                      Storage: 'bg-purple-500',
                      Cache: 'bg-yellow',
                      Notifications: 'bg-indigo-500',
                      Database: 'bg-pink-500',
                      Queue: 'bg-orange-500',
                      Feature: 'bg-cyan-500',
                      Other: 'bg-grey-500',
                    };
                    return typeColors[type] || 'bg-primary';
                  };

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-grey font-medium truncate max-w-[120px] sm:max-w-none">
                          {activity.type}
                        </span>
                        <span className="text-grey-600 text-xs sm:text-sm">
                          {activity.count} ({activity.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-grey-200 rounded-full h-1.5 sm:h-2">
                        <div
                          className={cn(
                            'h-1.5 sm:h-2 rounded-full transition-all',
                            getTypeColor(activity.type),
                          )}
                          style={{width: `${activity.percentage}%`}}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-grey-400 mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-base text-grey-600 font-medium">
                    No activity data
                  </p>
                  <p className="text-xs sm:text-sm text-grey-500 mt-1 text-center px-4">
                    Activity breakdown will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products by Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-grey">
              Top Products by Usage
            </h2>
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-grey-600" />
          </div>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[640px] sm:min-w-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-grey-400">
                      <th className="text-left text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3 pl-4 sm:pl-0">
                        Product
                      </th>
                      <th className="text-right text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3">
                        Resources
                      </th>
                      <th className="text-right text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3 hidden sm:table-cell">
                        Internal
                      </th>
                      <th className="text-right text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3 hidden sm:table-cell">
                        Outbound
                      </th>
                      <th className="text-right text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3 hidden sm:table-cell">
                        Inbound
                      </th>
                      <th className="text-right text-xs sm:text-sm font-medium text-grey-600 pb-2 sm:pb-3">
                        Growth
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="border-b border-grey-400 last:border-b-0"
                      >
                        <td className="py-2 sm:py-3 pl-4 sm:pl-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-grey-600 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-grey font-medium truncate max-w-[120px] sm:max-w-none">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right text-xs sm:text-sm text-grey">
                          {product.resources}
                        </td>
                        <td className="text-right text-xs sm:text-sm text-grey hidden sm:table-cell">
                          {product.internalCalls}
                        </td>
                        <td className="text-right text-xs sm:text-sm text-grey hidden sm:table-cell">
                          {product.externalOutbound}
                        </td>
                        <td className="text-right text-xs sm:text-sm text-grey hidden sm:table-cell">
                          {product.externalInbound}
                        </td>
                        <td className="text-right">
                          <span className="text-xs sm:text-sm font-medium text-green">
                            {product.growth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-grey-400 mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base text-grey-600 font-medium">
                No usage data available
              </p>
              <p className="text-xs sm:text-sm text-grey-500 mt-1 text-center px-4">
                Product usage statistics will appear here
              </p>
            </div>
          )}
        </div>

        {/* Resource Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-grey">
              Resource Usage
            </h2>
            <Database className="h-4 w-4 sm:h-5 sm:w-5 text-grey-600" />
          </div>
          {resourceUsage.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {resourceUsage.map(resource => {
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
                    className="p-3 sm:p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-grey-600" />
                      <div
                        className={cn(
                          'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full',
                          resource.status === 'healthy' && 'bg-green',
                          resource.status === 'warning' && 'bg-yellow',
                          resource.status === 'error' && 'bg-red',
                        )}
                      />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-grey mb-0.5 sm:mb-1">
                      {resource.count}
                    </h3>
                    <p className="text-xs sm:text-sm text-grey-600 truncate">
                      {resource.name}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Database className="h-10 w-10 sm:h-12 sm:w-12 text-grey-400 mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base text-grey-600 font-medium">
                No resource data available
              </p>
              <p className="text-xs sm:text-sm text-grey-500 mt-1 text-center px-4">
                Resource usage metrics will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

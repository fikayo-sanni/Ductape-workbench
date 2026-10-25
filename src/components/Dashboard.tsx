import {
  Activity,
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
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  HeartPulse,
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
import {useWorkbenchStore} from '@/stores/workbench-store';
import {Panel, Pill, type Tone} from '@/components/tabs/ProductSection';
import {productHealth, workspaceAttention, type Severity} from '@/utils/productOverview';
import PlatformHealth from '@/components/dashboard/PlatformHealth';
import InfraSummary from '@/components/dashboard/InfraSummary';
import ActivityGantt from '@/components/dashboard/ActivityGantt';
import SectionBoundary from '@/components/dashboard/SectionBoundary';
import {usePlatformHealth} from '@/hooks/usePlatformHealth';
import {formatDuration, productLatency} from '@/utils/platformHealth';

export default function Dashboard() {
  const {currentWorkspaceId, user} = useAuth();
  const {openTab} = useWorkbenchStore();
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
    refetch,
    isFetching,
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

  // The state of every system for this period. The product cards, the activity chart and the health sections all read it.
  const selectedProductTag = selectedProductId !== 'all'
    ? (productsData?.data ?? []).find((item: any) => String(item._id) === selectedProductId)?.tag
    : undefined;
  const platformHealth = usePlatformHealth({
    workspaceId: currentWorkspaceId || '',
    userId: user?._id || '',
    publicKey: user?.public_key || '',
    timeRange: selectedTimeRange,
    productTag: selectedProductTag,
    appId: selectedAppId !== 'all' ? selectedAppId : undefined,
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
  };

  // Check if any filters are active
  const hasActiveFilters = selectedAppId !== 'all' || selectedProductId !== 'all';

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

  // The workspace totals failing is said in a notice below, not by replacing the whole page, so the sections that read other data still show.
  const totalsFailed = Boolean(error) || !dashboardData;

  const productList: any[] = productsData?.data ?? [];
  const attention = workspaceAttention(productList);
  const watchedProducts = productList.filter(product => productHealth(product).state !== 'unwatched').length;
  const usageByName = new Map(topProducts.map(product => [product.name, product]));
  const typeColors: Record<string, string> = {
    Actions: 'bg-blue-500',
    Session: 'bg-green',
    Storage: 'bg-purple-500',
    Cache: 'bg-yellow',
    Notifications: 'bg-indigo-500',
    Database: 'bg-pink-500',
    Queue: 'bg-orange-500',
    Feature: 'bg-cyan-500',
  };

  const banner = (() => {
    if (productList.length === 0) {
      return {tone: 'neutral' as const, title: 'No products yet', detail: 'Create a product to start building. Its health and activity will show up here.'};
    }
    if (attention.length > 0) {
      const down = attention.filter(item => item.severity === 'bad').length;
      const products = new Set(attention.map(item => item.productId)).size;
      return {
        tone: down > 0 ? ('bad' as const) : ('warn' as const),
        title: `${attention.length} health ${attention.length === 1 ? 'check needs' : 'checks need'} attention`,
        detail: `Across ${products} ${products === 1 ? 'product' : 'products'}. The worst are listed on the right.`,
      };
    }
    if (watchedProducts === 0) {
      return {tone: 'neutral' as const, title: 'Nothing is being health checked yet', detail: 'Add a health check to a product and its status will be tracked here.'};
    }
    return {
      tone: 'good' as const,
      title: 'Everything being watched is healthy',
      detail: `${watchedProducts} of ${productList.length} ${productList.length === 1 ? 'product has' : 'products have'} health checks, and none is failing.`,
    };
  })();
  const bannerStyle: Record<'good' | 'warn' | 'bad' | 'neutral', string> = {
    good: 'border-green/30 bg-green/5',
    warn: 'border-orange/30 bg-orange/5',
    bad: 'border-red/30 bg-red/5',
    neutral: 'border-grey-400 bg-grey-100',
  };
  const severityStyle: Record<Severity, {tile: string; text: string}> = {
    bad: {tile: 'bg-red/10', text: 'text-red'},
    warn: {tile: 'bg-orange/10', text: 'text-orange'},
    info: {tile: 'bg-primary/10', text: 'text-primary'},
  };
  const healthTone: Record<string, Tone> = {good: 'good', warn: 'warn', bad: 'bad', unwatched: 'neutral'};

  const openProduct = (product: any) =>
    openTab({
      id: `product-${product._id}`,
      type: 'product',
      title: product.name,
      itemId: product._id,
      data: product,
    });
  const openProductById = (id: string) => {
    const product = productList.find(item => String(item._id) === id);
    if (product) openProduct(product);
  };
  const initials = (name: string) =>
    String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-grey-100 w-full p-3 sm:p-4 md:p-6 pb-10">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-grey mb-1">Workspace dashboard</h1>
            <p className="text-xs sm:text-sm text-grey-600">
              {productList.length} {productList.length === 1 ? 'product' : 'products'}
              {appsData?.data ? `, ${appsData.data.length} ${appsData.data.length === 1 ? 'app' : 'apps'}` : ''}. Updated {lastUpdated.toLocaleTimeString()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-grey-400 bg-white p-0.5" role="tablist" aria-label="Period">
              {timeRanges.map(range => (
                <button
                  key={range.value}
                  type="button"
                  role="tab"
                  aria-selected={selectedTimeRange === range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    selectedTimeRange === range.value ? 'bg-primary text-white' : 'text-grey-600 hover:text-grey',
                  )}
                  title={range.label}
                >
                  {range.value}
                </button>
              ))}
            </div>
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
                  {[selectedAppId !== 'all', selectedProductId !== 'all'].filter(Boolean).length}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-2 text-xs sm:text-sm px-2 sm:px-3" aria-label="Refresh">
              <RefreshCw className={cn('h-3 w-3 sm:h-4 sm:w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-grey-400 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-grey flex items-center gap-2 text-sm sm:text-base">
                <Filter className="h-4 w-4" />
                Filter dashboard data
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 text-grey-600 hover:text-grey text-xs sm:text-sm px-2 sm:px-3">
                  <CloseIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Clear all</span>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-grey-600 mb-1 sm:mb-2 block">Internal app</label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="All apps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All apps</SelectItem>
                    {appsData?.data?.map((app: any) => (
                      <SelectItem key={app._id} value={app._id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-grey-600 mb-1 sm:mb-2 block">Product</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {productList.map((product: any) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {totalsFailed ? (
          <div className="flex items-start gap-3 rounded-xl border border-orange/30 bg-orange/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-grey">Some workspace totals could not be loaded</p>
              <p className="mt-0.5 text-xs text-grey-600 sm:text-sm">{error instanceof Error ? error.message : 'The totals at the top show zero for now.'} Everything else on this page is read separately and is shown below.</p>
            </div>
          </div>
        ) : null}

        {/* Workspace status */}
        <div className={cn('flex items-start gap-3 rounded-xl border p-4', bannerStyle[banner.tone])}>
          {banner.tone === 'good' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green" />
          ) : banner.tone === 'neutral' ? (
            <HeartPulse className="mt-0.5 h-5 w-5 flex-shrink-0 text-grey-600" />
          ) : (
            <AlertTriangle className={cn('mt-0.5 h-5 w-5 flex-shrink-0', banner.tone === 'bad' ? 'text-red' : 'text-orange')} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-grey sm:text-base">{banner.title}</p>
            <p className="mt-0.5 text-xs text-grey-600 sm:text-sm">{banner.detail}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-xl border border-grey-400 p-3 sm:p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center', item.bgColor)}>
                    <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', item.color)} />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-grey mb-0.5 tabular-nums">{item.value}</h3>
                <p className="text-xs sm:text-sm text-grey-600">{item.title}</p>
              </div>
            );
          })}
        </div>

        {/* Timeline, and what needs attention beside it at the same height */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <ActivityTimelinePanel
            title="Activity timeline"
            kind="workspace"
            countLabel="activities"
            enabled={!!currentWorkspaceId}
            className="lg:col-span-2 border-grey-400"
          />
          <div className="relative">
            <div className="flex flex-col lg:absolute lg:inset-0">
              <Panel
                title="Needs attention"
                description={attention.length ? `${attention.length} to look at` : undefined}
                flush={attention.length > 0}
                className="flex min-h-0 flex-col lg:flex-1"
                bodyClassName="min-h-0 max-h-80 flex-1 overflow-y-auto lg:max-h-none"
              >
                {attention.length ? (
                  <ul className="divide-y divide-grey-300">
                    {attention.map(item => (
                      <li key={item.id}>
                        <button type="button" onClick={() => openProductById(item.productId)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-grey-100 sm:px-5">
                          <span className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', severityStyle[item.severity].tile)}>
                            <AlertTriangle className={cn('h-4 w-4', severityStyle[item.severity].text)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-grey">{item.title}</span>
                            <span className="mt-0.5 block text-xs text-grey-600">
                              {item.productName}
                              {item.detail ? `. ${item.detail}` : ''}
                            </span>
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-grey-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green/10">
                      <CheckCircle2 className="h-4 w-4 text-green" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-grey">All clear</p>
                      <p className="mt-0.5 text-xs text-grey-600">No health check is failing in any product.</p>
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </div>

        {/* Products */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-grey sm:text-base">Products</h2>
          {productList.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {productList.map((product: any) => {
                const health = productHealth(product);
                const usage = usageByName.get(product.name);
                const latency = productLatency(platformHealth.data?.products ?? [], product.tag);
                const resourceTotal = [product.apps, product.databases, product.storage, product.caches, product.messageBrokers, product.features, product.functions, product.jobs, product.notifications, product.sessions]
                  .reduce((sum: number, list: any) => sum + (Array.isArray(list) ? list.filter((item: any) => item?.deleted !== true).length : 0), 0);
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="rounded-xl border border-grey-400 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">
                        {product.logo ? <img src={product.logo} alt="" className="h-full w-full rounded-lg object-cover" /> : initials(product.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-grey">{product.name}</p>
                        <p className="truncate font-mono text-xs text-grey-600">{product.tag}</p>
                      </div>
                      <Pill tone={healthTone[health.state]}>
                        {health.state === 'unwatched'
                          ? 'Not watched'
                          : health.state === 'good'
                            ? `${health.summary.healthy} healthy`
                            : `${health.summary.problems.length} to check`}
                      </Pill>
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-grey-300 pt-3 text-center">
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-grey">{resourceTotal}</dd>
                        <dt className="text-[11px] text-grey-600">Resources</dt>
                      </div>
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-grey">{usage?.internalCalls ?? '-'}</dd>
                        <dt className="text-[11px] text-grey-600">Internal calls</dt>
                      </div>
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-grey">{(product.envs ?? []).filter((env: any) => env?.active).length}/{(product.envs ?? []).length}</dd>
                        <dt className="text-[11px] text-grey-600">Envs active</dt>
                      </div>
                    </dl>
                    <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-grey-300 pt-3 text-center">
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-grey">{formatDuration(latency?.avgLatencyMs)}</dd>
                        <dt className="text-[11px] text-grey-600">Avg latency</dt>
                      </div>
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-grey">{formatDuration(latency?.p95LatencyMs)}</dd>
                        <dt className="text-[11px] text-grey-600">p95 latency</dt>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-grey-400 bg-white p-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-grey-600" />
              <p className="text-sm font-medium text-grey">No products yet</p>
              <p className="mt-1 text-xs text-grey-600">Products you create show up here with their health and usage.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Activity by type: a Gantt chart from the health read; the list below is shown only until that read is available */}
          {platformHealth.data ? <div className="lg:col-span-3"><SectionBoundary title="Activity by type"><ActivityGantt health={platformHealth.data} rangeLabel={timeRanges.find(range => range.value === selectedTimeRange)?.label ?? 'Last 7 days'} /></SectionBoundary></div> : <Panel title="Activity by type" className="lg:col-span-3" action={<BarChart3 className="h-4 w-4 text-grey-600" />}>
            {activityByType.length > 0 ? (
              <div className="space-y-3">
                {activityByType.map((activity, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="truncate font-medium text-grey">{activity.type}</span>
                      <span className="text-grey-600 tabular-nums">
                        {activity.count} ({activity.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-grey-200 sm:h-2">
                      <div className={cn('h-1.5 rounded-full transition-all sm:h-2', typeColors[activity.type] || 'bg-primary')} style={{width: `${activity.percentage}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <BarChart3 className="mb-2 h-10 w-10 text-grey-600" />
                <p className="text-sm font-medium text-grey-600">No activity data</p>
                <p className="mt-1 px-4 text-center text-xs text-grey-600">The breakdown appears here once something runs.</p>
              </div>
            )}
          </Panel>}
        </div>

        {/* What is deployed, and which clouds are connected */}
        <SectionBoundary title="Deployments and cloud connections"><InfraSummary /></SectionBoundary>

        {/* The state of every system: use, errors, latency and alerts */}
        <SectionBoundary title="Platform health">
          <PlatformHealth
            workspaceId={currentWorkspaceId || ''}
            userId={user?._id || ''}
            publicKey={user?.public_key || ''}
            timeRange={selectedTimeRange}
            productTag={selectedProductId !== 'all' ? productList.find(item => String(item._id) === selectedProductId)?.tag : undefined}
            appId={selectedAppId !== 'all' ? selectedAppId : undefined}
            rangeLabel={timeRanges.find(range => range.value === selectedTimeRange)?.label ?? 'Last 7 days'}
            inventory={resourceUsage}
          />
        </SectionBoundary>
      </div>
    </div>
  );
}

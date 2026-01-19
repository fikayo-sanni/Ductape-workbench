import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import logsServices, {
  AppDashboardMetrics,
  AppDashboardQuery,
  SessionDashboardMetrics,
  SessionDashboardQuery,
  StorageDashboardMetrics,
  StorageDashboardQuery,
  CacheDashboardMetrics,
  CacheDashboardQuery,
  MessageBrokerDashboardMetrics,
  MessageBrokerDashboardQuery,
  NotificationDashboardMetrics,
  NotificationDashboardQuery,
} from '@/services/logsServices';
import { useAuth } from '@/store/useAuth';

// ==================== SHARED TYPES ====================

interface BaseAnalyticsConfig {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

interface AuthContext {
  workspace_id: string;
  user_id: string;
  public_key: string;
}

// ==================== APP DASHBOARD HOOK ====================

interface UseAppDashboardConfig extends BaseAnalyticsConfig {
  app_id: string;
  version?: string;
  app_env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch app dashboard metrics with automatic auth context.
 * Reusable across any component that needs app-level analytics.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAppDashboard({
 *   app_id: 'abc123',
 *   version: '0.0.1',
 *   app_env: 'production',
 * });
 * ```
 */
export function useAppDashboard(config: UseAppDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    app_id,
    version,
    app_env,
    groupBy = 'day',
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes
    refetchInterval = false,
  } = config;

  return useQuery<AppDashboardMetrics, Error>({
    queryKey: ['app-dashboard', app_id, version, app_env, groupBy, start_date, end_date],
    queryFn: () =>
      logsServices.fetchAppDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { app_id, version, app_env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!app_id && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== SESSION DASHBOARD HOOK ====================

interface UseSessionDashboardConfig extends BaseAnalyticsConfig {
  product_tag: string;
  session_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch session dashboard metrics.
 */
export function useSessionDashboard(config: UseSessionDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    product_tag,
    session_tag,
    env,
    groupBy,
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  return useQuery<SessionDashboardMetrics, Error>({
    queryKey: ['session-dashboard', product_tag, session_tag, env, groupBy],
    queryFn: () =>
      logsServices.fetchSessionDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { product_tag, session_tag, env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!product_tag && !!session_tag && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== STORAGE DASHBOARD HOOK ====================

interface UseStorageDashboardConfig extends BaseAnalyticsConfig {
  product_tag: string;
  storage_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch storage dashboard metrics.
 */
export function useStorageDashboard(config: UseStorageDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    product_tag,
    storage_tag,
    env,
    groupBy,
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  return useQuery<StorageDashboardMetrics, Error>({
    queryKey: ['storage-dashboard', product_tag, storage_tag, env, groupBy],
    queryFn: () =>
      logsServices.fetchStorageDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { product_tag, storage_tag, env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!product_tag && !!storage_tag && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== CACHE DASHBOARD HOOK ====================

interface UseCacheDashboardConfig extends BaseAnalyticsConfig {
  product_tag: string;
  cache_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch cache dashboard metrics.
 */
export function useCacheDashboard(config: UseCacheDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    product_tag,
    cache_tag,
    env,
    groupBy,
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  return useQuery<CacheDashboardMetrics, Error>({
    queryKey: ['cache-dashboard', product_tag, cache_tag, env, groupBy],
    queryFn: () =>
      logsServices.fetchCacheDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { product_tag, cache_tag, env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!product_tag && !!cache_tag && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== MESSAGE BROKER DASHBOARD HOOK ====================

interface UseMessageBrokerDashboardConfig extends BaseAnalyticsConfig {
  product_tag: string;
  broker_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch message broker dashboard metrics.
 */
export function useMessageBrokerDashboard(config: UseMessageBrokerDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    product_tag,
    broker_tag,
    env,
    groupBy,
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  return useQuery<MessageBrokerDashboardMetrics, Error>({
    queryKey: ['broker-dashboard', product_tag, broker_tag, env, groupBy],
    queryFn: () =>
      logsServices.fetchMessageBrokerDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { product_tag, broker_tag, env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!product_tag && !!broker_tag && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== NOTIFICATION DASHBOARD HOOK ====================

interface UseNotificationDashboardConfig extends BaseAnalyticsConfig {
  product_tag: string;
  notifier_tag?: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * Hook to fetch notification dashboard metrics.
 */
export function useNotificationDashboard(config: UseNotificationDashboardConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    product_tag,
    notifier_tag,
    env,
    groupBy,
    start_date,
    end_date,
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  return useQuery<NotificationDashboardMetrics, Error>({
    queryKey: ['notification-dashboard', product_tag, notifier_tag, env, groupBy],
    queryFn: () =>
      logsServices.fetchNotificationDashboard(
        currentWorkspaceId || '',
        user?._id || '',
        user?.public_key || '',
        { product_tag, notifier_tag, env, groupBy, start_date, end_date }
      ),
    enabled: enabled && !!product_tag && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== GENERIC COMPONENT ANALYTICS HOOK ====================

type ComponentType = 'app' | 'product';
type DashboardType = 'session' | 'storage' | 'cache' | 'broker' | 'notification';

interface UseComponentAnalyticsConfig extends BaseAnalyticsConfig {
  componentType: ComponentType;
  dashboardType?: DashboardType;
  identifier: string; // app_id or product_tag
  subIdentifier?: string; // session_tag, storage_tag, etc.
  version?: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Generic hook for fetching component analytics.
 * Use this when you need flexibility in dashboard type selection.
 *
 * @example
 * ```tsx
 * // For app dashboard
 * const { data } = useComponentAnalytics({
 *   componentType: 'app',
 *   identifier: 'app-123',
 *   version: '0.0.1',
 * });
 *
 * // For product session dashboard
 * const { data } = useComponentAnalytics({
 *   componentType: 'product',
 *   dashboardType: 'session',
 *   identifier: 'my-product',
 *   subIdentifier: 'user-sessions',
 * });
 * ```
 */
export function useComponentAnalytics(config: UseComponentAnalyticsConfig) {
  const { currentWorkspaceId, user } = useAuth();

  const {
    componentType,
    dashboardType,
    identifier,
    subIdentifier,
    version,
    env,
    groupBy = 'day',
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchInterval = false,
  } = config;

  const queryKey = [
    'component-analytics',
    componentType,
    dashboardType,
    identifier,
    subIdentifier,
    version,
    env,
    groupBy,
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (componentType === 'app') {
        return logsServices.fetchAppDashboard(
          currentWorkspaceId || '',
          user?._id || '',
          user?.public_key || '',
          { app_id: identifier, version, app_env: env, groupBy }
        );
      }

      // Product component dashboards
      switch (dashboardType) {
        case 'session':
          return logsServices.fetchSessionDashboard(
            currentWorkspaceId || '',
            user?._id || '',
            user?.public_key || '',
            { product_tag: identifier, session_tag: subIdentifier || '', env, groupBy }
          );
        case 'storage':
          return logsServices.fetchStorageDashboard(
            currentWorkspaceId || '',
            user?._id || '',
            user?.public_key || '',
            { product_tag: identifier, storage_tag: subIdentifier || '', env, groupBy }
          );
        case 'cache':
          return logsServices.fetchCacheDashboard(
            currentWorkspaceId || '',
            user?._id || '',
            user?.public_key || '',
            { product_tag: identifier, cache_tag: subIdentifier || '', env, groupBy }
          );
        case 'broker':
          return logsServices.fetchMessageBrokerDashboard(
            currentWorkspaceId || '',
            user?._id || '',
            user?.public_key || '',
            { product_tag: identifier, broker_tag: subIdentifier || '', env, groupBy }
          );
        case 'notification':
          return logsServices.fetchNotificationDashboard(
            currentWorkspaceId || '',
            user?._id || '',
            user?.public_key || '',
            { product_tag: identifier, notifier_tag: subIdentifier, env, groupBy }
          );
        default:
          throw new Error(`Unknown dashboard type: ${dashboardType}`);
      }
    },
    enabled: enabled && !!identifier && !!currentWorkspaceId && !!user?._id,
    staleTime,
    refetchInterval,
  });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format a metric value for display
 */
export function formatMetricValue(value: number, type: 'number' | 'percentage' | 'latency'): string {
  switch (type) {
    case 'number':
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'latency':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

/**
 * Determine trend direction from change percentage
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'stable' {
  if (change > 0.5) return 'up';
  if (change < -0.5) return 'down';
  return 'stable';
}

/**
 * Get appropriate color class for trend
 */
export function getTrendColorClass(
  change: number,
  positiveIsGood: boolean = true
): string {
  const direction = getTrendDirection(change);
  if (direction === 'stable') return 'text-grey-500';
  const isPositive = direction === 'up';
  const isGood = positiveIsGood ? isPositive : !isPositive;
  return isGood ? 'text-green' : 'text-red-500';
}

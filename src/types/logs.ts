export interface LogEntry {
  _id: string;
  integration_id: string;
  env: string;
  type: string;
  process_id: string;
  name?: string;
  data: string;
  status: string;
  timestamp: string;
  start?: number;
  end?: number;
  /** Latency/duration in milliseconds */
  latency?: number;
  /** Source IP of the request that produced this log entry */
  ip_address?: string;
  /** SDK/client that emitted this log entry, e.g. typescript, go, java, dotnet */
  language?: string;
  __v: number;
}

export interface ILog {
  metrics: {
    totalApps: number;
    totalDatabases: number;
    totalActions: number;
    totalEnvironments: number;
    totalAuthorizations: number;
  };
  weeklyMetrics: {
    totalProductsConnected: {
      current: number;
      previous: number;
      difference: number;
      trend: string;
    };
    totalActionsCalled: {
      current: number;
      previous: number;
      difference: number;
      trend: string;
    };
    totalActiveIssues: {
      current: number;
      previous: number;
      difference: number;
      trend: string;
    };
    errors: {
      current: number;
      previous: number;
      difference: number;
      trend: string;
      percentageChange: string;
    };
  };
  usageData: {
    successOverTime: Array<{
      period: string;
      requestsIn: number;
      requestsOut: number;
    }>;
    failuresOverTime: Array<{
      period: string;
      requestsIn: number;
      requestsOut: number;
    }>;
    requestsOverTime: Array<{
      period: string;
      requestsIn: number;
      requestsOut: number;
    }>;
  };
  logs: {
    metadata: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      statusCounts?: {
        all: number;
        running: number;
        completed: number;
        failed: number;
      };
    };
    data: {
      response: any;
      request: any;
      app_env: string;
      _id: string;
      product_tag: string;
      workspace_id: string;
      parent_tag: string;
      child_tag: string;
      successful_execution: boolean;
      failed_execution: boolean;
      env: string;
      /** Log/event type (e.g. app, database). For processor logs may be same as component. */
      type: string;
      /** Component when present (e.g. feature, feature_step from processor results). Use for icon/label when set. */
      component?: string;
      process_id: string;
      name: string;
      message: string;
      data: string;
      status: string;
      timestamp: string;
      start?: number;
      end?: number;
      /** Latency/duration in milliseconds */
      latency?: number;
      /** Source IP of the request that produced this log entry */
      ip_address?: string;
      /** SDK/client that emitted this log entry, e.g. typescript, go, java, dotnet */
      language?: string;
      __v: number;
    }[];
  };
}

export interface LogsResponse {
  status: boolean;
  data: ILog;
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LogsPayload {
  env: string;
  process_id: string;
  type: string;
  id: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface FetchLogsOptions {
  /** fetchWorkspaceLogs only: also request exact all/running/completed/failed totals. */
  includeCounts?: boolean;
  groupBy?: string;
  start_date?: string;
  end_date?: string;
  component?: string;
  product_id?: string;
  type?: string;
  product_tag?: string;
  parent_tag?: string;
  child_tag?: string;
  session_tag?: string;
  session_user_id?: string;
  app_id?: string;
  env?: string;
  action?: string;
  process_id?: string;
  search?: string;
  status?: string;
  tag?: string;
  page?: number;
  limit?: number;
  version?: string | null;
  app_env?: string;
  /** When true, only return logs where successful_execution or failed_execution is true */
  only_completed_execution?: boolean;
}

export interface FetchLogsData {
  public_key: string;
  workspace_id: string;
  user_id: string;
}

// ==================== REUSABLE DASHBOARD TYPES ====================

/**
 * Common dashboard query parameters - reusable across all component types
 */
export interface BaseDashboardQuery {
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

/**
 * App-specific dashboard query parameters
 */
export interface AppDashboardQuery extends BaseDashboardQuery {
  app_id: string;
  version?: string;
  app_env?: string;
}

/**
 * Product-specific dashboard query parameters
 */
export interface ProductDashboardQuery extends BaseDashboardQuery {
  product_tag: string;
  env?: string;
}

/**
 * Common metric structure for trend display
 */
export interface TrendMetric {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  period: string;
  date?: string;
  value: number;
}

/**
 * Request activity data point
 */
export interface ActivityPoint {
  date: string;
  day?: string;
  requests: number;
  success?: number;
  failures?: number;
}

/**
 * Endpoint/Action performance metrics
 */
export interface EndpointMetrics {
  name: string;
  tag: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  calls: number;
  avgLatency: number;
  successRate: number;
}

/**
 * Request distribution by HTTP method
 */
export interface MethodDistribution {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  count: number;
  percentage: number;
}

/**
 * App Dashboard Metrics - comprehensive metrics for app overview
 */
export interface AppDashboardMetrics {
  // Core metrics
  totalRequests: TrendMetric;
  successRate: TrendMetric;
  errorRate: TrendMetric;
  avgLatency: TrendMetric;
  activeEndpoints: TrendMetric;
  webhookEvents: TrendMetric;

  // Distribution data
  requestsByMethod: MethodDistribution[];

  // Time series data
  dailyActivity: ActivityPoint[];

  // Top performers
  topEndpoints: EndpointMetrics[];

  // Raw totals for calculations
  totals: {
    successCount: number;
    failureCount: number;
    totalCount: number;
  };
}

/**
 * Generic component dashboard metrics - reusable base structure
 */
export interface ComponentDashboardMetrics {
  totalOperations: TrendMetric;
  successRate: TrendMetric;
  errorRate: TrendMetric;
  avgLatency: TrendMetric;
  dailyActivity: ActivityPoint[];
}

/**
 * API response wrapper for dashboard metrics
 */
export interface DashboardResponse<T> {
  success: boolean;
  data: T;
}

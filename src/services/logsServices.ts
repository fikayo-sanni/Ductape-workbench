import qs from 'qs';
import apiClient from '@/config/axiosinstance';
import { FetchLogsData, FetchLogsOptions, LogsResponse } from '@/types/logs';

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
};

export const fetchLogs = async (
  data: FetchLogsData,
  payload: FetchLogsOptions = {}
): Promise<LogsResponse> => {
  const { workspace_id, user_id, public_key } = data;

  let days = 8;
  if (payload.groupBy === 'month') {
    days = 31;
  }

  if (payload.groupBy === 'day') {
    days = 2;
  }

  if (payload.groupBy === 'year') {
    days = 366;
  }

  const today = new Date();
  const ago = new Date();
  ago.setDate(today.getDate() - days);

  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      groupBy: payload.groupBy || 'week',
      start_date: payload.start_date || formatDate(ago),
      end_date: payload.end_date || formatDate(today),
      component: payload.component,
      product_id: payload.product_id,
      product_tag: payload.product_tag,
      parent_tag: payload.parent_tag,
      child_tag: payload.child_tag,
      session_tag: payload.session_tag,
      session_user_id: payload.session_user_id,
      type: payload.type,
      app_id: payload.app_id,
      env: payload.env,
      app_env: payload.app_env,
      action: payload.action,
      process_id: payload.process_id,
      status: payload.status,
      tag: payload.tag,
      page: payload.page || 1,
      limit: payload.limit || 20,
      ...payload,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<LogsResponse>(
    `/log/v1/analytics/${workspace_id}?${queryString}`
  );

  return response.data;
};

// Session Dashboard Types
export interface SessionDashboardQuery {
  product_tag: string;
  session_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface SessionDashboardMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  totalUsers: number;
  activeUsers: number;
  sessionsOverTime: {
    period: string;
    created: number;
    expired: number;
  }[];
  operationsOverTime: {
    period: string;
    create: number;
    verify: number;
    refresh: number;
    revoke: number;
  }[];
  hourlyActivity?: {
    hour: string;
    count: number;
  }[];
  successRate: number;
  errorRate: number;
  averageSessionDuration: number;
}

export interface SessionDashboardResponse {
  success: boolean;
  data: SessionDashboardMetrics;
}

export const fetchSessionDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: SessionDashboardQuery
): Promise<SessionDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionDashboardResponse>(
    `/log/v1/session/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

export interface StorageDashboardQuery {
  product_tag: string;
  storage_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface StorageDashboardMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  totalUploads: number;
  totalDownloads: number;
  totalDeletes: number;
  totalListOperations: number;
  totalBytesUploaded: number;
  totalBytesDownloaded: number;
  averageFileSize: number;
  averageOperationDuration: number;
  operationsOverTime: {
    period: string;
    uploads: number;
    downloads: number;
    deletes: number;
    lists: number;
    totalSize: number;
  }[];
  operationsByFileType: {
    fileType: string;
    uploads: number;
    downloads: number;
    totalSize: number;
  }[];
  // Activity timeline (last 7 days by day name) - same format as graph dashboard
  activityTimeline: Array<{ date: string; sessions: number }>;
  dailyActivity: {
    day: string;
    date: string;
    uploads: number;
    downloads: number;
    deletes: number;
    totalOperations: number;
    totalSize: number;
  }[];
  peakUsageTimes: {
    hour: number;
    operationCount: number;
    averageSize: number;
  }[];
  recentActivity: {
    last24Hours: {
      uploads: number;
      downloads: number;
      deletes: number;
      totalSize: number;
    };
    last7Days: {
      uploads: number;
      downloads: number;
      deletes: number;
      totalSize: number;
    };
    last30Days: {
      uploads: number;
      downloads: number;
      deletes: number;
      totalSize: number;
    };
  };
}

export interface StorageDashboardResponse {
  success: boolean;
  data: StorageDashboardMetrics;
}

export const fetchStorageDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: StorageDashboardQuery
): Promise<StorageDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<StorageDashboardResponse>(
    `/log/v1/storage/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Cache Dashboard Types
export interface CacheDashboardQuery {
  product_tag: string;
  cache_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface CacheDashboardMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  totalGets: number;
  totalSets: number;
  totalDeletes: number;
  totalClears: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageOperationDuration: number;
  operationsOverTime: {
    period: string;
    gets: number;
    sets: number;
    deletes: number;
    clears: number;
    hits: number;
    misses: number;
  }[];
  dailyActivity: {
    day: string;
    date: string;
    gets: number;
    sets: number;
    deletes: number;
    clears: number;
    totalOperations: number;
    hits: number;
    misses: number;
  }[];
  peakUsageTimes: {
    hour: number;
    operationCount: number;
    hitRate: number;
  }[];
  recentActivity: {
    last24Hours: {
      gets: number;
      sets: number;
      deletes: number;
      clears: number;
      hits: number;
      misses: number;
    };
    last7Days: {
      gets: number;
      sets: number;
      deletes: number;
      clears: number;
      hits: number;
      misses: number;
    };
    last30Days: {
      gets: number;
      sets: number;
      deletes: number;
      clears: number;
      hits: number;
      misses: number;
    };
  };
}

export interface CacheDashboardResponse {
  success: boolean;
  data: CacheDashboardMetrics;
}

export const fetchCacheDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: CacheDashboardQuery
): Promise<CacheDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<CacheDashboardResponse>(
    `/log/v1/cache/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Message Broker Dashboard Types
export interface MessageBrokerDashboardQuery {
  product_tag: string;
  broker_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface MessageBrokerDashboardMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  totalPublished: number;
  totalConsumed: number;
  totalAcknowledged: number;
  totalRejected: number;
  averageOperationDuration: number;
  averageMessageSize: number;
  operationsOverTime: {
    period: string;
    published: number;
    consumed: number;
    acknowledged: number;
    rejected: number;
    messageSize: number;
  }[];
  messagesByTopic: {
    topic: string;
    published: number;
    consumed: number;
    acknowledged: number;
    rejected: number;
  }[];
  dailyActivity: {
    day: string;
    date: string;
    published: number;
    consumed: number;
    acknowledged: number;
    rejected: number;
    totalOperations: number;
    messageSize: number;
  }[];
  peakUsageTimes: {
    hour: number;
    operationCount: number;
    averageMessageSize: number;
  }[];
  recentActivity: {
    last24Hours: {
      published: number;
      consumed: number;
      acknowledged: number;
      rejected: number;
      messageSize: number;
    };
    last7Days: {
      published: number;
      consumed: number;
      acknowledged: number;
      rejected: number;
      messageSize: number;
    };
    last30Days: {
      published: number;
      consumed: number;
      acknowledged: number;
      rejected: number;
      messageSize: number;
    };
  };
}

export interface MessageBrokerDashboardResponse {
  success: boolean;
  data: MessageBrokerDashboardMetrics;
}

export const fetchMessageBrokerDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: MessageBrokerDashboardQuery
): Promise<MessageBrokerDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<MessageBrokerDashboardResponse>(
    `/log/v1/broker/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Notification Dashboard Types
export interface NotificationDashboardQuery {
  product_tag: string;
  notifier_tag?: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface NotificationDashboardMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  errorRate: number;
  deliveryRate: number;
  totalEmails: number;
  totalPush: number;
  totalSms: number;
  totalCallbacks: number;
  averageOperationDuration: number;
  operationsOverTime: {
    period: string;
    emails: number;
    push: number;
    sms: number;
    callbacks: number;
    successful: number;
    failed: number;
  }[];
  byChannel: {
    email: { sent: number; delivered: number; failed: number };
    push: { sent: number; delivered: number; failed: number };
    sms: { sent: number; delivered: number; failed: number };
    callback: { sent: number; delivered: number; failed: number };
  };
  dailyActivity: {
    day: string;
    date: string;
    emails: number;
    push: number;
    sms: number;
    callbacks: number;
    totalOperations: number;
    successful: number;
    failed: number;
  }[];
  topTemplates: {
    name: string;
    tag: string;
    notifierTag: string;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }[];
  peakUsageTimes: {
    hour: number;
    operationCount: number;
    deliveryRate: number;
  }[];
  recentActivity: {
    last24Hours: {
      sent: number;
      delivered: number;
      failed: number;
      emails: number;
      push: number;
      sms: number;
      callbacks: number;
    };
    last7Days: {
      sent: number;
      delivered: number;
      failed: number;
      emails: number;
      push: number;
      sms: number;
      callbacks: number;
    };
    last30Days: {
      sent: number;
      delivered: number;
      failed: number;
      emails: number;
      push: number;
      sms: number;
      callbacks: number;
    };
  };
}

export interface NotificationDashboardResponse {
  success: boolean;
  data: NotificationDashboardMetrics;
}

export const fetchNotificationDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: NotificationDashboardQuery
): Promise<NotificationDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<NotificationDashboardResponse>(
    `/log/v1/notification/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// ==================== APP DASHBOARD ====================

export interface AppDashboardQuery {
  app_id: string;
  version?: string;
  app_env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface AppDashboardMetrics {
  // Core metrics with trends
  totalRequests: { current: number; previous: number; change: number };
  successRate: { current: number; previous: number; change: number };
  errorRate: { current: number; previous: number; change: number };
  avgLatency: { current: number; previous: number; change: number };
  activeEndpoints: { current: number; previous: number; change: number };
  webhookEvents: { current: number; previous: number; change: number };

  // Distribution
  requestsByMethod: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;

  // Time series
  dailyActivity: Array<{
    date: string;
    day: string;
    requests: number;
    success: number;
    failures: number;
  }>;

  // Top endpoints
  topEndpoints: Array<{
    name: string;
    tag: string;
    method: string;
    calls: number;
    avgLatency: number;
    successRate: number;
  }>;

  // Raw totals
  totals: {
    successCount: number;
    failureCount: number;
    totalCount: number;
  };
}

export interface AppDashboardResponse {
  success: boolean;
  data: AppDashboardMetrics;
}

/**
 * Fetches app-specific dashboard metrics from the logs service.
 * This transforms the existing analytics endpoint response into dashboard-friendly format.
 */
export const fetchAppDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: AppDashboardQuery
): Promise<AppDashboardMetrics> => {
  const { app_id, version, app_env, groupBy = 'day', start_date, end_date } = query;

  // Calculate date range (default 7 days)
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);

  // Fetch current period data
  const currentResponse = await fetchLogs(
    { workspace_id, user_id, public_key },
    {
      component: 'app',
      app_id,
      app_env,
      version,
      groupBy,
      start_date: start_date || formatDate(weekAgo),
      end_date: end_date || formatDate(today),
      limit: 1000, // Get more logs for aggregation
    }
  );

  // Fetch previous period data for comparison
  const previousResponse = await fetchLogs(
    { workspace_id, user_id, public_key },
    {
      component: 'app',
      app_id,
      app_env,
      version,
      groupBy,
      start_date: formatDate(twoWeeksAgo),
      end_date: formatDate(weekAgo),
      limit: 1000,
    }
  );

  const currentData = currentResponse.data;
  const previousData = previousResponse.data;

  // Process current period metrics
  const currentLogs = currentData?.logs?.data || [];
  const previousLogs = previousData?.logs?.data || [];

  // Calculate totals
  const currentTotals = calculateTotals(currentLogs);
  const previousTotals = calculateTotals(previousLogs);

  // Calculate success/error rates
  const currentSuccessRate = currentTotals.totalCount > 0
    ? (currentTotals.successCount / currentTotals.totalCount) * 100
    : 100;
  const previousSuccessRate = previousTotals.totalCount > 0
    ? (previousTotals.successCount / previousTotals.totalCount) * 100
    : 100;

  const currentErrorRate = currentTotals.totalCount > 0
    ? (currentTotals.failureCount / currentTotals.totalCount) * 100
    : 0;
  const previousErrorRate = previousTotals.totalCount > 0
    ? (previousTotals.failureCount / previousTotals.totalCount) * 100
    : 0;

  // Calculate average latency
  const currentAvgLatency = calculateAvgLatency(currentLogs);
  const previousAvgLatency = calculateAvgLatency(previousLogs);

  // Process method distribution
  const requestsByMethod = calculateMethodDistribution(currentLogs);

  // Process daily activity
  const dailyActivity = processDailyActivity(currentData?.usageData?.requestsOverTime || []);

  // Process top endpoints
  const topEndpoints = calculateTopEndpoints(currentLogs);

  // Count active endpoints and webhook events
  const activeEndpointsCount = currentData?.metrics?.totalActions || 0;
  const webhookEventsCount = currentLogs.filter((log: any) => log.type === 'webhook').length;
  const previousWebhookCount = previousLogs.filter((log: any) => log.type === 'webhook').length;

  return {
    totalRequests: {
      current: currentTotals.totalCount,
      previous: previousTotals.totalCount,
      change: calculateChange(currentTotals.totalCount, previousTotals.totalCount),
    },
    successRate: {
      current: Math.round(currentSuccessRate * 10) / 10,
      previous: Math.round(previousSuccessRate * 10) / 10,
      change: calculateChange(currentSuccessRate, previousSuccessRate),
    },
    errorRate: {
      current: Math.round(currentErrorRate * 10) / 10,
      previous: Math.round(previousErrorRate * 10) / 10,
      change: calculateChange(currentErrorRate, previousErrorRate),
    },
    avgLatency: {
      current: Math.round(currentAvgLatency),
      previous: Math.round(previousAvgLatency),
      change: calculateChange(currentAvgLatency, previousAvgLatency),
    },
    activeEndpoints: {
      current: activeEndpointsCount,
      previous: activeEndpointsCount, // Static comparison
      change: 0,
    },
    webhookEvents: {
      current: webhookEventsCount,
      previous: previousWebhookCount,
      change: calculateChange(webhookEventsCount, previousWebhookCount),
    },
    requestsByMethod,
    dailyActivity,
    topEndpoints,
    totals: currentTotals,
  };
};

// Helper functions for dashboard calculations

function calculateTotals(logs: any[]): { successCount: number; failureCount: number; totalCount: number } {
  const successCount = logs.filter(log =>
    log.status === 'success' || log.successful_execution === true
  ).length;
  const failureCount = logs.filter(log =>
    log.status === 'fail' || log.failed_execution === true
  ).length;
  return {
    successCount,
    failureCount,
    totalCount: logs.length,
  };
}

function calculateAvgLatency(logs: any[]): number {
  const logsWithLatency = logs.filter(log => log.latency && log.latency > 0);
  if (logsWithLatency.length === 0) return 0;
  const total = logsWithLatency.reduce((sum, log) => sum + log.latency, 0);
  return total / logsWithLatency.length;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function calculateMethodDistribution(logs: any[]): Array<{ method: string; count: number; percentage: number }> {
  const methodCounts: Record<string, number> = {};

  logs.forEach(log => {
    // Try to extract method from various possible fields
    const method = log.method || extractMethodFromAction(log.child_tag || log.action) || 'GET';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  const total = logs.length || 1;
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return methods
    .map(method => ({
      method,
      count: methodCounts[method] || 0,
      percentage: Math.round(((methodCounts[method] || 0) / total) * 100),
    }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);
}

function extractMethodFromAction(actionTag: string): string | null {
  if (!actionTag) return null;
  const tag = actionTag.toUpperCase();
  if (tag.includes('GET') || tag.includes('FETCH') || tag.includes('LIST')) return 'GET';
  if (tag.includes('POST') || tag.includes('CREATE') || tag.includes('ADD')) return 'POST';
  if (tag.includes('PUT') || tag.includes('UPDATE') || tag.includes('EDIT')) return 'PUT';
  if (tag.includes('DELETE') || tag.includes('REMOVE')) return 'DELETE';
  if (tag.includes('PATCH')) return 'PATCH';
  return null;
}

function processDailyActivity(requestsOverTime: any[]): Array<{ date: string; day: string; requests: number; success: number; failures: number }> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return requestsOverTime.slice(-7).map(item => {
    const date = new Date(item.period || item.date);
    return {
      date: item.period || item.date,
      day: dayNames[date.getDay()],
      requests: (item.requestsIn || 0) + (item.requestsOut || 0),
      success: item.successCount || 0,
      failures: item.failureCount || 0,
    };
  });
}

function calculateTopEndpoints(logs: any[]): Array<{ name: string; tag: string; method: string; calls: number; avgLatency: number; successRate: number }> {
  const endpointMap: Record<string, {
    name: string;
    tag: string;
    method: string;
    calls: number;
    totalLatency: number;
    successCount: number
  }> = {};

  logs.forEach(log => {
    const tag = log.child_tag || log.action || 'unknown';
    const name = log.name || tag;

    if (!endpointMap[tag]) {
      endpointMap[tag] = {
        name,
        tag,
        method: log.method || extractMethodFromAction(tag) || 'GET',
        calls: 0,
        totalLatency: 0,
        successCount: 0,
      };
    }

    endpointMap[tag].calls++;
    endpointMap[tag].totalLatency += log.latency || 0;
    if (log.status === 'success' || log.successful_execution) {
      endpointMap[tag].successCount++;
    }
  });

  return Object.values(endpointMap)
    .map(endpoint => ({
      name: endpoint.name,
      tag: endpoint.tag,
      method: endpoint.method,
      calls: endpoint.calls,
      avgLatency: endpoint.calls > 0 ? Math.round(endpoint.totalLatency / endpoint.calls) : 0,
      successRate: endpoint.calls > 0 ? Math.round((endpoint.successCount / endpoint.calls) * 100) : 0,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);
}

// ==================== DATABASE DASHBOARD ====================

export interface DatabaseDashboardQuery {
  product_tag: string;
  database_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface DatabaseDashboardMetrics {
  dau: { current: number; previous: number; change: number };
  wau: { current: number; previous: number; change: number };
  mau: { current: number; previous: number; change: number };
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  newOperationsThisWeek: number;
  avgExecutionTime: { current: string; previous: string; change: number };
  activityTimeline: Array<{ date: string; sessions: number }>;
  peakHours: Array<{ hour: string; count: number }>;
  environmentBreakdown: Array<{ env: string; count: number; percentage: number }>;
  methodBreakdown: Array<{ method: string; count: number; percentage: number }>;
}

export interface DatabaseDashboardResponse {
  success: boolean;
  data: DatabaseDashboardMetrics;
}

export const fetchDatabaseDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: DatabaseDashboardQuery
): Promise<DatabaseDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<DatabaseDashboardResponse>(
    `/log/v1/database/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Vector Dashboard Types
export interface VectorDashboardQuery {
  product_tag: string;
  vector_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface VectorDashboardMetrics {
  // Overall stats
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;

  // Operation breakdown
  totalQueries: number;
  totalUpserts: number;
  totalFetches: number;
  totalDeletes: number;

  // Performance
  avgExecutionTime: { current: string; previous: string; change: number };

  // Activity timeline (last 7 days by day name)
  activityTimeline: Array<{ date: string; operations: number }>;

  // Peak activity hours
  peakHours: Array<{ hour: string; count: number }>;

  // Environment breakdown
  environmentBreakdown: Array<{ env: string; count: number; percentage: number }>;

  // Operation type breakdown
  operationBreakdown: Array<{ operation: string; count: number; percentage: number }>;

  // Daily activity (for weekly chart)
  dailyActivity: Array<{
    day: string;
    date: string;
    queries: number;
    upserts: number;
    fetches: number;
    deletes: number;
    totalOperations: number;
  }>;

  // Recent activity summary
  recentActivity: {
    last24Hours: {
      queries: number;
      upserts: number;
      fetches: number;
      deletes: number;
    };
    last7Days: {
      queries: number;
      upserts: number;
      fetches: number;
      deletes: number;
    };
  };
}

export interface VectorDashboardResponse {
  status: boolean;
  data: VectorDashboardMetrics;
}

export const fetchVectorDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: VectorDashboardQuery
): Promise<VectorDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<VectorDashboardResponse>(
    `/log/v1/vector/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Session User Logs Types
export interface SessionUserLogsQuery {
  product_tag: string;
  session_tag: string;
  identifier: string;
  env?: string;
  status?: 'success' | 'fail' | 'processing';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  process_id?: string;  // For searching by process_id
}

export interface SessionUserLogsResponse {
  success: boolean;
  data: {
    logs: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const fetchSessionUserLogs = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: SessionUserLogsQuery
): Promise<{ logs: any[]; total: number; page: number; limit: number; totalPages: number }> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionUserLogsResponse>(
    `/log/v1/session/user-logs/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Session User Dashboard Types
export interface SessionUserDashboardQuery {
  product_tag: string;
  session_tag: string;
  identifier: string;
  env?: string;
}

export interface SessionUserDashboardResult {
  totalLogs: number;
  successRate: number;
  activityTimeline: Array<{ day: string; count: number }>;
  peakHours: Array<{ hour: string; count: number }>;
}

interface SessionUserDashboardResponse {
  success: boolean;
  data: SessionUserDashboardResult;
}

export const fetchSessionUserDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: SessionUserDashboardQuery
): Promise<SessionUserDashboardResult> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionUserDashboardResponse>(
    `/log/v1/session/user-dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

// Graph Dashboard Types
export interface GraphDashboardQuery {
  product_tag: string;
  graph_tag: string;
  env?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}

export interface GraphDashboardMetrics {
  // User activity metrics
  dau: { current: number; previous: number; change: number };
  wau: { current: number; previous: number; change: number };
  mau: { current: number; previous: number; change: number };

  // Overall stats
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  newOperationsThisWeek: number;

  // Performance
  avgExecutionTime: { current: string; previous: string; change: number };

  // Activity timeline (last 7 days by day name)
  activityTimeline: Array<{ date: string; sessions: number }>;

  // Peak activity hours
  peakHours: Array<{ hour: string; count: number }>;

  // Environment breakdown
  environmentBreakdown: Array<{ env: string; count: number; percentage: number }>;

  // Operation breakdown
  operationBreakdown: Array<{ operation: string; count: number; percentage: number }>;
}

export interface GraphDashboardResponse {
  success: boolean;
  data: GraphDashboardMetrics;
}

export const fetchGraphDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  query: GraphDashboardQuery
): Promise<GraphDashboardMetrics> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...query,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<GraphDashboardResponse>(
    `/log/v1/graph/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

const logsServices = {
  fetchLogs,
  fetchSessionDashboard,
  fetchStorageDashboard,
  fetchCacheDashboard,
  fetchMessageBrokerDashboard,
  fetchNotificationDashboard,
  fetchAppDashboard,
  fetchDatabaseDashboard,
  fetchVectorDashboard,
  fetchGraphDashboard,
  fetchSessionUserLogs,
};

export default logsServices;

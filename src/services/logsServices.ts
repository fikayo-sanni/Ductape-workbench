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

const logsServices = {
  fetchLogs,
  fetchSessionDashboard,
  fetchStorageDashboard,
  fetchCacheDashboard,
  fetchMessageBrokerDashboard,
  fetchNotificationDashboard,
};

export default logsServices;

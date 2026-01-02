export interface LogEntry {
  _id: string;
  integration_id: string;
  env: string;
  type: string;
  feature_id: string;
  process_id: string;
  name?: string;
  data: string;
  status: string;
  timestamp: string;
  start?: number;
  end?: number;
  /** Latency/duration in milliseconds */
  latency?: number;
  __v: number;
}

export interface ILog {
  metrics: {
    totalApps: number;
    totalDatabases: number;
    totalFeatures: number;
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
    totalFeaturesUsingAction: {
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
      feature_tag: string;
      env: string;
      type: string;
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
  groupBy?: string;
  start_date?: string;
  end_date?: string;
  component?: string;
  product_id?: string;
  type?: string;
  feature_tag?: string;
  product_tag?: string;
  parent_tag?: string;
  child_tag?: string;
  session_tag?: string;
  app_id?: string;
  env?: string;
  action?: string;
  process_id?: string;
  status?: string;
  tag?: string;
  page?: number;
  limit?: number;
  version?: string | null;
  app_env?: string;
}

export interface FetchLogsData {
  public_key: string;
  workspace_id: string;
  user_id: string;
}

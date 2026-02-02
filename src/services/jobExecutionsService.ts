/**
 * Fetches job executions from the backend job tracker (GET /integrations/v1/job-executions).
 * Used by JobExplorerTab (single-job past/future invocations) and workbench job views.
 */

import apiClient from '@/config/axiosinstance';

export interface JobExecutionApiItem {
  _id?: string;
  job_id: string;
  workspace_id?: string;
  product_id?: string;
  product_tag: string;
  env: string;
  job_tag: string;
  job_type: string;
  phase: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  error_code?: string;
  retry_count?: number;
  triggered_by?: string;
  result_metadata?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  operation?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobExecutionsQueryParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_tag: string;
  env?: string;
  phase?: string;
  job_tag?: string;
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
}

export interface JobExecutionsApiResponse {
  items: JobExecutionApiItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FetchJobExecutionsResult {
  items: JobExecutionApiItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Map backend phase to UI status
 */
export function phaseToStatus(phase: string): 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' {
  switch (phase) {
    case 'COMPLETED':
    case 'completed':
      return 'completed';
    case 'FAILED':
    case 'failed':
      return 'failed';
    case 'RUNNING':
    case 'running':
      return 'running';
    case 'CANCELLED':
    case 'cancelled':
      return 'cancelled';
    case 'SCHEDULED':
    case 'scheduled':
    case 'QUEUED':
    case 'queued':
    case 'RETRY_SCHEDULED':
    case 'retry_scheduled':
    default:
      return 'pending';
  }
}

/**
 * Map backend triggered_by to UI triggeredBy
 */
export function normalizeTrigger(
  triggered_by?: string
): 'schedule' | 'manual' | 'api' | 'webhook' {
  if (!triggered_by) return 'manual';
  const t = (triggered_by || '').toLowerCase();
  if (t === 'schedule' || t === 'cron') return 'schedule';
  if (t === 'api') return 'api';
  if (t === 'webhook') return 'webhook';
  return 'manual';
}

/**
 * Fetch job executions from the integrations API.
 */
export const fetchJobExecutions = async (
  params: JobExecutionsQueryParams
): Promise<FetchJobExecutionsResult> => {
  const query: Record<string, string | number | undefined> = {
    workspace_id: params.workspace_id,
    user_id: params.user_id,
    public_key: params.public_key,
    product_tag: params.product_tag,
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  };
  if (params.env) query.env = params.env;
  if (params.phase) query.phase = params.phase;
  if (params.job_tag) query.job_tag = params.job_tag;
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v));
  });

  const response = await apiClient.get<{ status: boolean; data: JobExecutionsApiResponse }>(
    `/integrations/v1/job-executions?${searchParams.toString()}`
  );

  const data = response.data?.data;
  if (!data) {
    return { items: [], total: 0, page: 1, limit: query.limit as number, hasMore: false };
  }

  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? (query.limit as number),
    hasMore: data.hasMore ?? false,
  };
};

export interface FetchJobExecutionByIdParams {
  executionId: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}

/**
 * Fetch a single job execution by id (GET /integrations/v1/job-executions/:id).
 * Used when expanding / viewing a run detail (input, output, operation, job type).
 */
export const fetchJobExecutionById = async (
  params: FetchJobExecutionByIdParams
): Promise<JobExecutionApiItem | null> => {
  const { executionId, workspace_id, user_id, public_key } = params;
  const searchParams = new URLSearchParams({ workspace_id, user_id, public_key });
  const response = await apiClient.get<{ status: boolean; data: JobExecutionApiItem }>(
    `/integrations/v1/job-executions/${executionId}?${searchParams.toString()}`
  );
  return response.data?.data ?? null;
};

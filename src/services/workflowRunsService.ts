/**
 * Fetches workflow runs (processor results with component=workflow) from the backend.
 * Used by WorkflowExplorerTab.
 */

import apiClient from '@/config/axiosinstance';

export interface ProcessorResultApiItem {
  _id?: string;
  process_id: string;
  status: string;
  start: number;
  end: number;
  env: string;
  /** JSON string or parsed object (backend may return either) */
  result: string | object;
  /** JSON string or parsed object (backend may return either) */
  input: string | object;
  workflow_id?: string;
  workflow_tag?: string;
  product_tag?: string;
  workspace_id?: string;
  component?: string;
  /** Step-level fields when component is workflow_step */
  step_tag?: string;
  step_type?: string;
  step_error?: string;
  step_duration_ms?: number;
}

export interface WorkflowRunsQueryParams {
  workspace_id: string;
  user_id: string;
  public_key: string;
  workflow_tag?: string;
  workflow_id?: string;
  component?: 'workflow' | 'workflow_step';
  product_tag?: string;
  env?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

/** Run/step types used by WorkflowExplorerTab and WorkflowRunTab */
export type StepStatus = 'completed' | 'failed' | 'running' | 'pending' | 'skipped' | 'retrying';
export type RunStatus = 'completed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'timeout';

export interface WorkflowStepUi {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'wait' | 'transform' | 'human' | 'webhook' | 'loop';
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  input?: unknown;
  output?: unknown;
  error?: string;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string }>;
  retryCount?: number;
  maxRetries?: number;
  metadata?: { app?: string; action?: string; integration?: string };
}

export interface WorkflowRunUi {
  id: string;
  runNumber: number;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  input: unknown;
  output: unknown;
  error?: string;
  steps: WorkflowStepUi[];
  triggeredBy: 'manual' | 'schedule' | 'webhook' | 'event' | 'api';
  triggeredByUser?: string;
  version: string;
  tags?: string[];
  /** From workflow result; used to derive steps when step-level processor results are empty */
  completed_steps?: string[];
  step_outputs?: Record<string, unknown>;
  failed_step?: string;
}

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Parse input/result from API (may be JSON string or already-parsed object from backend). */
function normalizeJson<T>(raw: string | object | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Short process_id for run labels (first 8 chars). */
export function shortProcessId(processId: string, length = 8): string {
  if (!processId) return '—';
  return processId.length <= length ? processId : `${processId.slice(0, length)}…`;
}

/** Extract display output from a step result (executor uses { process_id, result } or { output }; step_outputs may use either). */
function stepDisplayOutput(output: unknown): unknown {
  if (output == null) return output;
  const obj = typeof output === 'object' ? (output as Record<string, unknown>) : output;
  if (obj != null && typeof obj === 'object') {
    if ('error' in obj && Object.keys(obj).length <= 2) return obj;
    const r = (obj as { result?: unknown }).result;
    const o = (obj as { output?: unknown }).output;
    if (r !== undefined && r !== null) return r;
    if (o !== undefined && o !== null) return o;
  }
  return obj;
}

/** Map backend processor result (component=workflow) to UI WorkflowRun. Steps come from processor list with workflow_id + component=workflow_step. */
export function mapProcessorResultToWorkflowRun(
  item: ProcessorResultApiItem,
  index: number
): WorkflowRunUi {
  const start = item.start ?? 0;
  const end = item.end ?? 0;
  const duration = start && end ? end - start : null;
  const statusMap: Record<string, RunStatus> = {
    success: 'completed',
    fail: 'failed',
    failed: 'failed',
    completed: 'completed',
    running: 'running',
    pending: 'pending',
    cancelled: 'cancelled',
    timeout: 'timeout',
  };
  const runStatus = statusMap[item.status?.toLowerCase()] ?? 'completed';

  const resultData = normalizeJson<{
    output?: unknown;
    error?: string;
    completed_steps?: string[];
    step_outputs?: Record<string, unknown>;
    failed_step?: string;
  }>(item.result, {});

  const inputData = normalizeJson<{ input?: unknown }>(item.input, {});
  const inputPayload = inputData?.input ?? inputData ?? null;

  return {
    id: item.process_id,
    runNumber: index + 1,
    status: runStatus,
    startedAt: new Date(start).toISOString(),
    completedAt: end ? new Date(end).toISOString() : null,
    duration,
    input: inputPayload,
    output: resultData.output ?? null,
    error: resultData.error,
    steps: [], // Steps are fetched from processor results (workflow_step) in WorkflowRunTab, or derived below when empty
    triggeredBy: 'api',
    version: '1.0.0',
    completed_steps: resultData.completed_steps,
    step_outputs: resultData.step_outputs,
    failed_step: resultData.failed_step,
  };
}

/**
 * Build steps from a run's embedded result (completed_steps, step_outputs).
 * Used when the step-level processor list returns empty (e.g. older runs or step persistence not used).
 */
export function stepsFromRunResult(run: WorkflowRunUi): WorkflowStepUi[] {
  const completed = run.completed_steps;
  const outputs = run.step_outputs ?? {};
  const failedStep = run.failed_step;
  const runError = run.error;
  if (!completed?.length) return [];

  return completed.map((name) => {
    const stepOut = outputs[name];
    const displayOut = stepOut != null && typeof stepOut === 'object' && 'output' in (stepOut as object)
      ? (stepOut as { output?: unknown }).output
      : stepOut;
    const isFailed = name === failedStep;
    return {
      id: `${run.id}:${name}`,
      name,
      type: 'action' as const,
      status: (isFailed ? 'failed' : 'completed') as StepStatus,
      startedAt: null,
      completedAt: null,
      duration: null,
      output: displayOut,
      error: isFailed ? runError : undefined,
      logs: [],
    };
  });
}

/**
 * Same as stepsFromRunResult but returns ProcessorResultApiItem[] so the run tab can use
 * the same raw-step UI (process_id, step_tag, result, etc.) when the step list API returns empty.
 */
export function rawStepsFromRunResult(run: WorkflowRunUi): ProcessorResultApiItem[] {
  const completed = run.completed_steps;
  const outputs = run.step_outputs ?? {};
  const failedStep = run.failed_step;
  const runError = run.error;
  if (!completed?.length) return [];

  return completed.map((name) => {
    const stepOut = outputs[name];
    const isFailed = name === failedStep;
    const resultPayload = stepOut != null ? (typeof stepOut === 'object' ? stepOut : { result: stepOut }) : {};
    return {
      process_id: `${run.id}:${name}`,
      step_tag: name,
      status: isFailed ? 'fail' : 'success',
      start: 0,
      end: 0,
      env: '',
      input: {},
      result: resultPayload,
      step_error: isFailed ? runError : undefined,
      step_duration_ms: undefined,
    };
  });
}

/**
 * Fetch workflow runs from GET /integrations/v1/processor/list.
 */
export const fetchWorkflowRuns = async (
  params: WorkflowRunsQueryParams
): Promise<ProcessorResultApiItem[]> => {
  const query: Record<string, string | number | undefined> = {
    workspace_id: params.workspace_id,
    user_id: params.user_id,
    public_key: params.public_key,
    limit: params.limit ?? 100,
  };
  if (params.workflow_tag) query.workflow_tag = params.workflow_tag;
  if (params.workflow_id) query.workflow_id = params.workflow_id;
  if (params.component) query.component = params.component;
  if (params.product_tag) query.product_tag = params.product_tag;
  if (params.env) query.env = params.env;
  if (params.status) query.status = params.status;
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v));
  });

  const response = await apiClient.get<{ status?: boolean; data?: ProcessorResultApiItem[] }>(
    `/integrations/v1/processor/list?${searchParams.toString()}`
  );

  // Backend returns { status: true, data: array }; normalize to array
  const raw = response.data?.data ?? response.data;
  const data = Array.isArray(raw) ? raw : [];
  return data;
};

/**
 * Fetch step-level processor results for a workflow run (workflow_id).
 * Used by WorkflowRunTab to show steps from ProcessorResults.
 */
export const fetchWorkflowStepResults = async (
  params: WorkflowRunsQueryParams & { workflow_id: string }
): Promise<ProcessorResultApiItem[]> => {
  return fetchWorkflowRuns({
    ...params,
    workflow_id: params.workflow_id,
    component: 'workflow_step',
    limit: params.limit ?? 200,
  });
};

/** Map backend step_type (e.g. action, produce, notification) to WorkflowStepUi.type */
const STEP_TYPE_UI_MAP: Record<string, WorkflowStepUi['type']> = {
  action: 'action',
  produce: 'action',
  producer: 'action',
  notification: 'action',
  storage: 'action',
  database_action: 'action',
  graph: 'action',
  vector: 'action',
  quota: 'action',
  fallback: 'action',
  child_workflow: 'action',
  checkpoint: 'action',
  sleep: 'wait',
  wait_for_signal: 'wait',
  condition: 'condition',
  parallel: 'parallel',
  transform: 'transform',
  human: 'human',
  webhook: 'webhook',
  loop: 'loop',
};

function mapStepTypeToUi(stepType?: string): WorkflowStepUi['type'] {
  if (!stepType) return 'action';
  const normalized = stepType.toLowerCase().replace(/-/g, '_');
  return STEP_TYPE_UI_MAP[normalized] ?? 'action';
}

/**
 * Backend persists step result with process_id = workflow_id:step_tag, input (JSON string),
 * result (JSON with process_id, result), step_duration_ms, step_tag, step_type, step_error.
 * API may return input/result as string or object. Same process_id is used in logs for correlation.
 */
function mapProcessorStepToWorkflowStep(item: ProcessorResultApiItem, index: number): WorkflowStepUi {
  const start = item.start ?? 0;
  const end = item.end ?? 0;
  const duration = item.step_duration_ms ?? (start && end ? end - start : null);
  const statusMap: Record<string, StepStatus> = {
    success: 'completed',
    fail: 'failed',
    failed: 'failed',
    completed: 'completed',
    running: 'running',
    pending: 'pending',
  };
  const status = statusMap[item.status?.toLowerCase()] ?? 'completed';
  const resultData = normalizeJson<{
    process_id?: string;
    result?: unknown;
    output?: unknown;
    error?: string;
  }>(item.result, {});
  const inputData = normalizeJson<unknown>(item.input, undefined);
  const rawResult = resultData?.result;
  const output = stepDisplayOutput(resultData) ?? resultData?.output ?? resultData?.result ?? resultData;
  const errorFromResult =
    typeof rawResult === 'object' && rawResult !== null && rawResult !== undefined && 'error' in (rawResult as object)
      ? (rawResult as { error?: string }).error
      : undefined;
  const error = item.step_error ?? errorFromResult ?? resultData?.error;
  return {
    id: item.process_id,
    name: item.step_tag ?? `step-${index + 1}`,
    type: mapStepTypeToUi(item.step_type),
    status,
    startedAt: start ? new Date(start).toISOString() : null,
    completedAt: end ? new Date(end).toISOString() : null,
    duration,
    input: inputData,
    output,
    error,
    logs: [],
    metadata: undefined,
  };
}

/** Map an array of step-level processor results to WorkflowStepUi[] (execution order) */
export function mapProcessorStepResultsToSteps(items: ProcessorResultApiItem[]): WorkflowStepUi[] {
  return items.map((item, i) => mapProcessorStepToWorkflowStep(item, i));
}

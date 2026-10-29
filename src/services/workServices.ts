/**
 * Talks to the work tracker (/tickets/v1/work). People use it from the Work area: reading the board, the agents and
 * an item's history, and the few changes a person makes (create, assign, prioritise, approve, release, pause an agent).
 * Every call carries the signed-in person's workspace access, like the other Workbench services.
 */

import apiClient from '@/config/axiosinstance';
import type { IAgentInfo, IWorkItem, IWorkProduct, IWorkSession, IWorkComponent } from '@/utils/workBoard';

const BASE = '/tickets/v1/work';

export interface IWorkAuth {
  workspaceId: string;
  userId: string;
  publicKey: string;
}

const params = (auth: IWorkAuth, extra: Record<string, string | undefined> = {}) => {
  const q = new URLSearchParams({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey });
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== '') q.set(k, v);
  return q;
};
const body = (auth: IWorkAuth, extra: Record<string, unknown> = {}) => ({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey, ...extra });

/** The server's explanation of a refusal, so a screen can show it as written. */
export function workErrorMessage(error: unknown): string {
  const e = error as { response?: { data?: { errors?: unknown } }; message?: string };
  const text = e?.response?.data?.errors;
  return typeof text === 'string' ? text : e?.message ?? 'Something went wrong.';
}

export interface IWorkEvent {
  id: string;
  type: string;
  actor: { type: 'user' | 'agent'; user_id: string; agent_id: string | null };
  data: Record<string, any>;
  at: string;
}

export interface IItemBrief {
  ref: string;
  id: string;
  title: string;
  status: string;
}

export interface IWorkContext {
  item: IWorkItem;
  parents: IWorkItem[];
  children: IWorkItem[];
  blocked_by: IItemBrief[];
  blocks: IItemBrief[];
  claim: { session_id: string | null; agent_id: string | null; user_id: string; repo: string; paths: string[]; claimed_at: string; expires_at: string } | null;
  overlaps: Array<{ item: { ref: string; title: string } | null; held_by: any; paths: Array<{ mine: string; theirs: string }>; components: string[] }>;
  events: IWorkEvent[];
}

export async function fetchWorkProducts(auth: IWorkAuth): Promise<IWorkProduct[]> {
  const { data } = await apiClient.get<{ data: IWorkProduct[] }>(`${BASE}/products?${params(auth)}`);
  return data.data ?? [];
}

export async function fetchWorkItems(auth: IWorkAuth, product: string): Promise<{ items: IWorkItem[]; total: number; agents?: Record<string, IAgentInfo> }> {
  const { data } = await apiClient.get<{ data: { items: IWorkItem[]; total: number; agents?: Record<string, IAgentInfo> } }>(`${BASE}/items?${params(auth, { product, limit: '200' })}`);
  return data.data;
}

export async function fetchWorkSessions(auth: IWorkAuth, product?: string): Promise<IWorkSession[]> {
  const { data } = await apiClient.get<{ data: IWorkSession[] }>(`${BASE}/sessions?${params(auth, { product })}`);
  return data.data ?? [];
}

export async function fetchWorkDependencies(auth: IWorkAuth, product: string): Promise<Array<{ from: string; to: string; type: string }>> {
  const { data } = await apiClient.get<{ data: Array<{ from: string; to: string; type: string }> }>(`${BASE}/dependencies?${params(auth, { product })}`);
  return data.data ?? [];
}

export async function fetchWorkContext(auth: IWorkAuth, ref: string): Promise<IWorkContext> {
  const { data } = await apiClient.get<{ data: IWorkContext }>(`${BASE}/items/${encodeURIComponent(ref)}/context?${params(auth)}`);
  return data.data;
}

export interface INewWorkItem {
  title: string;
  body?: string;
  product: string;
  priority?: IWorkItem['priority'];
  components?: IWorkComponent[];
  critical?: boolean;
  assignee?: 'me';
  kind?: 'task' | 'epic' | 'subtask';
  parent?: string;
}

/** Creates one work item in a product. */
export async function createWorkItem(auth: IWorkAuth, input: INewWorkItem): Promise<IWorkItem> {
  const { data } = await apiClient.post<{ data: IWorkItem }>(`${BASE}/items`, body(auth, input as unknown as Record<string, unknown>));
  return data.data;
}

/** Changes an item: priority, status, critical, a note. Each change the person makes is its own call. */
export async function updateWorkItem(auth: IWorkAuth, ref: string, patch: Record<string, unknown>): Promise<IWorkItem> {
  const { data } = await apiClient.patch<{ data: IWorkItem }>(`${BASE}/items/${encodeURIComponent(ref)}`, body(auth, patch));
  return data.data;
}

/** Finishes an item as a person: how a critical item an agent finished is approved. */
export async function completeWorkItem(auth: IWorkAuth, ref: string, outcome: string): Promise<{ item: IWorkItem; unblocked: string[] }> {
  const { data } = await apiClient.post<{ data: { item: IWorkItem; unblocked: string[] } }>(`${BASE}/items/${encodeURIComponent(ref)}/complete`, body(auth, { outcome }));
  return data.data;
}

/** Takes an item back from whoever holds it, so it can be picked up again. */
export async function releaseWorkItem(auth: IWorkAuth, ref: string, note: string): Promise<IWorkItem> {
  const { data } = await apiClient.post<{ data: IWorkItem }>(`${BASE}/items/${encodeURIComponent(ref)}/release`, body(auth, { note }));
  return data.data;
}

/** Pauses an agent: its claims are released and its next call is refused with the reason. */
export async function pauseAgent(auth: IWorkAuth, agentId: string, reason: string): Promise<void> {
  await apiClient.post(`${BASE}/agents/${encodeURIComponent(agentId)}/pause`, body(auth, { reason }));
}

export async function resumeAgent(auth: IWorkAuth, agentId: string): Promise<void> {
  await apiClient.post(`${BASE}/agents/${encodeURIComponent(agentId)}/resume`, body(auth));
}

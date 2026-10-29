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

/**
 * Proof that the person, not an agent with their sign-in, is acting: a grant from a code emailed to them, held in
 * memory only (never in storage an agent could read) and sent with work tracker calls until it expires.
 */
let held: { grant: string; expiresAt: number; workspaceId: string } | null = null;

export function heldGrant(workspaceId: string): string | undefined {
  if (!held || held.workspaceId !== workspaceId || held.expiresAt <= Date.now()) return undefined;
  return held.grant;
}

apiClient.interceptors.request.use((config) => {
  if (held && held.expiresAt > Date.now() && typeof config.url === 'string' && config.url.startsWith(BASE)) {
    config.headers.set?.('x-ductape-grant', held.grant);
  }
  return config;
});

/** Whether a refusal asks the person for a code from their email. */
export function needsStepUp(error: unknown): boolean {
  const e = error as { response?: { status?: number; data?: { meta?: { code?: string } } } };
  return e?.response?.status === 403 && e?.response?.data?.meta?.code === 'STEP_UP_REQUIRED';
}

export async function startWorkStepUp(auth: IWorkAuth): Promise<{ required: boolean; sent_to?: string; expires_at?: string }> {
  const { data } = await apiClient.post<{ data: { required: boolean; sent_to?: string; expires_at?: string } }>(`${BASE}/step-up/start`, body(auth));
  return data.data;
}

export async function verifyWorkStepUp(auth: IWorkAuth, code: string): Promise<void> {
  const { data } = await apiClient.post<{ data: { required: boolean; grant?: string; expires_at?: string } }>(`${BASE}/step-up/verify`, body(auth, { code }));
  if (data.data.grant) held = { grant: data.data.grant, expiresAt: Date.parse(data.data.expires_at ?? '') || Date.now() + 15 * 60_000, workspaceId: auth.workspaceId };
}

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

/** An item waiting for approval, with who finished it and since when. */
export interface IApprovalItem extends IWorkItem {
  waiting_since: string;
  finished_by: { type: 'user' | 'agent'; user_id: string; agent_id: string | null } | null;
  /** The person asking finished it, or their own agent did. */
  own: boolean;
}

/** What waits for a person's approval: every product, or one. */
export async function fetchWorkApprovals(auth: IWorkAuth, product?: string): Promise<{ items: IApprovalItem[]; agents: Record<string, IAgentInfo> }> {
  const { data } = await apiClient.get<{ data: { items: IApprovalItem[]; agents: Record<string, IAgentInfo> } }>(`${BASE}/approvals?${params(auth, { product })}`);
  return data.data;
}

/** Approves work waiting for approval: it is completed and the approval recorded with the note. */
export async function approveWorkItem(auth: IWorkAuth, ref: string, note: string): Promise<{ item: IWorkItem; unblocked: string[] }> {
  const { data } = await apiClient.post<{ data: { item: IWorkItem; unblocked: string[] } }>(`${BASE}/items/${encodeURIComponent(ref)}/approve`, body(auth, { note: note || undefined }));
  return data.data;
}

/** Sends work waiting for approval back to whoever did it, saying what to change. */
export async function sendBackWorkItem(auth: IWorkAuth, ref: string, note: string): Promise<IWorkItem> {
  const { data } = await apiClient.post<{ data: IWorkItem }>(`${BASE}/items/${encodeURIComponent(ref)}/request-changes`, body(auth, { note }));
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

/** What a rule can watch: the kinds of product component whose failures the SDK logs. */
export const RULE_KINDS = [
  { kind: 'job', label: 'Job', component: 'job' },
  { kind: 'feature', label: 'Feature', component: 'feature' },
  { kind: 'app', label: 'App actions', component: 'app' },
  { kind: 'database', label: 'Database', component: 'database' },
  { kind: 'event', label: 'Event broker', component: 'event' },
  { kind: 'notification', label: 'Notifications', component: 'notification' },
  { kind: 'storage', label: 'Storage', component: 'storage' },
  { kind: 'cache', label: 'Cache', component: 'cache' },
  { kind: 'function', label: 'Function', component: 'function' },
  { kind: 'healthcheck', label: 'Healthcheck', component: 'healthcheck' },
  { kind: 'webhook', label: 'Webhook', component: null },
] as const;
export type RuleKind = (typeof RULE_KINDS)[number]['kind'];

export interface IWorkRule {
  id: string;
  product: string;
  name: string;
  enabled: boolean;
  watch: { kind: RuleKind; tag: string; env: string | null };
  threshold: { failures: number; within_minutes: number };
  item: { priority: IWorkItem['priority']; critical: boolean; labels: string[] };
  description: string;
  open_item_id: string | null;
  last_fired_at: string | null;
  fired_count: number;
  created_by: string;
  created_at: string;
}

export interface INewWorkRule {
  product: string;
  name: string;
  watch: { kind: RuleKind; tag: string; env?: string | null };
  threshold: { failures: number; within_minutes: number };
  item: { priority: IWorkItem['priority']; critical: boolean };
}

export async function fetchWorkRules(auth: IWorkAuth, product: string): Promise<IWorkRule[]> {
  const { data } = await apiClient.get<{ data: IWorkRule[] }>(`${BASE}/rules?${params(auth, { product })}`);
  return data.data;
}

export async function createWorkRule(auth: IWorkAuth, input: INewWorkRule): Promise<IWorkRule> {
  const { data } = await apiClient.post<{ data: IWorkRule }>(`${BASE}/rules`, body(auth, input as unknown as Record<string, unknown>));
  return data.data;
}

export async function updateWorkRule(auth: IWorkAuth, id: string, patch: Partial<INewWorkRule> & { enabled?: boolean }): Promise<IWorkRule> {
  const { data } = await apiClient.patch<{ data: IWorkRule }>(`${BASE}/rules/${encodeURIComponent(id)}`, body(auth, patch as Record<string, unknown>));
  return data.data;
}

export async function deleteWorkRule(auth: IWorkAuth, id: string): Promise<void> {
  await apiClient.delete(`${BASE}/rules/${encodeURIComponent(id)}`, { data: body(auth) });
}

/** The workspace's work policy, with the asking person's role and whether they may change it. */
export interface IWorkPolicy {
  approvers: 'members' | 'admins';
  allow_self_approval: boolean;
  critical_components: string[];
  agents_claim_unassigned: boolean;
  your_role: 'owner' | 'admin' | 'collaborator';
  can_change: boolean;
}

export async function fetchWorkPolicy(auth: IWorkAuth): Promise<IWorkPolicy> {
  const { data } = await apiClient.get<{ data: IWorkPolicy }>(`${BASE}/policy?${params(auth)}`);
  return data.data;
}

export async function saveWorkPolicy(auth: IWorkAuth, policy: Partial<Omit<IWorkPolicy, 'your_role' | 'can_change'>>): Promise<IWorkPolicy> {
  const { data } = await apiClient.put<{ data: IWorkPolicy }>(`${BASE}/policy`, body(auth, policy as Record<string, unknown>));
  return data.data;
}

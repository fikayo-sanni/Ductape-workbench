/**
 * Talks to the Ductape Deploy control plane. Reads are plain; every change (approving, applying, planning, retiring, changing a
 * policy, stopping a build) is a separate function that names exactly what it does, so no screen changes something by accident.
 * A change that needs an emailed code takes the grant the person earned for that one change and sends it as a header.
 */

import apiClient from '@/config/axiosinstance';
import type { DeployableKind, IBuild, IDeployment, IJournalEntry, IProductEnvironment } from '@/utils/deployments';
import {
  STEP_UP_HEADER,
  type IDeployCapabilities, type IDeploymentPlanRequest, type IDeprecationInput, type IFunctionSummary, type INewPlanRequest, type IPlanDetail, type IPlanRow,
  type IPolicyChangeRow, type IPolicyDraft, type IReleaseLike, type IVersionEvent, type IVersionRow,
} from '@/utils/deployControls';

const BASE = '/integrations/v1/deploy';

export interface IDeployAuth {
  workspaceId: string;
  userId: string;
  publicKey: string;
}

const params = (auth: IDeployAuth, extra: Record<string, string | undefined> = {}): URLSearchParams => {
  const query = new URLSearchParams({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey });
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  return query;
};

/** Every deployment of a product, newest change first. */
export async function fetchProductDeployments(auth: IDeployAuth, productTag: string, kind?: DeployableKind): Promise<IDeployment[]> {
  const { data } = await apiClient.get<{ data: IDeployment[] }>(`${BASE}/deployments?${params(auth, { product: productTag, kind })}`);
  return data.data ?? [];
}

/** Every deployment in the workspace, newest change first. The server returns the latest 200. */
export const WORKSPACE_DEPLOYMENTS_LIMIT = 200;
export async function fetchWorkspaceDeployments(auth: IDeployAuth): Promise<IDeployment[]> {
  const { data } = await apiClient.get<{ data: IDeployment[] }>(`${BASE}/deployments?${params(auth)}`);
  return data.data ?? [];
}

/** Every build in the workspace, newest first. The server returns the latest 100. */
export async function fetchWorkspaceBuilds(auth: IDeployAuth): Promise<IBuild[]> {
  const { data } = await apiClient.get<{ data: IBuild[] }>(`${BASE}/builds?${params(auth)}`);
  return data.data ?? [];
}

/** The product's environments with how each is governed. */
export async function fetchProductEnvironments(auth: IDeployAuth, productTag: string): Promise<IProductEnvironment[]> {
  const { data } = await apiClient.get<{ data: IProductEnvironment[] }>(`${BASE}/products/${encodeURIComponent(productTag)}/environments?${params(auth)}`);
  return data.data ?? [];
}

/** What happened to one deployment, oldest first. */
export async function fetchDeploymentJournal(auth: IDeployAuth, deploymentId: string): Promise<IJournalEntry[]> {
  const { data } = await apiClient.get<{ data: IJournalEntry[] }>(`${BASE}/deployments/${encodeURIComponent(deploymentId)}/journal?${params(auth)}`);
  return data.data ?? [];
}

/** Everything applied through one cloud connection, across every product, newest change first. */
export async function fetchConnectionDeployments(auth: IDeployAuth, connectionTag: string): Promise<IDeployment[]> {
  const { data } = await apiClient.get<{ data: IDeployment[] }>(`${BASE}/deployments?${params(auth, { connection: connectionTag })}`);
  return data.data ?? [];
}

/** Every build that ran through one cloud connection, newest first. */
export async function fetchConnectionBuilds(auth: IDeployAuth, connectionTag: string): Promise<IBuild[]> {
  const { data } = await apiClient.get<{ data: IBuild[] }>(`${BASE}/builds?${params(auth, { connection: connectionTag })}`);
  return data.data ?? [];
}

// ---- Reads for reviewing and deciding ---------------------------------------------------------------------------------------------

export interface IRelease extends IReleaseLike {
  id: string;
  imageDigest: string;
  imageRepository: string;
  source?: { buildId?: string; sourceSha256?: string };
}

/** What this control plane will and will not do, so a button can say why it is off before it is clicked. */
export async function fetchCapabilities(auth: IDeployAuth): Promise<IDeployCapabilities> {
  const { data } = await apiClient.get<{ data: IDeployCapabilities }>(`${BASE}/capabilities?${params(auth)}`);
  return data.data;
}

export async function fetchPlans(auth: IDeployAuth, filters: { product?: string; env?: string; stage?: string } = {}): Promise<IPlanRow[]> {
  const { data } = await apiClient.get<{ data: IPlanRow[] }>(`${BASE}/plans?${params(auth, { ...filters, limit: '100' })}`);
  return data.data ?? [];
}

export async function fetchPlan(auth: IDeployAuth, planId: string): Promise<IPlanDetail> {
  const { data } = await apiClient.get<{ data: IPlanDetail }>(`${BASE}/plans/${encodeURIComponent(planId)}?${params(auth)}`);
  return data.data;
}

export async function fetchReleases(auth: IDeployAuth, productTag: string): Promise<IRelease[]> {
  const { data } = await apiClient.get<{ data: IRelease[] }>(`${BASE}/releases?${params(auth, { product: productTag, limit: '100' })}`);
  return data.data ?? [];
}

export async function fetchFunctions(auth: IDeployAuth, productTag: string): Promise<IFunctionSummary[]> {
  const { data } = await apiClient.get<{ data: IFunctionSummary[] }>(`${BASE}/functions?${params(auth, { product: productTag })}`);
  return data.data ?? [];
}

export async function fetchVersions(auth: IDeployAuth, productTag: string, name: string): Promise<IVersionRow[]> {
  const { data } = await apiClient.get<{ data: IVersionRow[] }>(`${BASE}/functions/${encodeURIComponent(productTag)}/${encodeURIComponent(name)}/versions?${params(auth)}`);
  return data.data ?? [];
}

export async function fetchVersionHistory(auth: IDeployAuth, productTag: string, name: string, version: string): Promise<IVersionEvent[]> {
  const { data } = await apiClient.get<{ data: IVersionEvent[] }>(
    `${BASE}/functions/${encodeURIComponent(productTag)}/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}/history?${params(auth)}`,
  );
  return data.data ?? [];
}

export async function fetchPolicyChanges(auth: IDeployAuth, productTag: string, env: string): Promise<IPolicyChangeRow[]> {
  const { data } = await apiClient.get<{ data: IPolicyChangeRow[] }>(`${BASE}/products/${encodeURIComponent(productTag)}/environments/${encodeURIComponent(env)}/policy-changes?${params(auth)}`);
  return data.data ?? [];
}

export async function fetchBuilds(auth: IDeployAuth, productTag: string): Promise<IBuild[]> {
  const { data } = await apiClient.get<{ data: IBuild[] }>(`${BASE}/builds?${params(auth, { product: productTag })}`);
  return data.data ?? [];
}

// ---- Step-up: an emailed code, then a grant good for one change --------------------------------------------------------------------

export interface IStepUpStarted { sentTo: string; expiresAt: string; scope: string }
export interface IStepUpGrant { grant: string; expiresAt: string; scope: string }

export async function startStepUp(auth: IDeployAuth, scope: string): Promise<IStepUpStarted> {
  const { data } = await apiClient.post<{ data: IStepUpStarted }>(`${BASE}/step-up/start?${params(auth)}`, { scope });
  return data.data;
}

export async function verifyStepUp(auth: IDeployAuth, scope: string, code: string): Promise<IStepUpGrant> {
  const { data } = await apiClient.post<{ data: IStepUpGrant }>(`${BASE}/step-up/verify?${params(auth)}`, { scope, code: code.trim() });
  return data.data;
}

const withGrant = (grant: string | undefined) => (grant ? { headers: { [STEP_UP_HEADER]: grant } } : undefined);

// ---- Changes ----------------------------------------------------------------------------------------------------------------------

/** A new plan for a release in an environment. Nothing in the cloud changes until the plan is approved and applied. */
export async function createPlan(auth: IDeployAuth, body: INewPlanRequest): Promise<IPlanRow> {
  const { data } = await apiClient.post<{ data: IPlanRow }>(`${BASE}/plans?${params(auth)}`, body);
  return data.data;
}

/** A plan to redeploy, roll back or change the traffic of a deployment that exists. */
export async function createDeploymentPlan(auth: IDeployAuth, deploymentId: string, body: IDeploymentPlanRequest): Promise<IPlanRow> {
  const { data } = await apiClient.post<{ data: IPlanRow }>(`${BASE}/deployments/${encodeURIComponent(deploymentId)}/plans?${params(auth)}`, body);
  return data.data;
}

export async function approvePlan(auth: IDeployAuth, planId: string, grant?: string): Promise<IPlanRow> {
  const { data } = await apiClient.post<{ data: IPlanRow }>(`${BASE}/plans/${encodeURIComponent(planId)}/approve?${params(auth)}`, {}, withGrant(grant));
  return data.data;
}

export async function applyPlan(auth: IDeployAuth, planId: string): Promise<unknown> {
  const { data } = await apiClient.post<{ data: unknown }>(`${BASE}/plans/${encodeURIComponent(planId)}/apply?${params(auth)}`, {});
  return data.data;
}

const versionPath = (productTag: string, name: string, version: string): string =>
  `${BASE}/functions/${encodeURIComponent(productTag)}/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`;

export async function deprecateVersion(auth: IDeployAuth, productTag: string, name: string, version: string, input: IDeprecationInput): Promise<IVersionRow> {
  const { data } = await apiClient.post<{ data: IVersionRow }>(`${versionPath(productTag, name, version)}/deprecate?${params(auth)}`, input);
  return data.data;
}

export async function undeprecateVersion(auth: IDeployAuth, productTag: string, name: string, version: string): Promise<IVersionRow> {
  const { data } = await apiClient.post<{ data: IVersionRow }>(`${versionPath(productTag, name, version)}/undeprecate?${params(auth)}`, {});
  return data.data;
}

/** Ends a version's life. One way. It stops routing to it and records the change; nothing in the cloud is deleted. */
export async function retireVersion(auth: IDeployAuth, productTag: string, name: string, version: string, grant?: string): Promise<IVersionRow> {
  const { data } = await apiClient.post<{ data: IVersionRow }>(`${versionPath(productTag, name, version)}/retire?${params(auth)}`, {}, withGrant(grant));
  return data.data;
}

export async function setEnvironmentPolicy(auth: IDeployAuth, productTag: string, env: string, policy: IPolicyDraft, grant?: string): Promise<unknown> {
  const { data } = await apiClient.put<{ data: unknown }>(
    `${BASE}/products/${encodeURIComponent(productTag)}/environments/${encodeURIComponent(env)}/policy?${params(auth)}`, policy, withGrant(grant),
  );
  return data.data;
}

/** Stops a build that is waiting for its source or running. */
export async function cancelBuild(auth: IDeployAuth, buildId: string): Promise<IBuild> {
  const { data } = await apiClient.post<{ data: IBuild }>(`${BASE}/builds/${encodeURIComponent(buildId)}/cancel?${params(auth)}`, {});
  return data.data;
}

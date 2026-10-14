/**
 * Reads from the Ductape Deploy control plane. Everything here only reads: approving a plan or changing how an environment is
 * governed stays with the terminal until the workbench has screens for them.
 */

import apiClient from '@/config/axiosinstance';
import type { DeployableKind, IDeployment, IJournalEntry, IProductEnvironment } from '@/utils/deployments';

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
  const { data } = await apiClient.get<{ data: IDeployment[] }>(`${BASE}/deployments?${params(auth, { productTag, kind })}`);
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

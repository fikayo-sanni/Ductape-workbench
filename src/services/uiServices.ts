import apiClient from '@/config/axiosinstance';
import type { IDeployAuth } from '@/services/deployServices';

/**
 * The workspace's registry of UI pieces (/integrations/v1/ui): frontend source published once with `ductape ui publish` and
 * added to applications with `ductape ui add`. The Workbench reads it and lets a person deprecate versions; it never publishes.
 */
const BASE = '/integrations/v1/ui';

export interface IUiDeprecation { reason?: string; replacement?: string; at: string; by: string }

export interface IUiListEntry { name: string; framework: string; description?: string; latest?: string; versions: number; updatedAt: string }

export interface IUiVersionSummary {
  name: string;
  version: string;
  framework: string;
  description?: string;
  integrity: string;
  bytes: number;
  files: number;
  publishedAt: string;
  publishedBy: string;
  deprecated: boolean;
  deprecation?: IUiDeprecation;
}

export interface IUiDetail { name: string; framework: string; latest?: string; versions: IUiVersionSummary[] }

export interface IUiManifest {
  name: string;
  version: string;
  framework: 'react' | 'vue' | 'javascript' | string;
  entry: string;
  description?: string;
  peerDependencies: Record<string, string>;
  uses?: Record<string, string>;
  requires?: { actions?: Array<{ app: string; action: string }>; features?: string[]; sessions?: string[] };
}

export interface IUiVersionDetail extends IUiVersionSummary {
  manifest: IUiManifest;
  fileList: Array<{ path: string; sha256: string; bytes: number }>;
}

export interface IUiPackFile { path: string; sha256: string; bytes: number; content: string }

const params = (auth: IDeployAuth, extra: Record<string, string | undefined> = {}): URLSearchParams => {
  const query = new URLSearchParams({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey });
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  return query;
};
const piece = (name: string) => `${BASE}/${encodeURIComponent(name)}`;
const version = (name: string, v: string) => `${piece(name)}/versions/${encodeURIComponent(v)}`;
const body = (auth: IDeployAuth, extra: Record<string, unknown>) => ({ workspace_id: auth.workspaceId, user_id: auth.userId, public_key: auth.publicKey, ...extra });

export async function fetchUiPieces(auth: IDeployAuth, search?: string): Promise<IUiListEntry[]> {
  const { data } = await apiClient.get<{ data: IUiListEntry[] }>(`${BASE}?${params(auth, { search })}`);
  return data.data ?? [];
}

export async function fetchUiPiece(auth: IDeployAuth, name: string): Promise<IUiDetail> {
  const { data } = await apiClient.get<{ data: IUiDetail }>(`${piece(name)}?${params(auth)}`);
  return data.data;
}

export async function fetchUiVersion(auth: IDeployAuth, name: string, v: string): Promise<IUiVersionDetail> {
  const { data } = await apiClient.get<{ data: IUiVersionDetail }>(`${version(name, v)}?${params(auth)}`);
  return data.data;
}

/** The full artifact, for reading its source. The service checks it against its integrity before sending it. */
export async function fetchUiFiles(auth: IDeployAuth, name: string, v: string): Promise<IUiPackFile[]> {
  const { data } = await apiClient.get<{ data: { pack: { files: IUiPackFile[] } } }>(`${version(name, v)}/pack?${params(auth)}`);
  return data.data.pack.files;
}

export async function deprecateUiVersion(auth: IDeployAuth, name: string, v: string, input: { reason: string; replacement?: string }): Promise<IUiVersionSummary> {
  const { data } = await apiClient.post<{ data: IUiVersionSummary }>(`${version(name, v)}/deprecate`, body(auth, { reason: input.reason, ...(input.replacement ? { replacement: input.replacement } : {}) }));
  return data.data;
}

export async function undeprecateUiVersion(auth: IDeployAuth, name: string, v: string): Promise<IUiVersionSummary> {
  const { data } = await apiClient.post<{ data: IUiVersionSummary }>(`${version(name, v)}/undeprecate`, body(auth, {}));
  return data.data;
}

/**
 * Whether an action is available to a product in an environment, from the same contract lookup `ductape ui check` uses. The
 * lookup answers 400 with its reason when the action is not there; anything else is a failure to ask.
 */
export async function checkActionAvailable(auth: IDeployAuth, product: string, env: string, app: string, action: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await apiClient.get(`/integrations/v1/action-contract?${params(auth, { product_tag: product, env_slug: env, access_tag: app, action_tag: action })}`);
    return { ok: true };
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: { errors?: unknown; message?: unknown } } }).response;
    if (response?.status === 400) {
      const reason = response.data?.errors ?? response.data?.message;
      return { ok: false, reason: typeof reason === 'string' ? reason : 'Not available in this product and environment' };
    }
    throw error;
  }
}

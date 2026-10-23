import apiClient from '@/config/axiosinstance';

/**
 * Hosted marketplace import (self-hosted instances only). The instance backend talks to the hosted marketplace;
 * these wrap the instance's own /apps/v1/remote endpoints.
 */

export type RemotePricingKind = 'free' | 'one_time' | 'subscription' | 'metered';

export interface RemotePricingPlan {
  id: string;
  name: string;
  pricing_mode: string;
  interval: string | null;
  unit_price: number | null;
  currency: string | null;
  kind: RemotePricingKind | string;
}

export interface RemoteStatus {
  enabled: boolean;
  reason: string | null;
  max_apps: number | null;
  imported: number;
}

export interface RemoteCatalogApp {
  remote_app_id: string;
  tag: string;
  app_name: string;
  description?: string;
  logo?: string;
  colors?: unknown;
  website?: string;
  publisher: string | null;
  domains: string[];
  latest_version: string | null;
  imported: boolean;
  local_app_id: string | null;
  imported_version: string | null;
  update_available: boolean;
}

export interface RemoteCatalogPage {
  apps: RemoteCatalogApp[];
  total: number;
  page: number;
  pages: number;
}

export interface RemoteCatalogDetail extends RemoteCatalogApp {
  aboutText?: string;
  versions: string[];
  actions_count: number;
  pricing: {
    kind: RemotePricingKind;
    plans: RemotePricingPlan[];
  };
}

export type OriginState = 'active' | 'grace' | 'disabled';

export interface OriginSummary {
  kind: 'remote_marketplace';
  remote_app_id: string;
  publisher: { workspace_id?: string; name?: string };
  imported_version: string;
  available_version: string | null;
  locked: boolean;
  state: OriginState;
  entitlement_kind: string | null;
  expires_at: string | null;
  withdrawn_at: string | null;
  checked_at: string | null;
}

export interface RemoteImportedApp {
  app_id: string;
  tag: string;
  app_name: string;
  logo?: string;
  description?: string;
  workspace_id: string;
  origin: OriginSummary;
}

export interface RemoteUpdateCheckEntry {
  app_id: string;
  tag: string;
  app_name: string;
  origin: OriginSummary;
}

export interface RemoteImportResult {
  already_imported: boolean;
  app_id: string;
  tag: string;
  version?: string;
}

export interface RemoteAuth {
  user_id: string;
  public_key: string;
}

interface Envelope<T> {
  status: boolean;
  message?: string;
  data: T;
}

/** An import/update failure as the server reports it: HTTP status, message and, for 402, the plans on offer. */
export class RemoteMarketplaceError extends Error {
  status: number | null;
  plans: RemotePricingPlan[];

  constructor(message: string, status: number | null, plans: RemotePricingPlan[] = []) {
    super(message);
    this.name = 'RemoteMarketplaceError';
    this.status = status;
    this.plans = plans;
  }
}

/** Turns an axios failure into a RemoteMarketplaceError carrying the server's own message. */
export function toRemoteError(error: unknown, fallback = 'Request to the hosted marketplace failed'): RemoteMarketplaceError {
  if (error instanceof RemoteMarketplaceError) return error;
  const response = (error as { response?: { status?: number; data?: { errors?: unknown; message?: unknown; plans?: unknown } } })?.response;
  const body = response?.data;
  const rawMessage = body?.errors ?? body?.message;
  const message =
    typeof rawMessage === 'string' && rawMessage
      ? rawMessage
      : error instanceof Error && error.message
        ? error.message
        : fallback;
  const plans = Array.isArray(body?.plans) ? (body?.plans as RemotePricingPlan[]) : [];
  return new RemoteMarketplaceError(message, response?.status ?? null, plans);
}

const fetchStatus = async (auth: RemoteAuth): Promise<RemoteStatus> => {
  const response = await apiClient.get<Envelope<RemoteStatus>>('/apps/v1/remote/status', {
    params: auth,
  });
  return response.data.data;
};

const fetchCatalog = async (
  auth: RemoteAuth,
  query: { search?: string; page?: number; limit?: number; domain?: string },
): Promise<RemoteCatalogPage> => {
  const params: Record<string, string | number> = { ...auth };
  if (query.search) params.search = query.search;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  if (query.domain) params.domain = query.domain;
  const response = await apiClient.get<Envelope<RemoteCatalogPage>>('/apps/v1/remote/catalog', { params });
  return response.data.data;
};

const fetchCatalogApp = async (auth: RemoteAuth, remote_app_id: string): Promise<RemoteCatalogDetail> => {
  const response = await apiClient.get<Envelope<RemoteCatalogDetail>>(
    `/apps/v1/remote/catalog/${encodeURIComponent(remote_app_id)}`,
    { params: auth },
  );
  return response.data.data;
};

const importApp = async (
  auth: RemoteAuth,
  data: { workspace_id: string; remote_app_id: string; version?: string; plan_id?: string },
): Promise<RemoteImportResult> => {
  try {
    const response = await apiClient.post<Envelope<RemoteImportResult>>('/apps/v1/remote/import', {
      ...data,
      ...auth,
    });
    return response.data.data;
  } catch (error) {
    throw toRemoteError(error, 'Failed to import the app');
  }
};

const fetchImported = async (auth: RemoteAuth): Promise<RemoteImportedApp[]> => {
  const response = await apiClient.get<Envelope<RemoteImportedApp[]>>('/apps/v1/remote/imported', {
    params: auth,
  });
  return response.data.data;
};

const checkAllUpdates = async (auth: RemoteAuth): Promise<RemoteUpdateCheckEntry[]> => {
  try {
    const response = await apiClient.post<Envelope<RemoteUpdateCheckEntry[]>>(
      '/apps/v1/remote/imported/check-updates',
      auth,
    );
    return response.data.data;
  } catch (error) {
    throw toRemoteError(error, 'Failed to check for updates');
  }
};

const checkAppUpdates = async (auth: RemoteAuth, app_id: string): Promise<RemoteUpdateCheckEntry[]> => {
  try {
    const response = await apiClient.post<Envelope<RemoteUpdateCheckEntry[]>>(
      `/apps/v1/remote/imported/${encodeURIComponent(app_id)}/check-updates`,
      auth,
    );
    return response.data.data;
  } catch (error) {
    throw toRemoteError(error, 'Failed to check for updates');
  }
};

const updateApp = async (
  auth: RemoteAuth,
  app_id: string,
  version?: string,
): Promise<{ app_id: string; version: string }> => {
  try {
    const response = await apiClient.post<Envelope<{ app_id: string; version: string }>>(
      `/apps/v1/remote/imported/${encodeURIComponent(app_id)}/update`,
      { ...auth, ...(version ? { version } : {}) },
    );
    return response.data.data;
  } catch (error) {
    throw toRemoteError(error, 'Failed to update the app');
  }
};

const remoteMarketplaceServices = {
  fetchStatus,
  fetchCatalog,
  fetchCatalogApp,
  importApp,
  fetchImported,
  checkAllUpdates,
  checkAppUpdates,
  updateApp,
};

export default remoteMarketplaceServices;

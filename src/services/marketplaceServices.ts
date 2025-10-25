/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '@/config/axiosinstance';

export interface Domain {
  _id: string;
  domain_name: string;
  parent_domain_id: string | null;
  parents: string[];
}

export interface MarketplaceApp {
  _id: string;
  app_name: string;
  domain_name: string;
  description?: string;
  logo?: string;
  versions?: Array<{
    _id: string;
    version: string;
    latest: boolean;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface DomainsResponse {
  data: Domain[];
}

export interface AppsResponse {
  data: MarketplaceApp[];
}

export interface AppResponse {
  data: MarketplaceApp;
}

const fetchDomains = async (): Promise<DomainsResponse> => {
  const response = await apiClient.get<DomainsResponse>(`/apps/v1/domains`);
  return response.data;
};

const fetchAppByDomains = async (
  domain_id: string | null
): Promise<AppsResponse> => {
  const url = domain_id
    ? `/apps/v1/domains/${domain_id}`
    : `/apps/v1/domains/all`;
  const response = await apiClient.get<AppsResponse>(url);
  return response.data;
};

const fetchApp = async (data: {
  app_id: string;
  user_id: string;
  public_key: string;
}): Promise<AppResponse> => {
  const { app_id, user_id, public_key } = data;
  const response = await apiClient.get<AppResponse>(`/apps/v1/${app_id}`, {
    params: { public_key, user_id },
  });
  return response.data;
};

const marketplaceServices = {
  fetchDomains,
  fetchAppByDomains,
  fetchApp,
};

export default marketplaceServices;

import axios from 'axios';
import apiClient from '@/config/axiosinstance';

const CLOUD_API = 'https://api.ductape.app/pricing/v1';

function adminAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function hasAdminToken(): boolean {
  return Boolean(localStorage.getItem('admin_token'));
}

export interface InstanceStatusResponse {
  activated: boolean;
  tier: string | null;
  limits: {
    max_users: number | null;
    max_workspaces: number | null;
    max_products: number | null;
    max_apps?: number | null;
    max_api_requests_month: number | null;
    log_retention_days: number | null;
  } | null;
  userCount: number;
  expires_at: string | null;
  read_only: boolean;
  telemetry?: InstanceTelemetryStatus;
}

export interface InstanceTelemetryStatus {
  enabled: boolean;
  /** DUCTAPE_TELEMETRY=off in the environment: reporting cannot be turned on from here. */
  locked_off: boolean;
  reported_at: string | null;
  /** Exactly what is sent when reporting is on. */
  preview: {
    platform_version: string;
    users: number;
    workspaces: number;
    products: number;
    apps: number;
    imported_apps: number;
  };
}

export async function setInstanceTelemetry(params: { enabled: boolean; user_id: string; public_key: string }): Promise<InstanceTelemetryStatus> {
  const response = await apiClient.put<{ status: boolean; data: InstanceTelemetryStatus }>('/users/v1/instance-telemetry', params);
  return response.data.data;
}

export async function getInstanceStatus(): Promise<InstanceStatusResponse> {
  const response = await apiClient.get<{ status: boolean; data: InstanceStatusResponse }>(
    '/users/v1/instance-status',
  );
  return response.data.data;
}

const adminServices = {
  listLicenses: (params?: { status?: string; tier?: string; page?: number; limit?: number }) =>
    axios.get(`${CLOUD_API}/licenses/v1/admin`, { params, headers: adminAuthHeader() }),

  getLicense: (id: string) =>
    axios.get(`${CLOUD_API}/licenses/v1/admin/${id}`, { headers: adminAuthHeader() }),

  updateLicense: (id: string, data: object) =>
    axios.put(`${CLOUD_API}/licenses/v1/admin/${id}`, data, { headers: adminAuthHeader() }),

  revokeLicense: (id: string) =>
    axios.post(`${CLOUD_API}/licenses/v1/admin/${id}/revoke`, {}, { headers: adminAuthHeader() }),

  listPurchases: (params?: { page?: number; limit?: number }) =>
    axios.get(`${CLOUD_API}/licenses/v1/admin/purchases`, { params, headers: adminAuthHeader() }),
};

export default adminServices;

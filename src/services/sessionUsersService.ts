import qs from 'qs';
import apiClient from '@/config/axiosinstance';

// ==================== SESSION USERS TYPES ====================

export interface ISessionUser {
  ductape_user_id: string;
  identifier: string;
  product_tag: string;
  session_tag: string;
  env: string;
  first_seen: Date;
  last_seen: Date;
  total_sessions?: number;
  active_sessions?: number;
  status?: 'active' | 'inactive' | 'expired';
  session_count?: number;
}

export interface IUserSession {
  session_id: string;
  start_at: Date;
  end_at?: Date;
  data?: Record<string, any>;
  is_active: boolean;
}

export interface IFetchSessionUsersOptions {
  product_tag: string;
  session_tag: string;
  env?: string;
  page?: number;
  limit?: number;
}

export interface IFetchSessionUsersResult {
  users: ISessionUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IFetchSessionUserDetailsOptions {
  identifier: string;
  product_tag: string;
  session_tag: string;
  env?: string;
}

export interface IFetchSessionUserDetailsResult {
  user: ISessionUser;
  sessions: IUserSession[];
  totalSessions: number;
  activeSessions: number;
}

export interface IFetchSessionDashboardOptions {
  product_tag: string;
  session_tag: string;
  env?: string;
}

export interface ISessionDashboardResult {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  expiredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalSessions: number;
  activeSessions: number;
  averageSessionsPerUser: number;
}

export interface SessionUsersResponse<T> {
  success: boolean;
  data: T;
}

// ==================== SESSION USERS API METHODS ====================

/**
 * Fetch paginated session users
 */
export const fetchSessionUsers = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionUsersOptions
): Promise<IFetchSessionUsersResult> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...options,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionUsersResponse<IFetchSessionUsersResult>>(
    `/integrations/v1/session/users/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

/**
 * Fetch session user details with sessions
 */
export const fetchSessionUserDetails = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionUserDetailsOptions
): Promise<IFetchSessionUserDetailsResult> => {
  const { identifier, ...queryParams } = options;

  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...queryParams,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionUsersResponse<IFetchSessionUserDetailsResult>>(
    `/integrations/v1/session/users/${workspace_id}/${encodeURIComponent(identifier)}?${queryString}`
  );

  return response.data.data;
};

/**
 * Fetch session dashboard metrics
 */
export const fetchSessionDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionDashboardOptions
): Promise<ISessionDashboardResult> => {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      user_id,
      public_key,
      ...options,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );

  const queryString = qs.stringify(cleanedPayload);

  const response = await apiClient.get<SessionUsersResponse<ISessionDashboardResult>>(
    `/integrations/v1/session/dashboard/${workspace_id}?${queryString}`
  );

  return response.data.data;
};

const sessionUsersService = {
  fetchSessionUsers,
  fetchSessionUserDetails,
  fetchSessionDashboard,
};

export default sessionUsersService;

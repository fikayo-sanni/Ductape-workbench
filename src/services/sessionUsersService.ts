import { createSDKProxy, SDKProxyConfig } from './sdkProxy';

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

export interface IUserSessionInfo {
  session_id: string;
  start_at: Date;
  end_at?: Date;
  active: boolean;
  data?: Record<string, any>;
}

export interface IFetchSessionUserDetailsResult {
  ductape_user_id: string;
  identifier: string;
  product_tag: string;
  session_tag?: string;
  env: string;
  first_seen?: Date | null;
  last_seen?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  sessions: IUserSessionInfo[];
  totalSessions: number;
  activeSessionsCount: number;
  latestSessionData?: Record<string, any>;
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
  // DAU/WAU/MAU metrics
  dau: { current: number; previous: number; change: number };
  wau: { current: number; previous: number; change: number };
  mau: { current: number; previous: number; change: number };
  // Activity timeline (sessions per day of week)
  activityTimeline: Array<{ date: string; sessions: number }>;
  // Peak activity hours
  peakHours: Array<{ hour: string; count: number }>;
  // Environment breakdown
  environmentBreakdown: Array<{ env: string; count: number; percentage: number }>;
  // Average session duration
  avgSessionDuration: { current: string; previous: string; change: number };
}

// ==================== SESSION USERS API METHODS ====================

/**
 * Get SDK proxy config from auth data
 */
const getProxyConfig = (
  workspace_id: string,
  user_id: string,
  public_key: string
): SDKProxyConfig => {
  const token = localStorage.getItem('token')?.replace(/"/g, '') || '';
  return {
    workspace_id,
    user_id,
    public_key,
    token,
  };
};

/**
 * Fetch paginated session users via SDK proxy
 */
export const fetchSessionUsers = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionUsersOptions
): Promise<IFetchSessionUsersResult> => {
  const proxy = createSDKProxy(getProxyConfig(workspace_id, user_id, public_key));

  return proxy.sessions.fetchUsers<IFetchSessionUsersResult>({
    product: options.product_tag,
    session: options.session_tag,
    env: options.env,
    page: options.page,
    limit: options.limit,
  });
};

/**
 * Fetch session user details with sessions via SDK proxy
 */
export const fetchSessionUserDetails = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionUserDetailsOptions
): Promise<IFetchSessionUserDetailsResult> => {
  const proxy = createSDKProxy(getProxyConfig(workspace_id, user_id, public_key));

  return proxy.sessions.fetchUserDetails<IFetchSessionUserDetailsResult>({
    product: options.product_tag,
    session: options.session_tag,
    identifier: options.identifier,
    env: options.env,
  });
};

/**
 * Fetch session dashboard metrics via SDK proxy
 */
export const fetchSessionDashboard = async (
  workspace_id: string,
  user_id: string,
  public_key: string,
  options: IFetchSessionDashboardOptions
): Promise<ISessionDashboardResult> => {
  const proxy = createSDKProxy(getProxyConfig(workspace_id, user_id, public_key));

  return proxy.sessions.fetchDashboard<ISessionDashboardResult>({
    product: options.product_tag,
    session: options.session_tag,
    env: options.env,
  });
};

const sessionUsersService = {
  fetchSessionUsers,
  fetchSessionUserDetails,
  fetchSessionDashboard,
};

export default sessionUsersService;

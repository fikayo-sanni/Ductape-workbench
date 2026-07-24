import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { isSelfHosted } from '@/helpers/env';
import { userServices } from '@/services/userServices';

interface LicenseLimits {
  max_users: number | null;
  max_workspaces: number | null;
  max_products: number | null;
  max_api_requests_month: number | null;
  log_retention_days: number | null;
}

interface LicenseState {
  activated: boolean;
  tier: string | null;
  limits: LicenseLimits | null;
  expires_at: string | null;
  read_only: boolean;
  userCount: number;
  loading: boolean;
}

interface LicenseContextValue extends LicenseState {
  refresh: () => void;
  isAtUserLimit: () => boolean;
  isAtWorkspaceLimit: (workspaceCount: number) => boolean;
  isAtProductLimit: (productCount: number) => boolean;
}

const defaultState: LicenseState = {
  activated: false,
  tier: null,
  limits: null,
  expires_at: null,
  read_only: false,
  userCount: 0,
  loading: false,
};

const LicenseContext = createContext<LicenseContextValue>({
  ...defaultState,
  refresh: () => {},
  isAtUserLimit: () => false,
  isAtWorkspaceLimit: () => false,
  isAtProductLimit: () => false,
});

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({ ...defaultState, loading: isSelfHosted() });

  const fetchStatus = useCallback(async () => {
    if (!isSelfHosted()) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await userServices.fetchInstanceStatus();
      const data = res.data;
      setState({
        activated: data.activated ?? false,
        tier: data.tier ?? null,
        limits: data.limits ?? null,
        expires_at: data.expires_at ?? null,
        read_only: data.read_only ?? false,
        userCount: data.userCount ?? 0,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isAtUserLimit = () => {
    if (!state.limits?.max_users) return false;
    return state.userCount >= state.limits.max_users;
  };

  const isAtWorkspaceLimit = (workspaceCount: number) => {
    if (!state.limits?.max_workspaces) return false;
    return workspaceCount >= state.limits.max_workspaces;
  };

  const isAtProductLimit = (productCount: number) => {
    if (!state.limits?.max_products) return false;
    return productCount >= state.limits.max_products;
  };

  return (
    <LicenseContext.Provider
      value={{
        ...state,
        refresh: fetchStatus,
        isAtUserLimit,
        isAtWorkspaceLimit,
        isAtProductLimit,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}

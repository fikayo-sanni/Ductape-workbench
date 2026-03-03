import apiClient from '@/config/axiosinstance';

export interface PublicWorkspaceProfile {
  _id: string;
  name: string;
  subscription_tag?: string;
  referral_code?: string;
  description?: string;
  logo?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

export const fetchWorkspacePublicByTag = async (tag: string): Promise<PublicWorkspaceProfile> => {
  const response = await apiClient.get<ApiResponse<PublicWorkspaceProfile>>(
    `/workspaces/v1/public/by-tag/${encodeURIComponent(tag)}`
  );
  return response.data.data;
};


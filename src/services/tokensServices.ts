import apiClient from "@/config/axiosinstance";

interface TokenResponse {
  status: boolean;
  message?: string;
  data?: any;
}

const getTwoFA = async (data: {
  user_id: string;
  public_key: string;
}): Promise<TokenResponse> => {
  const { user_id, public_key } = data;
  const response = await apiClient.get<TokenResponse>(
    `/users/v1/generate/2fa-otp`,
    { params: { user_id, public_key } }
  );
  return response.data;
};

const postTwoFA = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
  token: string;
}): Promise<TokenResponse> => {
  const { user_id, public_key, workspace_id, token } = data;
  const response = await apiClient.post<TokenResponse>(
    `/users/v1/validate/otp`,
    {
      token,
    },
    { params: { user_id, public_key, workspace_id } }
  );
  return response.data;
};

const regenerateAccessKey = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
}): Promise<TokenResponse> => {
  const { user_id, public_key, workspace_id } = data;
  const response = await apiClient.post<TokenResponse>(
    `/users/v1/regenerate/access-key`,
    {},
    { params: { user_id, public_key, workspace_id } }
  );
  return response.data;
};

export type PublishableKeyScopeItem = { module: string; methods: string[] };

const getPublishableKey = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<TokenResponse & { data?: { publishable_key?: string; scope?: PublishableKeyScopeItem[] } }> => {
  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<TokenResponse & { data?: { publishable_key?: string; scope?: PublishableKeyScopeItem[] } }>(
    `/workspaces/v1/${workspace_id}/publishable-key`,
    { params: { user_id, public_key } }
  );
  return response.data;
};

const updatePublishableKeyScope = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  scope: PublishableKeyScopeItem[];
}): Promise<TokenResponse> => {
  const { workspace_id, user_id, public_key, scope } = data;
  const response = await apiClient.patch<TokenResponse>(
    `/workspaces/v1/${workspace_id}/publishable-key/scope`,
    { user_id, scope },
    { params: { user_id, public_key } }
  );
  return response.data;
};

const regeneratePublishableKey = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<TokenResponse> => {
  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.post<TokenResponse>(
    `/workspaces/v1/${workspace_id}/publishable-key/regenerate`,
    { user_id },
    { params: { user_id, public_key } }
  );
  return response.data;
};

const revokePublishableKey = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<TokenResponse> => {
  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.post<TokenResponse>(
    `/workspaces/v1/${workspace_id}/publishable-key/revoke`,
    { user_id },
    { params: { user_id, public_key } }
  );
  return response.data;
};

const tokensServices = {
  getTwoFA,
  postTwoFA,
  regenerateAccessKey,
  getPublishableKey,
  regeneratePublishableKey,
  revokePublishableKey,
  updatePublishableKeyScope,
};

export default tokensServices;

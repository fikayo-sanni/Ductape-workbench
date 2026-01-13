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

const tokensServices = {
  getTwoFA,
  postTwoFA,
  regenerateAccessKey,
};

export default tokensServices;

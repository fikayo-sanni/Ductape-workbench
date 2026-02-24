import apiClient from "@/config/axiosinstance";
import { SignupPayload, User, LoginPayload } from "@/types/auth";

interface LoginResponse {
  status: boolean;
  data: {
    result: User;
  };
}

const login = async (data: LoginPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/users/v1/login", data);

  // Check if user requires verification (unverified account)
  if (response.data.data.result.requires_verification) {
    // Don't store token or user data - return response for OTP flow
    return response.data;
  }

  localStorage.setItem("token", response.data.data.result.auth_token);

  const user: User = {
    _id: response.data.data.result._id,
    email: response.data.data.result.email,
    firstname: response.data.data.result.firstname,
    lastname: response.data.data.result.lastname,
    active: response.data.data.result.active,
    auth_token: response.data.data.result.auth_token,
    public_key: response.data.data.result.public_key,
    workspaces: response.data.data.result.workspaces,
  };
  localStorage.setItem("user", JSON.stringify(user));

  return response.data;
};

const resetPassword = async (data: {
  email: string;
}): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/users/v1/forgot",
    data
  );
  return response.data;
};

const createNewPassword = async (data: {
  token: string;
  password: string;
  email: string;
}): Promise<LoginResponse> => {
  const response = await apiClient.put<LoginResponse>(
    "/users/v1/password",
    data
  );
  return response.data;
};

interface SignupResponse {
  status: boolean;
  data: {
    _id: string;
    email: string;
    firstname: string;
    lastname: string;
    verified: boolean;
    active: boolean;
  };
}

const signup = async (data: SignupPayload): Promise<SignupResponse> => {
  const response = await apiClient.post<SignupResponse>(
    "/users/v1/create",
    data
  );
  // Don't auto-login - user needs to verify email with OTP first
  return response.data;
};

const verifyEmail = async (data: { token: string; user_id: string }): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/users/v1/verify-email",
    data
  );

  // Store token and user data after successful verification
  localStorage.setItem("token", response.data.data.result.auth_token);

  const user: User = {
    _id: response.data.data.result._id,
    email: response.data.data.result.email,
    firstname: response.data.data.result.firstname,
    lastname: response.data.data.result.lastname,
    active: response.data.data.result.active,
    auth_token: response.data.data.result.auth_token,
    public_key: response.data.data.result.public_key,
    workspaces: response.data.data.result.workspaces,
  };
  localStorage.setItem("user", JSON.stringify(user));

  return response.data;
};

const resendVerificationOTP = async (data: { user_id: string }): Promise<{ status: boolean; data: { message: string } }> => {
  const response = await apiClient.post<{ status: boolean; data: { message: string } }>(
    "/users/v1/resend-verification-otp",
    data
  );
  return response.data;
};

/** Exchange encrypted OAuth callback token for user session (Google/GitHub login). */
const exchangeOAuthToken = async (encryptedToken: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/users/v1/auth/oauth-session", {
    token: encryptedToken,
  });
  const result = response.data.data.result;
  localStorage.setItem("token", result.auth_token);
  const user: User = {
    _id: result._id,
    email: result.email,
    firstname: result.firstname,
    lastname: result.lastname,
    active: result.active,
    auth_token: result.auth_token,
    public_key: result.public_key,
    workspaces: result.workspaces,
  };
  localStorage.setItem("user", JSON.stringify(user));
  return response.data;
};

const createAuth = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  payload: {
    name: string;
    tag: string;
    description: string;
    setup_type: string;
    action_tag?: string;
    expiry?: number;
    period?: string;
    tokens?: Record<string, Record<string, string>>;
    workspace_id: string;
    user_id: string;
    public_key: string;
  };
}): Promise<any> => {
  const { payload } = data;
  const response = await apiClient.post(
    `/auth/v1/create`,
    payload
  );
  return response.data;
};

export const authServices = {
  login,
  resetPassword,
  createNewPassword,
  signup,
  verifyEmail,
  resendVerificationOTP,
  exchangeOAuthToken,
  createAuth,
};

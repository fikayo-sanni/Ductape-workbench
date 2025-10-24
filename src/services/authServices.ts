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

const signup = async (data: SignupPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/users/v1/create",
    data
  );
  return response.data;
};

export const authServices = {
  login,
  resetPassword,
  createNewPassword,
  signup,
};

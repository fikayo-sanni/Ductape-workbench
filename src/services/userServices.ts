import apiClient from '@/config/axiosinstance';
import { ActionResponse } from '@/types/workspace';

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UserStepsResponse {
  status: boolean;
  data: {
    profilePicture?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
  };
}

const updateUser = async (data: {
  user_id: string;
  public_key: string;
  profilePicture?: string;
  fullName?: string;
  email?: string;
}): Promise<UserStepsResponse> => {
  const { user_id, public_key, profilePicture, fullName, email } = data;
  const body: any = {};
  
  if (profilePicture) body.profilePicture = profilePicture;
  if (fullName) {
    const [firstname, ...lastnameParts] = fullName.split(' ');
    body.firstname = firstname;
    body.lastname = lastnameParts.join(' ') || '';
  }
  if (email) body.email = email;

  const response = await apiClient.patch<UserStepsResponse>(
    `/users/v1/update?user_id=${user_id}&public_key=${public_key}`,
    body
  );
  return response.data;
};

const changePassword = async (data: {
  user_id: string;
  public_key: string;
  payload: ChangePasswordPayload;
}): Promise<ActionResponse> => {
  const { user_id, public_key, payload } = data;
  const response = await apiClient.put<ActionResponse>(
    '/users/v1/change-password',
    payload,
    {
      params: { user_id, public_key },
    }
  );
  return response.data;
};

const fetchUserDetails = async (data: {
  user_id: string;
  public_key: string;
}): Promise<UserStepsResponse> => {
  const { user_id, public_key } = data;
  const response = await apiClient.get<UserStepsResponse>(`/users/v1/me`, {
    params: { public_key, user_id },
  });
  return response.data;
};

export interface InstanceStatusResponse {
  status: boolean;
  data: {
    activated: boolean;
    userCount: number;
    tier?: string | null;
    limits?: {
      max_users: number | null;
      max_workspaces: number | null;
      max_products: number | null;
      max_api_requests_month: number | null;
      log_retention_days: number | null;
    } | null;
    expires_at?: string | null;
    read_only?: boolean;
  };
}

const fetchInstanceStatus = async (): Promise<InstanceStatusResponse> => {
  const response = await apiClient.get<InstanceStatusResponse>('/users/v1/instance-status');
  return response.data;
};

const activateInstance = async (licenseData: Record<string, unknown>): Promise<ActionResponse> => {
  const response = await apiClient.post<ActionResponse>('/users/v1/instance-activate', licenseData);
  return response.data;
};

const userServices = {
  updateUser,
  changePassword,
  fetchUserDetails,
  fetchInstanceStatus,
  activateInstance,
};

export { userServices };

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

const userServices = {
  updateUser,
  changePassword,
  fetchUserDetails,
};

export { userServices };

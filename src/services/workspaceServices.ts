import apiClient from '@/config/axiosinstance';
import {
  InviteMemberPayload,
  WorkspaceMembersResponse,
  ActionResponse
} from '@/types/workspace';

export interface Workspace {
  _id: string;
  workspace_id: string;
  workspace_name: string;
  description?: string;
  logo?: string;
  user_id: string;
  default: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkspacesResponse {
  data: Workspace[];
}

const fetchWorkspaces = async (data: {
  user_id: string;
  public_key: string;
}): Promise<WorkspacesResponse | null> => {
  const {user_id, public_key} = data;

  try {
    const response = await apiClient.get<WorkspacesResponse>(
      `/workspaces/v1/fetch/${user_id}`,
      {params: {public_key, user_id}},
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch workspaces:', error);
    return null;
  }
};

const changeDefaultWorkspace = async (data: {
  user_id: string;
  workspace_id: string;
  public_key: string;
}): Promise<WorkspacesResponse | null> => {
  const {user_id, workspace_id, public_key} = data;

  try {
    const response = await apiClient.put<WorkspacesResponse>(
      `/workspaces/v1/update/access/${user_id}?user_id=${user_id}&public_key=${public_key}`,
      {workspace_id},
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to change default workspace:', error);
    return null;
  }
};

const createWorkspace = async (data: {
  user_id: string;
  name: string;
  public_key: string;
  description: string;
}): Promise<WorkspacesResponse | null> => {
  const {user_id, name, public_key, description} = data;

  try {
    const response = await apiClient.post<WorkspacesResponse>(
      '/workspaces/v1/create',
      {user_id, name, public_key, description},
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to create workspace:', error);
    return null;
  }
};

const inviteMember = async (data: {
  payload: InviteMemberPayload;
}): Promise<ActionResponse> => {
  const {payload} = data;
  const response = await apiClient.post<ActionResponse>(
    '/workspaces/v1/createAccess',
    payload,
  );
  return response.data;
};

const fetchWorkspaceMembers = async (data: {
  workspace_id: string;
  public_key: string;
  user_id: string;
}): Promise<WorkspaceMembersResponse | null> => {
  const {workspace_id, public_key, user_id} = data;

  try {
    const response = await apiClient.get<WorkspaceMembersResponse>(
      `/workspaces/v1/members/${workspace_id}`,
      {
        params: {public_key, user_id},
      },
    );

    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch workspace members:', error);
    return null;
  }
};

const removeMember = async (data: {
  workspace_id: string;
  access_id: string;
}): Promise<ActionResponse> => {
  const {workspace_id, access_id} = data;
  const response = await apiClient.delete<ActionResponse>(
    `/workspaces/v1/members/${workspace_id}/${access_id}`,
  );
  return response.data;
};

const workspaceServices = {
  fetchWorkspaces,
  changeDefaultWorkspace,
  createWorkspace,
  inviteMember,
  fetchWorkspaceMembers,
  removeMember,
};

export default workspaceServices;

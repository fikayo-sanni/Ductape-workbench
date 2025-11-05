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
  created_at?: string;
  updated_at?: string;
  accepted?: boolean;
  access_level?: string;
  date_joined?: string;
  createdAt?: string;
  updatedAt?: string;
  defaultEnvs?: Array<{
    env_name: string;
    slug: string;
    description: string;
    _id: string;
  }>;
}

interface WorkspacesResponse {
  data: Workspace[];
  status?: boolean;
  message?: string;
  meta?: any;
}

interface CreateWorkspaceResponse {
  data: Workspace;
  message: string;
  status: boolean;
  meta: any;
}

interface UploadUrlResponse {
  data: {
    url: string;
    key: string;
  };
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
}): Promise<CreateWorkspaceResponse | null> => {
  const {user_id, name, public_key, description} = data;

  try {
    const response = await apiClient.post<CreateWorkspaceResponse>(
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

const createUploadUrl = async (data: {
  file: File;
  fileType: string;
  visibility: string;
  id: string;
}): Promise<UploadUrlResponse> => {
  const {fileType, visibility, id} = data;
  const response = await apiClient.post<UploadUrlResponse>(
    '/workspaces/v1/upload',
    {fileType, visibility, id},
  );
  return response.data;
};

const uploadFileToUrl = async (data: {
  url: string;
  file: File;
}): Promise<void> => {
  const {url, file} = data;
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

const updateWorkspaceEnvs = async (data: {
  workspace_id: string;
  payload: {
    user_id: string;
    public_key: string;
    envs: any[];
  };
}): Promise<WorkspacesResponse> => {
  const {workspace_id, payload} = data;
  console.log('payload!!', payload);
  const response = await apiClient.put<WorkspacesResponse>(
    `/workspaces/v1/update/${workspace_id}/defaults/envs`,
    payload,
  );
  return response.data;
};

const fetchDashboardData = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<any> => {
  const {workspace_id, user_id, public_key} = data;
  try {
    const response = await apiClient.get<any>(
      `/workspaces/v1/dashboard/${workspace_id}`,
      {params: {public_key, user_id}},
    );
    return response.data;
  } catch (error: unknown) {
    console.error('Failed to fetch dashboard data:', error);
    return null;
  }
};

const updateWorkspace = async (data: {
  user_id: string;
  public_key: string;
  workspace_id: string;
  logo?: string;
  workspaceName?: string;
  description?: string;
}): Promise<ActionResponse> => {
  const { user_id, public_key, workspace_id, logo, workspaceName, description } = data;
  const body: any = {};
  
  if (logo) body.logo = logo;
  if (workspaceName) body.workspace_name = workspaceName;
  if (description) body.description = description;

  const response = await apiClient.patch<ActionResponse>(
    `/workspaces/v1/update/${workspace_id}?user_id=${user_id}&public_key=${public_key}`,
    body
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
  createUploadUrl,
  uploadFileToUrl,
  updateWorkspace,
  updateWorkspaceEnvs,
  fetchDashboardData,
};

export default workspaceServices;

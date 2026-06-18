/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from "@/config/axiosinstance";
import { IApp } from "@/types/app";
import type { ReviewFeedbackMessage, ReviewFeedbackTopic } from "@/lib/reviewFeedback";

export interface AppsResponse {
  data: IApp[];
}

export interface AppResponse {
  data: IApp;
}

const fetchApps = async (data: {
  workspace_id: string;
  status: string;
  user_id: string;
  public_key: string;
}): Promise<AppsResponse> => {
  const { workspace_id, status, user_id, public_key } = data;
  const response = await apiClient.get<AppsResponse>(
    `/apps/v1/workspace/${workspace_id}/${status}`,
    { params: { public_key, user_id } }
  );
  return response.data;
};

const fetchApp = async (data: {
  app_id: string;
  user_id: string;
  public_key: string;
}): Promise<AppResponse> => {
  const { app_id, user_id, public_key } = data;
  const response = await apiClient.get<AppResponse>(`/apps/v1/${app_id}`, {
    params: { public_key, user_id },
  });
  return response.data;
};

const fetchAppByTag = async (data: {
  tag: string;
  user_id: string;
  public_key: string;
}): Promise<AppResponse> => {
  const { tag, user_id, public_key } = data;
  const response = await apiClient.get<AppResponse>(`/apps/v1/fetch/tag?tag=${tag}`, {
    params: { public_key, user_id },
  });
  return response.data;
};

const fetchWorkspaceApps = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<AppsResponse> => {
  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<AppsResponse>(
    `/apps/v1/access/${workspace_id}`,
    { params: { public_key, user_id } }
  );
  return response.data;
};

const createApp = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  payload: {
    app_name: string;
    description: string;
    tag: string;
    base_url?: string;
    workspace_id: string;
    version: string;
    logo: string;
    user_id: string;
    public_key: string;
    envs: Array<any>;
  };
}): Promise<AppResponse> => {
  const { payload } = data;
  const response = await apiClient.post<AppResponse>(
    `/apps/v1/create`,
    payload
  );
  return response.data;
};

const updateApp = async <T extends Record<string, any>>(data: {
  app_id: string;
  user_id: string;
  public_key: string;
  payload: T;
  component?: string;
}): Promise<AppResponse> => {
  const { app_id, user_id, public_key, component, payload } = data;
  // Use top-level component only when provided; otherwise keep payload.component (e.g. action_bulk from CreateSharedVariableModal)
  const body = component !== undefined ? { ...payload, component } : payload;
  const response = await apiClient.put<AppResponse>(`/apps/v1/${app_id}`, body, {
    params: { user_id, public_key },
  });
  return response.data;
};

const deleteApp = async (data: {
  app_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<void> => {
  const { app_id, workspace_id, user_id, public_key } = data;
  await apiClient.delete(`/apps/v1/${app_id}`, {
    params: { workspace_id, user_id, public_key },
  });
};

const fetchAppComponents = async (data: {
  app_id: string;
  component_type: string;
  user_id: string;
  public_key: string;
  version?: string;
}): Promise<{ data: any[] }> => {
  const { app_id, component_type, user_id, public_key, version } = data;
  const params: any = { user_id, public_key };
  if (version) {
    params.version = version;
  }
  const response = await apiClient.get<{ data: any[] }>(
    `/apps/v1/components/${app_id}/${component_type}`,
    { params }
  );
  return response.data;
};

const listReviewFeedback = async (data: {
  app_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<{ data: ReviewFeedbackMessage[] }> => {
  const { app_id, workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<{ data: ReviewFeedbackMessage[] }>(
    `/apps/v1/${app_id}/review-feedback`,
    { params: { workspace_id, user_id, public_key } },
  );
  return response.data;
};

const postReviewFeedback = async (data: {
  app_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  message: string;
  topic: ReviewFeedbackTopic;
  author_name?: string;
  resource_id?: string;
  resource_label?: string;
}): Promise<{ data: ReviewFeedbackMessage }> => {
  const {
    app_id,
    workspace_id,
    user_id,
    public_key,
    message,
    topic,
    author_name,
    resource_id,
    resource_label,
  } = data;
  const response = await apiClient.post<{ data: ReviewFeedbackMessage }>(
    `/apps/v1/${app_id}/review-feedback`,
    {
      workspace_id,
      user_id,
      public_key,
      message,
      topic,
      author_name,
      resource_id,
      resource_label,
    },
  );
  return response.data;
};

const appServices = {
  fetchApps,
  fetchApp,
  fetchAppByTag,
  fetchWorkspaceApps,
  createApp,
  updateApp,
  deleteApp,
  fetchAppComponents,
  listReviewFeedback,
  postReviewFeedback,
};

export default appServices;

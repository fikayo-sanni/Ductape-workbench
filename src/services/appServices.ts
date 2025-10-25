/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from "@/config/axiosinstance";
import { IApp } from "@/types/app";

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
    user_id: string;
    public_key: string;
  };
}): Promise<AppResponse> => {
  const { payload } = data;
  const response = await apiClient.post<AppResponse>(
    `/apps/v1/create`,
    payload
  );
  return response.data;
};

const appServices = {
  fetchApps,
  fetchApp,
  fetchAppByTag,
  createApp,
};

export default appServices;

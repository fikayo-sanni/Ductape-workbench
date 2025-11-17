/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from "@/config/axiosinstance";
import { IPartnership, IProductBrief, BriefStatus, IPartnershipMessage } from "@/types/partnership";

export interface PartnershipsResponse {
  data: {
    myClients: IPartnership[];
    myServiceProviders: IPartnership[];
  };
}

export interface PartnershipResponse {
  data: IPartnership;
}

export interface PublishedBriefsResponse {
  data: {
    briefs: IProductBrief[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface WorkspaceBriefsResponse {
  data: IProductBrief[];
}

export interface MessagesResponse {
  data: IPartnershipMessage[];
}

const fetchWorkspacePartnerships = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipsResponse> => {
  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<PartnershipsResponse>(
    `/partnerships/v1/partnerships/workspace`,
    { params: { workspace_id, user_id, public_key } }
  );
  return response.data;
};

const fetchPartnershipById = async (data: {
  partnership_id: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipResponse> => {
  const { partnership_id, user_id, public_key } = data;
  const response = await apiClient.get<PartnershipResponse>(
    `/partnerships/v1/${partnership_id}`,
    { params: { user_id, public_key } }
  );
  return response.data;
};

const fetchPublishedBriefs = async (data: {
  user_id: string;
  public_key: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PublishedBriefsResponse> => {
  const { user_id, public_key, search = '', page = 1, limit = 20 } = data;
  const response = await apiClient.get<PublishedBriefsResponse>(
    `/partnerships/v1/product-briefs/published`,
    { params: { user_id, public_key, search, page, limit } }
  );
  return response.data;
};

const fetchWorkspaceBriefs = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status?: BriefStatus;
}): Promise<WorkspaceBriefsResponse> => {
  const { workspace_id, user_id, public_key, status = BriefStatus.ALL } = data;
  const response = await apiClient.get<WorkspaceBriefsResponse>(
    `/partnerships/v1/product-briefs/workspace`,
    { params: { workspace_id, user_id, public_key, status } }
  );
  return response.data;
};

const createPartnership = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  payload: {
    service_provider_id: string;
    client_id: string;
    product_brief_id: string;
    sales_funnel_id?: string;
    messages?: Partial<IPartnershipMessage>[];
  };
}): Promise<PartnershipResponse> => {
  const { workspace_id, user_id, public_key, payload } = data;
  const response = await apiClient.post<PartnershipResponse>(
    `/partnerships/v1/create`,
    { ...payload, workspace_id, user_id, public_key }
  );
  return response.data;
};

const addMessage = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  content: string;
  attachments?: string[];
}): Promise<PartnershipResponse> => {
  const { partnership_id, workspace_id, user_id, public_key, content, attachments } = data;
  const response = await apiClient.put<PartnershipResponse>(
    `/partnerships/v1/${partnership_id}/messages`,
    { content, attachments },
    { params: { workspace_id, user_id, public_key } }
  );
  return response.data;
};

const fetchMessages = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<MessagesResponse> => {
  const { partnership_id, workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<MessagesResponse>(
    `/partnerships/v1/${partnership_id}/messages`,
    { params: { workspace_id, user_id, public_key } }
  );
  return response.data;
};

const markMessageAsRead = async (data: {
  partnership_id: string;
  message_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipResponse> => {
  const { partnership_id, message_id, workspace_id, user_id, public_key } = data;
  const response = await apiClient.put<PartnershipResponse>(
    `/partnerships/v1/${partnership_id}/messages/${message_id}/read`,
    {},
    { params: { workspace_id, user_id, public_key } }
  );
  return response.data;
};

const confirmPartnership = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  is_service_provider: boolean;
}): Promise<PartnershipResponse> => {
  const { partnership_id, workspace_id, user_id, public_key, is_service_provider } = data;
  const response = await apiClient.put<PartnershipResponse>(
    `/partnerships/v1/${partnership_id}/confirm`,
    { workspace_id, is_service_provider },
    { params: { user_id, public_key } }
  );
  return response.data;
};

const partnershipServices = {
  fetchWorkspacePartnerships,
  fetchPartnershipById,
  fetchPublishedBriefs,
  fetchWorkspaceBriefs,
  createPartnership,
  addMessage,
  fetchMessages,
  markMessageAsRead,
  confirmPartnership,
};

export default partnershipServices;

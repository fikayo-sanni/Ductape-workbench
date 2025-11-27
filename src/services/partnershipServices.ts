/* eslint-disable @typescript-eslint/no-explicit-any */
// import apiClient from "@/config/axiosinstance";
import { IPartnership, IProductBrief, BriefStatus, IPartnershipMessage } from "@/types/partnership";
import {
  dummyPartnerships,
  dummyProductBriefs,
  getDummyPublishedBriefs,
  getDummyWorkspaceBriefs,
  getPartnershipById as getDummyPartnershipById,
} from "@/data/partnerships.dummy";

// Toggle this to switch between dummy data and real API
const USE_DUMMY_DATA = true;

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
  if (USE_DUMMY_DATA) {
    // For dummy data, return all partnerships with relationship type
    const myClients = dummyPartnerships.filter(
      p => p.service_provider_id === data.workspace_id || p.relationship_type === 'client'
    );
    const myServiceProviders = dummyPartnerships.filter(
      p => p.client_id === data.workspace_id || p.relationship_type === 'service_provider'
    );
    return { data: { myClients, myServiceProviders } };
  }

  // Real API call (commented out for now)
  // const { workspace_id, user_id, public_key } = data;
  // const response = await apiClient.get<PartnershipsResponse>(
  //   `/partnerships/v1/partnerships/workspace`,
  //   { params: { workspace_id, user_id, public_key } }
  // );
  // return response.data;
  return { data: { myClients: [], myServiceProviders: [] } };
};

const fetchPartnershipById = async (data: {
  partnership_id: string;
  workspace_id?: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipResponse> => {
  if (USE_DUMMY_DATA) {
    const partnership = getDummyPartnershipById(data.partnership_id, data.workspace_id || '');
    if (partnership) {
      return { data: partnership };
    }
    throw new Error('Partnership not found');
  }

  // Real API call (commented out for now)
  // const { partnership_id, user_id, public_key } = data;
  // const response = await apiClient.get<PartnershipResponse>(
  //   `/partnerships/v1/${partnership_id}`,
  //   { params: { user_id, public_key } }
  // );
  // return response.data;
  throw new Error('Partnership not found');
};

const fetchPublishedBriefs = async (data: {
  user_id: string;
  public_key: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PublishedBriefsResponse> => {
  if (USE_DUMMY_DATA) {
    const { search = '', page = 1, limit = 20 } = data;
    const response = getDummyPublishedBriefs(page, limit, search);
    return { data: response.data };
  }

  // Real API call (commented out for now)
  // const { user_id, public_key, search = '', page = 1, limit = 20 } = data;
  // const response = await apiClient.get<PublishedBriefsResponse>(
  //   `/partnerships/v1/product-briefs/published`,
  //   { params: { user_id, public_key, search, page, limit } }
  // );
  // return response.data;
  return { data: { briefs: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false } } };
};

const fetchWorkspaceBriefs = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status?: BriefStatus;
}): Promise<WorkspaceBriefsResponse> => {
  if (USE_DUMMY_DATA) {
    const briefs = getDummyWorkspaceBriefs(data.workspace_id, data.status);
    // Return all briefs for demo purposes
    return { data: briefs.length > 0 ? briefs : dummyProductBriefs };
  }

  // Real API call (commented out for now)
  // const { workspace_id, user_id, public_key, status = BriefStatus.ALL } = data;
  // const response = await apiClient.get<WorkspaceBriefsResponse>(
  //   `/partnerships/v1/product-briefs/workspace`,
  //   { params: { workspace_id, user_id, public_key, status } }
  // );
  // return response.data;
  return { data: [] };
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
  if (USE_DUMMY_DATA) {
    // Create a mock partnership
    const newPartnership: IPartnership = {
      _id: `partnership_${Date.now()}`,
      service_provider_id: data.payload.service_provider_id,
      client_id: data.payload.client_id,
      product_brief_id: data.payload.product_brief_id,
      sales_funnel_id: data.payload.sales_funnel_id,
      current_funnel_step: 0,
      status: 'prospective' as any,
      partnership_confirmed_by_provider: false,
      messages: (data.payload.messages || []) as IPartnershipMessage[],
      deliverables: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    dummyPartnerships.push(newPartnership);
    return { data: newPartnership };
  }

  // Real API call (commented out for now)
  // const { workspace_id, user_id, public_key, payload } = data;
  // const response = await apiClient.post<PartnershipResponse>(
  //   `/partnerships/v1/create`,
  //   { ...payload, workspace_id, user_id, public_key }
  // );
  // return response.data;
  throw new Error('API not available');
};

const addMessage = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  content: string;
  attachments?: string[];
}): Promise<PartnershipResponse> => {
  if (USE_DUMMY_DATA) {
    const partnership = dummyPartnerships.find(p => p._id === data.partnership_id);
    if (partnership) {
      const newMessage: IPartnershipMessage = {
        _id: `msg_${Date.now()}`,
        sender_id: data.user_id,
        sender_type: 'client' as any,
        content: data.content,
        attachments: data.attachments || [],
        read: false,
        created_at: new Date(),
      };
      partnership.messages = partnership.messages || [];
      partnership.messages.push(newMessage);
      partnership.updated_at = new Date();
      return { data: partnership };
    }
    throw new Error('Partnership not found');
  }

  // Real API call (commented out for now)
  // const { partnership_id, workspace_id, user_id, public_key, content, attachments } = data;
  // const response = await apiClient.put<PartnershipResponse>(
  //   `/partnerships/v1/${partnership_id}/messages`,
  //   { content, attachments },
  //   { params: { workspace_id, user_id, public_key } }
  // );
  // return response.data;
  throw new Error('API not available');
};

const fetchMessages = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<MessagesResponse> => {
  if (USE_DUMMY_DATA) {
    const partnership = dummyPartnerships.find(p => p._id === data.partnership_id);
    return { data: partnership?.messages || [] };
  }

  // Real API call (commented out for now)
  // const { partnership_id, workspace_id, user_id, public_key } = data;
  // const response = await apiClient.get<MessagesResponse>(
  //   `/partnerships/v1/${partnership_id}/messages`,
  //   { params: { workspace_id, user_id, public_key } }
  // );
  // return response.data;
  return { data: [] };
};

const markMessageAsRead = async (data: {
  partnership_id: string;
  message_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipResponse> => {
  if (USE_DUMMY_DATA) {
    const partnership = dummyPartnerships.find(p => p._id === data.partnership_id);
    if (partnership) {
      const message = partnership.messages?.find(m => m._id === data.message_id);
      if (message) {
        message.read = true;
      }
      return { data: partnership };
    }
    throw new Error('Partnership not found');
  }

  // Real API call (commented out for now)
  // const { partnership_id, message_id, workspace_id, user_id, public_key } = data;
  // const response = await apiClient.put<PartnershipResponse>(
  //   `/partnerships/v1/${partnership_id}/messages/${message_id}/read`,
  //   {},
  //   { params: { workspace_id, user_id, public_key } }
  // );
  // return response.data;
  throw new Error('API not available');
};

const confirmPartnership = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  is_service_provider: boolean;
}): Promise<PartnershipResponse> => {
  if (USE_DUMMY_DATA) {
    const partnership = dummyPartnerships.find(p => p._id === data.partnership_id);
    if (partnership) {
      if (data.is_service_provider) {
        partnership.partnership_confirmed_by_provider = true;
      }
      partnership.status = 'active' as any;
      partnership.updated_at = new Date();
      return { data: partnership };
    }
    throw new Error('Partnership not found');
  }

  // Real API call (commented out for now)
  // const { partnership_id, workspace_id, user_id, public_key, is_service_provider } = data;
  // const response = await apiClient.put<PartnershipResponse>(
  //   `/partnerships/v1/${partnership_id}/confirm`,
  //   { workspace_id, is_service_provider },
  //   { params: { user_id, public_key } }
  // );
  // return response.data;
  throw new Error('API not available');
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

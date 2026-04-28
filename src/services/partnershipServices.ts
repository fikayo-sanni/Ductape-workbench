/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosResponse } from 'axios';
import apiClient from '@/config/axiosinstance';
import { IPartnership, IProductBrief, BriefStatus, IPartnershipMessage, IOnboardingStep } from '@/types/partnership';
import {
  dummyPartnerships,
  dummyProductBriefs,
  getDummyPublishedBriefs,
  getDummyWorkspaceBriefs,
  getPartnershipById as getDummyPartnershipById,
} from '@/data/partnerships.dummy';

/** Set `VITE_PARTNERSHIPS_USE_DUMMY=true` in `.env` to use local dummy data instead of the API. */
const USE_DUMMY_DATA = import.meta.env.VITE_PARTNERSHIPS_USE_DUMMY === 'true';

type ApiEnvelope<T> = {
  status?: boolean;
  message?: string;
  data: T;
};

function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  const body = response.data;
  if (typeof body.status === 'boolean' && !body.status) {
    throw new Error(body.message || 'Request failed');
  }
  return body.data;
}

function idToString(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && '$oid' in (id as Record<string, unknown>)) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id);
}

/** Detail endpoint returns an aggregation array with one document; UI expects `relationship_type` when scoped to a workspace. */
function normalizePartnershipDetail(
  raw: IPartnership | IPartnership[] | null | undefined,
  workspaceId?: string
): IPartnership {
  const single = Array.isArray(raw) ? raw[0] : raw;
  if (!single) {
    throw new Error('Partnership not found');
  }
  let p: IPartnership = { ...single };
  if (workspaceId && !p.relationship_type) {
    const wid = workspaceId;
    const cid = idToString(p.client_id);
    const spid = idToString(p.service_provider_id);
    if (cid && cid === wid) {
      p = { ...p, relationship_type: 'client' };
    } else if (spid && spid === wid) {
      p = { ...p, relationship_type: 'service_provider' };
    }
  }
  return p;
}

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

export interface ProductBriefResponse {
  data: IProductBrief;
}

function normalizeOnboardingSteps(steps: IOnboardingStep[]): IOnboardingStep[] {
  return steps
    .filter((s) => s.name?.trim() && s.description?.trim())
    .map((s) => ({
      name: s.name.trim(),
      description: s.description.trim(),
      message_template: (s.message_template ?? '').trim(),
    }));
}

export function getPartnershipsApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { message?: string; errors?: unknown };
    if (d?.message && typeof d.message === 'string') return d.message;
    if (typeof d?.errors === 'string') return d.errors;
    return err.message || 'Request failed';
  }
  return err instanceof Error ? err.message : String(err);
}

const fetchWorkspacePartnerships = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<PartnershipsResponse> => {
  if (USE_DUMMY_DATA) {
    const myClients = dummyPartnerships.filter(
      p => p.service_provider_id === data.workspace_id || p.relationship_type === 'client'
    );
    const myServiceProviders = dummyPartnerships.filter(
      p => p.client_id === data.workspace_id || p.relationship_type === 'service_provider'
    );
    return { data: { myClients, myServiceProviders } };
  }

  const { workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<ApiEnvelope<PartnershipsResponse['data']>>(
    '/partnerships/v1/partnerships/workspace',
    { params: { workspace_id, user_id, public_key } }
  );
  return { data: unwrapData(response) };
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

  const { partnership_id, user_id, public_key, workspace_id } = data;
  const response = await apiClient.get<ApiEnvelope<IPartnership | IPartnership[]>>(
    `/partnerships/v1/${partnership_id}`,
    { params: { user_id, public_key } }
  );
  return { data: normalizePartnershipDetail(unwrapData(response) as IPartnership | IPartnership[], workspace_id) };
};

const fetchPublishedBriefs = async (data: {
  workspace_id: string;
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

  const { workspace_id, user_id, public_key, search = '', page = 1, limit = 20 } = data;
  const response = await apiClient.get<ApiEnvelope<PublishedBriefsResponse['data']>>(
    '/partnerships/v1/product-briefs/published',
    { params: { workspace_id, user_id, public_key, search, page, limit } }
  );
  return { data: unwrapData(response) };
};

const fetchWorkspaceBriefs = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  status?: BriefStatus;
}): Promise<WorkspaceBriefsResponse> => {
  if (USE_DUMMY_DATA) {
    const briefs = getDummyWorkspaceBriefs(data.workspace_id, data.status);
    return { data: briefs.length > 0 ? briefs : dummyProductBriefs };
  }

  const { workspace_id, user_id, public_key, status = BriefStatus.ALL } = data;
  const response = await apiClient.get<ApiEnvelope<IProductBrief[]>>(
    '/partnerships/v1/product-briefs/workspace',
    { params: { workspace_id, user_id, public_key, status } }
  );
  return { data: unwrapData(response) };
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

  const { workspace_id, user_id, public_key, payload } = data;
  const response = await apiClient.post<ApiEnvelope<IPartnership>>(
    '/partnerships/v1/create',
    { ...payload, workspace_id, user_id, public_key }
  );
  return { data: unwrapData(response) };
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

  const { partnership_id, workspace_id, user_id, public_key, content, attachments } = data;
  await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/${partnership_id}/messages`,
    { content, attachments },
    { params: { workspace_id, user_id, public_key } }
  );
  return fetchPartnershipById({
    partnership_id,
    workspace_id,
    user_id,
    public_key,
  });
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

  const { partnership_id, workspace_id, user_id, public_key } = data;
  const response = await apiClient.get<ApiEnvelope<IPartnershipMessage[]>>(
    `/partnerships/v1/${partnership_id}/messages`,
    { params: { workspace_id, user_id, public_key } }
  );
  return { data: unwrapData(response) };
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

  const { partnership_id, message_id, workspace_id, user_id, public_key } = data;
  await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/${partnership_id}/messages/${message_id}/read`,
    {},
    { params: { workspace_id, user_id, public_key } }
  );
  return fetchPartnershipById({
    partnership_id,
    workspace_id,
    user_id,
    public_key,
  });
};

const createProductBrief = async (data: {
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_id: string;
  title: string;
  description: string;
  product_details: string;
  usage_instructions?: string;
  onboarding_steps: IOnboardingStep[];
  status: BriefStatus.DRAFT | BriefStatus.PUBLISHED;
}): Promise<ProductBriefResponse> => {
  const payload = {
    workspace_id: data.workspace_id,
    user_id: data.user_id,
    public_key: data.public_key,
    product_id: data.product_id,
    title: data.title,
    description: data.description,
    product_details: data.product_details,
    usage_instructions: data.usage_instructions ?? '',
    onboarding_steps: normalizeOnboardingSteps(data.onboarding_steps),
    status: data.status,
  };

  if (USE_DUMMY_DATA) {
    const created: IProductBrief = {
      _id: `brief_${Date.now()}`,
      workspace_id: data.workspace_id,
      product_id: data.product_id,
      title: data.title,
      description: data.description,
      product_details: data.product_details,
      usage_instructions: data.usage_instructions ?? '',
      onboarding_steps: payload.onboarding_steps,
      status: data.status,
      created_at: new Date(),
      updated_at: new Date(),
    };
    dummyProductBriefs.push(created);
    return { data: created };
  }

  const response = await apiClient.post<ApiEnvelope<IProductBrief>>(
    '/partnerships/v1/product-briefs',
    payload
  );
  return { data: unwrapData(response) };
};

const updateProductBrief = async (data: {
  brief_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_id?: string;
  title: string;
  description: string;
  product_details: string;
  usage_instructions?: string;
  onboarding_steps: IOnboardingStep[];
}): Promise<{ data: boolean }> => {
  const body: Record<string, unknown> = {
    workspace_id: data.workspace_id,
    user_id: data.user_id,
    public_key: data.public_key,
    title: data.title,
    description: data.description,
    product_details: data.product_details,
    usage_instructions: data.usage_instructions ?? '',
    onboarding_steps: normalizeOnboardingSteps(data.onboarding_steps),
  };
  if (data.product_id) body.product_id = data.product_id;

  if (USE_DUMMY_DATA) {
    const b = dummyProductBriefs.find((x) => x._id === data.brief_id);
    if (b) {
      Object.assign(b, {
        ...body,
        onboarding_steps: body.onboarding_steps,
        updated_at: new Date(),
      });
    }
    return { data: true };
  }

  const response = await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/product-briefs/${data.brief_id}`,
    body
  );
  return { data: unwrapData(response) };
};

const publishProductBrief = async (data: {
  brief_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
}): Promise<{ data: boolean }> => {
  if (USE_DUMMY_DATA) {
    const b = dummyProductBriefs.find((x) => x._id === data.brief_id);
    if (b) {
      b.status = BriefStatus.PUBLISHED;
      b.updated_at = new Date();
    }
    return { data: true };
  }

  const response = await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/product-briefs/${data.brief_id}/publish`,
    { workspace_id: data.workspace_id },
    { params: { user_id: data.user_id, public_key: data.public_key } }
  );
  return { data: unwrapData(response) };
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

  const { partnership_id, workspace_id, user_id, public_key, is_service_provider } = data;
  await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/${partnership_id}/confirm`,
    { workspace_id, is_service_provider },
    { params: { user_id, public_key } }
  );
  return fetchPartnershipById({
    partnership_id,
    workspace_id,
    user_id,
    public_key,
  });
};

const movePartnershipFunnelStep = async (data: {
  partnership_id: string;
  workspace_id: string;
  user_id: string;
  public_key: string;
  service_provider_id: string;
  step: number;
}): Promise<PartnershipResponse> => {
  if (USE_DUMMY_DATA) {
    const p = dummyPartnerships.find((x) => x._id === data.partnership_id);
    if (p) {
      p.current_funnel_step = data.step;
      p.updated_at = new Date();
      return { data: p };
    }
    throw new Error('Partnership not found');
  }

  const { partnership_id, workspace_id, user_id, public_key, service_provider_id, step } = data;
  await apiClient.put<ApiEnvelope<boolean>>(
    `/partnerships/v1/${partnership_id}/funnel/${step}`,
    { service_provider_id },
    { params: { workspace_id, user_id, public_key } }
  );
  return fetchPartnershipById({
    partnership_id,
    workspace_id,
    user_id,
    public_key,
  });
};

const partnershipServices = {
  fetchWorkspacePartnerships,
  fetchPartnershipById,
  fetchPublishedBriefs,
  fetchWorkspaceBriefs,
  createPartnership,
  createProductBrief,
  updateProductBrief,
  publishProductBrief,
  addMessage,
  fetchMessages,
  markMessageAsRead,
  movePartnershipFunnelStep,
  confirmPartnership,
};

export default partnershipServices;

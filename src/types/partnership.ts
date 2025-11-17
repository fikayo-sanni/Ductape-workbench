// Enums matching backend
export enum PartnershipStatus {
  PROSPECTIVE = 'prospective',
  ACTIVE = 'active',
  REJECTED = 'rejected',
}

export enum BriefStatus {
  ALL = "all",
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished'
}

export enum SenderType {
  SERVICE_PROVIDER = 'service_provider',
  CLIENT = 'client'
}

// Onboarding Step Types
export interface IOnboardingStep {
  name: string;
  description: string;
  message_template: string;
}

// Sales Funnel Types
export interface ISalesFunnelStep {
  name: string;
  description: string;
  message_template: string;
  order: number;
}

export interface ISalesFunnel {
  _id: string;
  workspace_id: string;
  product_brief_id: string;
  steps: ISalesFunnelStep[];
  created_at: Date;
  updated_at: Date;
}

// Product Brief Types
export interface IProductBrief {
  _id: string;
  workspace_id: string;
  product_id: string; // App/Product ID
  title: string;
  description: string;
  product_details: string; // What the product does
  usage_instructions: string; // How to use the product
  onboarding_steps: IOnboardingStep[];
  status: BriefStatus;
  created_at: Date;
  updated_at: Date;
  // Populated fields from aggregation
  workspace?: IWorkspaceInfo;
  workspaceOwner?: IUserInfo;
  product?: IProductInfo;
}

// Partnership Message Types
export interface IPartnershipMessage {
  _id: string;
  sender_id: string;
  sender_type: SenderType;
  content: string;
  attachments: string[];
  read: boolean;
  created_at: Date;
  // Populated from aggregation
  sender?: IUserInfo;
}

// Partnership Types
export interface IPartnership {
  _id: string;
  service_provider_id: string;
  client_id: string;
  product_brief_id: string;
  sales_funnel_id?: string;
  current_funnel_step: number;
  status: PartnershipStatus;
  messages: IPartnershipMessage[];
  deliverables: string[];
  partnership_confirmed_by_provider: boolean;
  created_at: Date;
  updated_at: Date;
  // Populated fields from aggregation
  serviceProvider?: IWorkspaceInfo;
  serviceProviderOwner?: IUserInfo;
  client?: IWorkspaceInfo;
  clientOwner?: IUserInfo;
  productBrief?: IProductBrief;
  salesFunnel?: ISalesFunnel;
  relationship_type?: 'client' | 'service_provider'; // Current workspace's role in this partnership
}

// Supporting interface types for populated data
export interface IWorkspaceInfo {
  _id: string;
  name: string;
  url?: string;
  email?: string;
  logo?: string;
  description?: string;
  address?: string;
  is_active?: boolean;
}

export interface IUserInfo {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
}

export interface IProductInfo {
  _id: string;
  tag: string;
  app_name: string;
  website?: string;
  description: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  FAQS?: any[];
  aboutText?: string;
  aboutHTML?: string;
  status?: string;
  get_started?: string;
  require_whitelist?: boolean;
  latestVersion?: any;
  versions?: any[];
}

// API Response Types
export interface IProductBriefResponse {
  status: boolean;
  message: string;
  data: IProductBrief;
}

export interface IProductBriefsListResponse {
  status: boolean;
  message: string;
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

export interface IWorkspacePartnershipsResponse {
  status: boolean;
  message: string;
  data: {
    myServiceProviders: IPartnership[]; // Partnerships where current workspace is the client
    myClients: IPartnership[]; // Partnerships where current workspace is the service provider
    total: number;
    summary: {
      serviceProviders: number;
      clients: number;
    };
  };
}

export interface IPartnershipResponse {
  status: boolean;
  message: string;
  data: IPartnership;
}

export interface ISalesFunnelResponse {
  status: boolean;
  message: string;
  data: ISalesFunnel;
}

// Form/Creation Payloads
export interface ICreateProductBriefPayload {
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_id: string;
  title: string;
  description: string;
  product_details: string;
  usage_instructions?: string;
  onboarding_steps?: IOnboardingStep[];
}

export interface IUpdateProductBriefPayload {
  workspace_id: string;
  user_id: string;
  public_key: string;
  title?: string;
  description?: string;
  product_details?: string;
  usage_instructions?: string;
  onboarding_steps?: IOnboardingStep[];
}

export interface ICreateSalesFunnelPayload {
  workspace_id: string;
  user_id: string;
  public_key: string;
  product_brief_id: string;
  steps: ISalesFunnelStep[];
}

export interface ICreatePartnershipPayload {
  workspace_id: string;
  user_id: string;
  public_key: string;
  service_provider_id: string;
  client_id: string;
  product_brief_id: string;
  messages?: Array<{
    content: string;
    attachments?: string[];
  }>;
}

export interface IAddMessagePayload {
  workspace_id: string;
  user_id: string;
  public_key: string;
  content: string;
  attachments?: string[];
}

export interface IAddDeliverablePayload {
  service_provider_id: string;
  deliverable: string;
}

// Search Types
export interface ISearchPartnersQuery {
  keywords?: string;
  workspace_name?: string;
  product_name?: string;
}

// Pagination
export interface IPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

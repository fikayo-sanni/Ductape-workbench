export interface PricingPlan {
    pricing_mode: string;
    interval?: string;
    overage_price?: number;
    limits?: {
        per_minute?: number;
        per_hour?: number;
        per_day?: number;
        per_week?: number;
        per_month?: number;
    };
    unit_price: number;
    name: string;
    currency: string;
}

// Enums for pricing
export enum PricingMode {
  UPFRONT = 'upfront',
  PER_REQUEST = 'per_request',
  ONE_TIME = 'one_time',
  RECURRING = 'recurring'
}

export enum PaymentInterval {
  MONTHLY = 'monthly',
  BI_WEEKLY = 'bi-weekly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
  HOURLY = 'hourly',
  MINUTELY = 'minutely',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly',
  ONE_TIME = 'one-time'
}

export type IntervalType = 'monthly' | 'bi-weekly' | 'weekly' | 'daily' | 'hourly' | 'minutely' | 'yearly' | 'quarterly' | 'one-time';

export interface Pricing {
  limits: {
    per_minute?: number;
    per_day?: number;
    per_hour?: number;
    per_week?: number;
    per_month?: number;
  };
  _id: string;
  workspace_id: string;
  pricing_tag: string;
  action_id: string;
  pricing_mode: string;
  interval: string;
  unit_price: number;
  overage_price: number;
  name: string;
  currency: string;
  envs: string[];
  is_active: boolean;
  __v: number;
}

export interface PricingApiResponse {
  status: boolean;
  meta: Record<string, unknown>;
  data: {
    pricings: Pricing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    modeCounts: Record<string, number>;
  };
}

export interface TotalIncomeRecord {
  status: boolean;
  meta: object;
  data: {
    totalRevenue: number;
    growthRate: number;
    revenueThisMonth: number;
    averageRevenuePerMonth: number;
    currency: string;
    revenueTrend: any[];
    monthlyBreakdown: any[];
  }
}


export interface TotalExpenseRecord {
    status: boolean;
    data: {
        totalSpending: number;
        paid: number;
        pending: number;
        issues: number;
        currency: string;
        categoryBreakdown: [
            {
                category: string;
                amount: number;
                percentage: number;
            }
        ],
        recentExpenses: [
            {
                reference: string;
                vendor: string;
                category: string;
                details: string;
                amount: number;
                status: string;
                usage_count?: number;
                bundle_name?: string;
                date?: string;
            }
        ]
    }
}

export interface DeletePricingResponse {
  status: boolean,
  meta: object,
  data: boolean
}


// Billing Report

interface ResourceMetrics {
  dbActions: number;
  caches: number;
  databases: number;
  storageUnits: number;
  messageBrokers: number;
  notifiers: number;
  jobs: number;
  cloudFunctions: number;
  apps: number;
  products: number;
  users: number;
  requests: number;
}

interface WorkspaceDefaultEnv {
  env_name: string;
  slug: string;
  description: string;
  _id: string;
}

interface Workspace {
  payment_status: string;
  _id: string;
  name: string;
  description: string;
  defaultEnvs: WorkspaceDefaultEnv[];
  __v: number;
}

interface Subscription {
  _id: string;
  plan_id: string;
  workspace_id: string;
  status: string;
  startDate: string;
  endDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastBillingDate: string;
  nextBillingDate: string;
  createdAt: string;
  updatedAt: string;
}

interface MarketplaceAccess {
  canPublish: boolean;
  revenueShare: number;
}

interface UsagePricing {
  additionalDatabasePrice: number;
  additionalUserPrice: number;
  additionalRequestPrice: number;
  additionalStoragePrice: number;
}

interface ProductLimits {
  caches: number;
  databases: number;
  actions: number;
  storageUnits: number;
  messageBrokers: number;
  notifiers: number;
  jobs: number;
  cloudFunctions: number;
  _id: string;
}

interface Plan {
  marketplaceAccess: MarketplaceAccess;
  usagePricing: UsagePricing;
  _id: string;
  name: string;
  tag: string;
  isEnterprise: boolean;
  monthlyPrice: number;
  description: string;
  users: number;
  monthlyRequests: number;
  fileTransfer: number;
  apps: number;
  products: number;
  logsRetentionDays: number;
  usageDataRetentionDays: number;
  productLimits: ProductLimits;
  isPayAsYouGo: boolean;
  customFeatures: any[];
  createdAt: string;
  updatedAt: string;
}

interface BillingReport {
  resourceUsage: ResourceMetrics;
  resourceCosts: ResourceMetrics;
  _id: string;
  workspace_id: Workspace;
  subscription_id: Subscription;
  plan_id: Plan;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  basePrice: number;
  totalCost: number;
  paid: boolean;
  planChangeHistory: string[];
  planChangeReports: string[];
  createdAt: string;
  updatedAt: string;
}

interface PlanChangeDetails {
  changeDate: string;
  effectiveDate: string;
  oldPlanUsedAmount: number;
  reason: string;
}

interface PreviousPlanReport {
  billingReport: BillingReport;
  planDetails: PlanChangeDetails;
}

interface PlanChangeHistory {
  previousPlanReport: PreviousPlanReport;
}

interface BillingData {
  currentBillingReport: BillingReport;
  planChangeHistory: PlanChangeHistory;
}

export interface BillingResponse {
  status: boolean;
  meta: Record<string, any>;
  message: string;
  data: BillingData;
}

// Billing Plans

interface ResourcePricing {
  action: number;
  cache: number;
  database: number;
  storage: number;
  messageBroker: number;
  notifier: number;
  job: number;
  cloudFunction: number;
  log: number;
  app: number;
  product: number;
  user: number;
  _id: string;
}

export interface BillingPlan {
  marketplaceAccess: MarketplaceAccess;
  usagePricing: UsagePricing;
  _id: string;
  name: string;
  tag: string;
  isEnterprise: boolean;
  monthlyPrice: number;
  description: string;
  users: number;
  monthlyRequests: number;
  fileTransfer: number;
  apps: number;
  products: number;
  logsRetentionDays: number;
  usageDataRetentionDays: number;
  productLimits: ProductLimits;
  isPayAsYouGo: boolean;
  resourcePricing?: ResourcePricing;
  customFeatures: any[];
  createdAt: string;
  updatedAt: string;
}

export interface BillingApiResponse {
  status: boolean;
  meta: Record<string, unknown>;
  data: BillingPlan[];
}


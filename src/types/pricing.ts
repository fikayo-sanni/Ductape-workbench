export interface PricingPlan {
    pricing_mode: string;
    interval: string;
    overage_price?: number;
    limits: {
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

// More strict version with literal types
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
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export interface Pricing {
  limits: {
    per_minute: number;
    per_day: number;
    per_hour: number;
    per_week: number;
    per_month: number;
  };
  _id: string;
  workspace_id: string;
  pricing_tag: string;
  action_id: string;
  pricing_mode: PricingMode;
  interval: PaymentInterval;
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
    modeCounts: Record<PricingMode, number>;
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
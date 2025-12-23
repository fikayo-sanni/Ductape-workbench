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
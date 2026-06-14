export interface QuotaOption {
  type: string;
  app?: string;
  event: string;
  database?: string;
  quota?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  retries?: number;
  healthcheck?: string;
}

export interface ProductQuota {
  _id?: string;
  name: string;
  tag: string;
  description?: string;
  input?: Record<string, unknown>;
  options?: QuotaOption[];
  created_at?: string | Date;
  updated_at?: string | Date;
}

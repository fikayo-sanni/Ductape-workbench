export interface FallbackOption {
  type: string;
  app?: string;
  event: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  retries?: number;
  healthcheck?: string;
}

export interface ProductFallback {
  _id?: string;
  name: string;
  tag: string;
  description?: string;
  input?: Record<string, unknown>;
  options?: FallbackOption[];
  created_at?: string | Date;
  updated_at?: string | Date;
}

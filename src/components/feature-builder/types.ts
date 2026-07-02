/* eslint-disable @typescript-eslint/no-explicit-any */

export type ResilienceComponentCategory =
  | 'action'
  | 'database'
  | 'notification'
  | 'storage'
  | 'graph'
  | 'vector'
  | 'produce';

export interface ProductContext {
  _id?: string;
  tag?: string;
  name?: string;
  logo?: string;
  envs?: Array<{ slug: string; name?: string }>;
  apps?: any[];
  databases?: any[];
  storages?: any[];
  notifications?: any[];
  graphs?: any[];
  vectors?: any[];
  messageBrokers?: any[];
  workflows?: any[];
  healthchecks?: any[];
}

export interface MappingSource {
  id: string;
  label: string;
  prefix: string;
  fields: Array<{ key: string; type?: string }>;
}

export interface WorkflowStepDraft {
  tag: string;
  name?: string;
  type: string;
  app?: string;
  database?: string;
  graph?: string;
  storage?: string;
  vector?: string;
  notification?: string;
  broker?: string;
  quota?: string;
  fallback?: string;
  workflow?: string;
  event: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  depends_on?: string[];
  condition?: string;
  options?: Record<string, unknown>;
}

export interface ResilienceOptionDraft {
  id: string;
  type: string;
  name: string;
  tag: string;
  event: string;
  app?: string;
  database?: string;
  action?: any;
  retries: number;
  healthcheck?: string;
  quota?: number;
}

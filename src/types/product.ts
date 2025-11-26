/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Cache {
  expiry: number;
  period: string;
  tag: string;
  _id: string;
  data: [];
  name?: string;
}

export interface IProduct {
  workspace_id: string;
  name: string;
  description: string;
  tag: string;
  status: string;
  active: boolean;
  envs: Array<{
    active: boolean;
    env_name: string;
    description: string;
    slug: string;
    _id: string;
  }>;
  _id: string;
  private_key: string;
  apps: any[];
  caches: Cache[];
  features: any[];
  quota: any[];
  fallback: any[];
  storage: any[];
  brokers: any[];
  sessions: any[];
  messageBrokers: any[];
  functions: any[];
  variables?: any[];
  auths?: any[];
  databases: any[];
  graphs?: any[];
  jobs: any[];
  healthchecks?: any[];
  notifications?: any[];
  __v: number;
  logo?: string;
  steps: number;
  steps_data?: any;
}

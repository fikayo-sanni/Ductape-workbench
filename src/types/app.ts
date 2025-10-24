/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";

interface RetryPolicy {
  tag: string;
  max: number;
  policy: {
    [key: string]: {
      available: boolean;
      lag: number;
    };
  };
}

interface Constant {
  key: string;
  value: string;
  type: string;
  description: string;
  _id: string;
}

interface Auth {
  name: string;
  tag: string;
  expiry: number;
  period: string;
  description: string;
  _id: string;
  envs: any[];
  action?: any;
  action_tag?: string;
  setup_type: string;
}

interface Env {
  env_name: string;
  slug: string;
  description: string;
  pricing_plans: any[];
  whitelist: boolean;
  active: boolean;
  _id: string;
  base_url: string;
}

interface Variable {
  key: string;
  type: string;
  description: string;
  required: boolean;
  minlength: number;
  maxlength: number;
  _id: string;
}

export interface IAppFolders {
  name: any;
  level: number;
  _id: string;
  parent_id?: string;
}

export interface IApp {
  latest_version: any;
  created_at: string | number | Date;
  author: ReactNode;
  updated_at: string;
  access_tag?: string;
  folders: IAppFolders[];
  _id: string;
  workspace_id: string;
  tag: string;
  app_name: string;
  description: string;
  get_started: number;
  require_whitelist: boolean;
  versions: Array<IAppVersion>;
  logo: string;
  app_id?: string;
  envs_count?: number;
  actions_count?: number;
  status?: string;
  active: boolean;
  domains?: string[];
}

export interface IAppVersion {
  tag: string;
  latest: boolean;
  envs: Array<Env>;
  folders?: Array<IAppFolders>;
  description?: string;
  active: boolean;
  webhooks?: any;
  actions: Array<any>;
  constants: Array<Constant>;
  auths: Array<Auth>;
  variables: Array<Variable>;
  retries: RetryPolicy;
  status?: string;
  actions_count?: number;
  events_count?: number;
  auths_count?: number;
  constants_count?: number;
  variables_count?: number;
  envs_count?: number;
  steps: number;
}

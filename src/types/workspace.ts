import { User } from "./auth";

export interface Env {
  slug: string;
  env_name: string;
  active: boolean;
}

export interface Workspace {
  workspace_id: string;
  workspace_name: string;
  user_id: string;
  default: boolean;
  accepted: boolean;
  access_level: string;
  defaultEnvs: Env[];
  logo?: string;
  description?: string;
}

export interface InviteMemberPayload {
  public_key: string;
  user_id: string;
  emails?: Array<string> | undefined;
  email?: string | undefined;
  access_level: string;
  type: "multiple" | "single";
  workspace_id: string;
}

export interface WorkspaceMember {
  _id: string;
  workspace_id: string;
  user_id: string;
  access_level: string;
  accepted: boolean;
  default: boolean;
  user: User;
  date_joined?: string;
}

export interface WorkspaceMembersResponse {
  status: boolean;
  meta: object;
  data: WorkspaceMember[];
}

export interface ActionResponse {
  status: boolean;
  message: string;
  data?: any;
}

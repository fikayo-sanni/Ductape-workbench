import { Workspace } from "./workspace";

export interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  active: boolean;
  auth_token: string;
  public_key: string;
  workspaces: Workspace[];
  profilePicture?: string;
  requires_verification?: boolean;
  verified?: boolean;
}

export interface SignupPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  active: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

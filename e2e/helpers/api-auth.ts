import fs from 'fs';
import path from 'path';
import { e2eApiBaseUrl } from './env';

export interface E2eUserSession {
  token: string;
  user: Record<string, unknown>;
  currentWorkspaceId: string | null;
}

interface LoginApiResult {
  status: boolean;
  data: {
    result: {
      _id: string;
      email: string;
      firstname: string;
      lastname: string;
      active: boolean;
      auth_token: string;
      public_key: string;
      workspaces?: Array<{
        workspace_id: string;
        workspace_name?: string;
        default?: boolean;
        accepted?: boolean;
      }>;
      requires_verification?: boolean;
    };
  };
}

/**
 * Authenticate against the users API (same contract as {@link authServices.login}).
 */
export async function loginViaApi(email: string, password: string): Promise<E2eUserSession> {
  const apiBase = e2eApiBaseUrl();
  const response = await fetch(`${apiBase}/users/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`E2E login failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as LoginApiResult;
  const result = payload.data?.result;
  if (!payload.status || !result?.auth_token) {
    throw new Error('E2E login response missing auth_token');
  }

  if (result.requires_verification) {
    throw new Error(
      'E2E user requires email verification — use a verified test account or complete OTP manually',
    );
  }

  const workspaces = result.workspaces ?? [];
  const defaultWorkspace =
    workspaces.find((w) => w.default && w.accepted !== false) ??
    workspaces.find((w) => w.accepted !== false) ??
    workspaces[0];

  const user = {
    _id: result._id,
    email: result.email,
    firstname: result.firstname,
    lastname: result.lastname,
    active: result.active,
    auth_token: result.auth_token,
    public_key: result.public_key,
    workspaces,
  };

  return {
    token: result.auth_token,
    user,
    currentWorkspaceId: defaultWorkspace?.workspace_id ?? null,
  };
}

/**
 * Build Playwright storage state with localStorage keys the workbench reads on boot.
 */
export function buildStorageState(baseUrl: string, session: E2eUserSession) {
  const origin = new URL(baseUrl).origin;
  const entries: Array<{ name: string; value: string }> = [
    { name: 'token', value: session.token },
    { name: 'user', value: JSON.stringify(session.user) },
  ];
  if (session.currentWorkspaceId) {
    entries.push({ name: 'currentWorkspaceId', value: session.currentWorkspaceId });
  }

  return {
    cookies: [] as Array<Record<string, unknown>>,
    origins: [
      {
        origin,
        localStorage: entries,
      },
    ],
  };
}

export function writeAuthStorageFile(filePath: string, baseUrl: string, session: E2eUserSession): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(buildStorageState(baseUrl, session), null, 2));
}

export function writeEmptyAuthStorageFile(filePath: string, baseUrl: string): void {
  const origin = new URL(baseUrl).origin;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({ cookies: [], origins: [{ origin, localStorage: [] }] }, null, 2),
  );
}

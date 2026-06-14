export function e2eBaseUrl(): string {
  return (process.env.E2E_BASE_URL ?? 'http://localhost:4310').replace(/\/+$/, '');
}

export function e2eApiBaseUrl(): string {
  return (process.env.E2E_API_BASE_URL ?? 'http://localhost:4311').replace(/\/+$/, '');
}

export function hasAuthCredentials(): boolean {
  return Boolean(process.env.E2E_EMAIL?.trim() && process.env.E2E_PASSWORD?.trim());
}

export function authReady(): boolean {
  return process.env.E2E_AUTH_READY === '1';
}

export function skipUnlessAuthReady(): boolean {
  return !authReady();
}

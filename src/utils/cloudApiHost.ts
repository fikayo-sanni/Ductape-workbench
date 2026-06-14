import type { SDKProxyService } from '@/services/sdkProxy';
import { isUsingViteApiProxy, resolveApiBaseUrl } from '@/config/apiBaseUrl';

/** Hostname the workbench uses for SDK proxy / API calls (used to resolve Ductape egress IPs). */
export function resolveWorkbenchApiHostname(): string {
  const base = resolveApiBaseUrl();
  const origin = base || (typeof window !== 'undefined' ? window.location.origin : '');
  const normalized = origin.endsWith('/') ? origin : `${origin}/`;
  return new URL('/proxy/v1/sdk-proxy/execute', normalized).hostname;
}

export function isLocalDevApiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

export interface ResolveHostResponse {
  host: string;
  addresses: string[];
}

/** DNS-resolve the API/proxy hostname via integrations (server-side lookup). */
export async function resolveApiHostAddresses(
  hostname: string,
  sdkProxy: SDKProxyService,
): Promise<ResolveHostResponse> {
  const result = await sdkProxy.cloud.connections.resolveNetworkingHost<{
    host?: string;
    addresses?: string[];
  }>(hostname);
  return {
    host: result?.host || hostname,
    addresses: Array.isArray(result?.addresses) ? result.addresses : [],
  };
}

export function describeWorkbenchApiTarget(): string {
  if (isUsingViteApiProxy()) {
    return `Vite dev proxy (${typeof window !== 'undefined' ? window.location.host : 'local'})`;
  }
  const base = resolveApiBaseUrl();
  return base || 'current origin';
}

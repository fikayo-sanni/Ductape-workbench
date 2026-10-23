/**
 * API base URL for axios.
 *
 * Default local dev: http://localhost:4311/ (API gateway).
 * Optional: VITE_USE_VITE_PROXY=true sends traffic via :4310 (Vite) → :4311.
 */
export function resolveApiBaseUrl(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_VITE_PROXY === 'true') {
    return '';
  }
  // Set when the container starts (public/config.js is replaced from DUCTAPE_PUBLIC_URL), so a published image
  // needs no rebuild to run on another domain. It wins over the address baked in at build time.
  const runtime = (typeof window !== 'undefined'
    ? (window as { __DUCTAPE_CONFIG__?: { apiBaseUrl?: string } }).__DUCTAPE_CONFIG__?.apiBaseUrl
    : undefined)?.trim();
  const raw = runtime || (import.meta.env.VITE_API_BASE_URL || '').trim();
  const fallback = import.meta.env.DEV ? 'http://localhost:4311' : '';
  const base = raw || fallback;
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

export function isUsingViteApiProxy(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_VITE_PROXY === 'true';
}

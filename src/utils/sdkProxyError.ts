/** Axios-style "Request failed with status code 500" — not useful to show users. */
function isGenericHttpError(message: string): boolean {
  return /^Request failed with status code \d+$/.test(message.trim());
}

function messageFromPayload(payload: unknown): string | undefined {
  if (payload === null || payload === undefined) return undefined;
  if (typeof payload === 'string' && payload.trim()) return payload.trim();

  if (typeof payload !== 'object') return undefined;

  const record = payload as Record<string, unknown>;
  const raw = record.errors ?? record.message ?? record.error;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();

  if (raw && typeof raw === 'object' && 'message' in raw) {
    const nested = (raw as { message: unknown }).message;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }

  return undefined;
}

/**
 * Best user-facing message from a proxy HTTP error response (sdk-proxy or db-proxy).
 * Prefers upstream provider errors (e.g. GCP billing, Azure validation) over generic proxy/axios text.
 */
export function extractSdkProxyErrorMessage(err: unknown, fallbackMessage = 'SDK operation failed'): string {
  const axiosErr = err as {
    response?: { data?: Record<string, unknown> };
    message?: string;
  };

  const data = axiosErr?.response?.data;
  if (data && typeof data === 'object') {
    const fromUpstream = messageFromPayload(data.upstream_error);
    if (fromUpstream) return fromUpstream;

    const fromError =
      typeof data.error === 'string' && !isGenericHttpError(data.error) ? data.error.trim() : undefined;
    if (fromError) return fromError;

    const fromMessage =
      typeof data.message === 'string' &&
      data.message !== fallbackMessage &&
      !isGenericHttpError(data.message)
        ? data.message.trim()
        : undefined;
    if (fromMessage) return fromMessage;
  }

  const fallback = axiosErr?.message?.trim();
  if (fallback && !isGenericHttpError(fallback)) return fallback;

  return fallbackMessage;
}

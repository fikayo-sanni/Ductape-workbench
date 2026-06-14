const LOG_PREFIX = '[CloudConnection]';

const SENSITIVE_KEYS = new Set([
  'role_arn',
  'service_account_json',
  'connection_string',
  'client_secret',
  'atlas_private_key',
  'aura_client_secret',
  'secret_access_key',
  'session_token',
  'public_key',
  'encrypted_payload',
  'token',
  'trust_policy',
]);

export function sanitizeCloudPayload(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[max-depth]';
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCloudPayload(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] =
        typeof val === 'string' && val.length > 8 ? `${val.slice(0, 4)}…[redacted]` : '[redacted]';
      continue;
    }
    out[key] = sanitizeCloudPayload(val, depth + 1);
  }
  return out;
}

export function summarizeCloudSetupResult(result: unknown): Record<string, unknown> {
  if (result == null) return { type: 'null' };
  if (typeof result !== 'object') return { type: typeof result };
  const obj = result as Record<string, unknown>;
  const conn =
    obj.connection && typeof obj.connection === 'object'
      ? (obj.connection as Record<string, unknown>)
      : obj.id
        ? obj
        : null;
  if (conn) {
    return {
      connectionId: conn.id,
      provider: conn.provider,
      status: conn.status,
      display_name: conn.display_name,
      hasTrustPolicy: Boolean(obj.trust_policy),
      hasExternalId: Boolean(obj.external_id),
      hasSetupInstructions: Boolean(obj.setup_instructions),
    };
  }
  if (obj.valid != null) return { valid: obj.valid, status: obj.status, message: obj.message };
  if (obj.deleted === true) return { deleted: true };
  return { keys: Object.keys(obj).slice(0, 10) };
}

export function logCloud(step: string, data?: Record<string, unknown>): void {
  if (data) {
    console.info(`${LOG_PREFIX} ${step}`, data);
  } else {
    console.info(`${LOG_PREFIX} ${step}`);
  }
}

export function logCloudWarn(step: string, data?: Record<string, unknown>): void {
  if (data) {
    console.warn(`${LOG_PREFIX} ${step}`, data);
  } else {
    console.warn(`${LOG_PREFIX} ${step}`);
  }
}

export function logCloudError(step: string, error: unknown, extra?: Record<string, unknown>): void {
  const err =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { raw: String(error) };

  const ax =
    error && typeof error === 'object' && 'isAxiosError' in error
      ? (error as {
          code?: string;
          response?: { status?: number; data?: unknown };
          config?: { baseURL?: string; url?: string; method?: string };
        })
      : null;

  const requestUrl =
    ax?.config?.baseURL != null || ax?.config?.url != null
      ? `${ax.config.baseURL ?? ''}${ax.config.url ?? ''}`
      : undefined;

  const axiosExtra = ax
    ? {
        axiosCode: ax.code,
        httpStatus: ax.response?.status,
        requestUrl,
        method: ax.config?.method,
        responseData: ax.response
          ? sanitizeCloudPayload(ax.response.data)
          : undefined,
        hint:
          ax.code === 'ERR_NETWORK' && !ax.response
            ? requestUrl?.includes('localhost:4311') || requestUrl?.includes(':4311/')
              ? 'Connection refused on :4311 — start the API gateway: cd platform && docker compose up api-gateway proxy integrations'
              : 'Browser blocked or could not reach API (CORS, wrong URL, or server down).'
            : undefined,
      }
    : {};

  console.error(`${LOG_PREFIX} ${step}`, { ...extra, ...axiosExtra, ...err });
}

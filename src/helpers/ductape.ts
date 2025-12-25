/**
 * Ductape SDK Proxy Helpers
 * These helpers provide a consistent interface for SDK operations through the backend proxy
 * instead of using the SDK directly (which requires Node.js modules not available in browsers)
 */

import { SDKProxyService, SDKProxyConfig } from '@/services/sdkProxy';
import { DatabaseProxyService, DatabaseProxyConfig } from '@/services/databaseProxy';

interface DuctapeInit extends SDKProxyConfig {
  type: 'product' | 'app';
}

/**
 * Initialize SDK proxy for product or app operations
 * Returns the appropriate builder from the proxy service
 */
export const connectDuctape = ({
  workspace_id,
  user_id,
  token,
  public_key,
  type
}: DuctapeInit) => {
  if (!workspace_id || !user_id || !token || !public_key) {
    throw new Error('Missing required configuration for Ductape initialization');
  }

  const proxy = new SDKProxyService({ workspace_id, user_id, token, public_key });

  // Return based on type
  if (type === 'product') {
    return proxy.product;
  } else {
    return proxy.app;
  }
};

/**
 * Initialize SDK proxy for workspace-level operations
 * Returns the full SDKProxyService instance
 */
export const connectDuctapeWorkspace = ({
  workspace_id,
  user_id,
  token,
  public_key,
}: SDKProxyConfig): SDKProxyService => {
  if (!workspace_id || !user_id || !token || !public_key) {
    throw new Error('Missing required configuration for Ductape initialization');
  }

  return new SDKProxyService({ workspace_id, user_id, token, public_key });
};

/**
 * Initialize Database proxy for database operations
 * Returns the DatabaseProxyService instance
 */
export const connectDuctapeDatabase = ({
  workspace_id,
  user_id,
  token,
  public_key,
}: DatabaseProxyConfig): DatabaseProxyService => {
  if (!workspace_id || !user_id || !token || !public_key) {
    throw new Error('Missing required configuration for Database proxy initialization');
  }

  return new DatabaseProxyService({ workspace_id, user_id, token, public_key });
};

// Re-export types for convenience
export type { SDKProxyConfig, SDKProxyService };
export type { DatabaseProxyConfig, DatabaseProxyService };

/**
 * SDK Proxy Service
 * Unified frontend service that proxies ALL SDK operations through the secure backend endpoint
 *
 * This provides a single interface for all SDK module operations:
 * - product, app, sessions, features, notifications, storage, caches, jobs, etc.
 *
 * All requests are encrypted using the product's public_key before transmission.
 * This ensures SDK operations are not visible in browser network logs.
 */

import apiClient from '@/config/axiosinstance';
import { encryptProxyPayload } from '@/utils/proxyEncryption';

/**
 * Configuration for the SDK Proxy Service
 */
export interface SDKProxyConfig {
  workspace_id: string;
  user_id: string;
  public_key: string;
  token: string;
}

/**
 * Available SDK modules
 */
export type SDKModule =
  | 'product'
  | 'app'
  | 'databases'
  | 'graph'
  | 'webhooks'
  | 'notifications'
  | 'messageBrokers'
  | 'storage'
  | 'vector'
  | 'caches'
  | 'sessions'
  | 'quotas'
  | 'actions'
  | 'features'
  | 'jobs'
  | 'logs'
  | 'resilience'
  | 'health'
  | 'fallback'
  | 'secrets';

/**
 * Response from the SDK proxy endpoint
 * Note: Backend uses `status` for success indicator, not `success`
 */
interface SDKProxyResponse<T = any> {
  status: boolean;
  data?: {
    data: T;
    execution_time_ms: number;
    request_id: string;
  };
  message?: string;
  code?: string;
}

/**
 * SDK Proxy Service
 * Provides a unified interface to execute any SDK module operation
 */
export class SDKProxyService {
  private config: SDKProxyConfig;

  constructor(config: SDKProxyConfig) {
    this.config = config;
  }

  /**
   * Execute an SDK method through the proxy
   * Encrypts the sensitive payload before transmission
   *
   * @param module - The SDK module (e.g., "product", "sessions")
   * @param method - The method name (e.g., "create", "apps.connect")
   * @param params - Parameters to pass to the method
   */
  private async execute<T = any>(module: SDKModule, method: string, ...params: any[]): Promise<T> {
    // Log vector operations for debugging
    if (module === 'vector' && ['fetchVectors', 'listVectors', 'listNamespaces', 'getStats'].includes(method)) {
      console.log(`[SDKProxy.execute] ${module}.${method}`, params);
    }

    // Encrypt sensitive data (module, method, params, user_id) using public_key
    const sensitiveData = {
      module,
      method,
      params,
      user_id: this.config.user_id,
    };
    const encryptedPayload = encryptProxyPayload(sensitiveData, this.config.public_key);

    const response = await apiClient.post<SDKProxyResponse<T>>(
      '/proxy/v1/sdk-proxy/execute',
      {
        encrypted_payload: encryptedPayload,
        workspace_id: this.config.workspace_id,
        user_id: this.config.user_id,
        public_key: this.config.public_key,
      },
      {
        headers: {
          'x-access-token': this.config.token,
        },
      }
    );

    if (!response.data.status) {
      throw new Error(response.data.message || 'SDK operation failed');
    }

    return response.data.data?.data as T;
  }

  // ==================== PRODUCT MODULE ====================
  product = {
    create: <T = any>(data: any) => this.execute<T>('product', 'create', data),
    fetch: <T = any>(tag: string) => this.execute<T>('product', 'fetch', tag),
    update: <T = any>(tag: string, data: any) => this.execute<T>('product', 'update', tag, data),
    init: (product: string) => this.execute('product', 'init', product),
    updateValidation: <T = any>(product: string, tag: string, update: any) =>
      this.execute<T>('product', 'updateValidation', product, tag, update),

    environments: {
      create: <T = any>(product: string, data: any) =>
        this.execute<T>('product', 'environments.create', product, data),
      list: <T = any>(product: string) => this.execute<T>('product', 'environments.list', product),
      fetch: <T = any>(product: string, slug: string) =>
        this.execute<T>('product', 'environments.fetch', product, slug),
      update: <T = any>(product: string, slug: string, data: any) =>
        this.execute<T>('product', 'environments.update', product, slug, data),
    },

    apps: {
      connect: <T = any>(product: string, appTag: string) =>
        this.execute<T>('product', 'apps.connect', product, appTag),
      add: <T = any>(product: string, app: any) =>
        this.execute<T>('product', 'apps.add', product, app),
      list: <T = any>(product: string) => this.execute<T>('product', 'apps.list', product),
      fetch: <T = any>(product: string, tag: string) =>
        this.execute<T>('product', 'apps.fetch', product, tag),
      update: <T = any>(product: string, accessTag: string, data: any) =>
        this.execute<T>('product', 'apps.update', product, accessTag, data),

      webhooks: {
        list: <T = any>(product: string, accessTag: string) =>
          this.execute<T>('product', 'apps.webhooks.list', product, accessTag),
        enable: <T = any>(data: any) => this.execute<T>('product', 'apps.webhooks.enable', data),
        generateLink: <T = any>(data: any) =>
          this.execute<T>('product', 'apps.webhooks.generateLink', data),
      },

      health: {
        create: <T = any>(product: string, data: any) =>
          this.execute<T>('product', 'apps.health.create', product, data),
        update: <T = any>(product: string, tag: string, data: any) =>
          this.execute<T>('product', 'apps.health.update', product, tag, data),
        fetch: <T = any>(product: string, accessTag: string, tag: string) =>
          this.execute<T>('product', 'apps.health.fetch', product, accessTag, tag),
        list: <T = any>(product: string, accessTag: string) =>
          this.execute<T>('product', 'apps.health.list', product, accessTag),
      },
    },
  };

  // ==================== APP MODULE ====================
  app = {
    create: <T = any>(data: any) => this.execute<T>('app', 'create', data),
    fetch: <T = any>(tag: string) => this.execute<T>('app', 'fetch', tag),
    update: <T = any>(tag: string, data: any) => this.execute<T>('app', 'update', tag, data),
    init: (appTag: string) => this.execute('app', 'init', appTag),

    environments: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('app', 'environments.create', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('app', 'environments.list', appTag),
      fetch: <T = any>(appTag: string, slug: string) =>
        this.execute<T>('app', 'environments.fetch', appTag, slug),
      update: <T = any>(appTag: string, slug: string, data: any) =>
        this.execute<T>('app', 'environments.update', appTag, slug, data),
    },

    variables: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('app', 'variables.create', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('app', 'variables.list', appTag),
      fetch: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('app', 'variables.fetch', appTag, tag),
      update: <T = any>(appTag: string, tag: string, data: any) =>
        this.execute<T>('app', 'variables.update', appTag, tag, data),
    },

    constants: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('app', 'constants.create', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('app', 'constants.list', appTag),
      fetch: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('app', 'constants.fetch', appTag, tag),
      update: <T = any>(appTag: string, tag: string, data: any) =>
        this.execute<T>('app', 'constants.update', appTag, tag, data),
    },

    actions: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('app', 'actions.create', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('app', 'actions.list', appTag),
      fetch: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('app', 'actions.fetch', appTag, tag),
      update: <T = any>(appTag: string, tag: string, data: any) =>
        this.execute<T>('app', 'actions.update', appTag, tag, data),
      delete: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('app', 'actions.delete', appTag, tag),
    },

    auths: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('app', 'auths.create', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('app', 'auths.list', appTag),
      fetch: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('app', 'auths.fetch', appTag, tag),
      update: <T = any>(appTag: string, tag: string, data: any) =>
        this.execute<T>('app', 'auths.update', appTag, tag, data),
    },

    webhooks: {
      create: <T = any>(appTag: string, data: any) =>
        this.execute<T>('webhooks', 'create', appTag, data),
      /**
       * Creates a webhook with events in a single orchestrated call
       * The proxy will create the webhook first, then create all events
       * @param appTag - The app tag
       * @param data - Webhook data including an `events` array
       */
      createWithEvents: <T = any>(appTag: string, data: any) =>
        this.execute<T>('webhooks', 'createWithEvents', appTag, data),
      list: <T = any>(appTag: string) => this.execute<T>('webhooks', 'list', appTag),
      fetch: <T = any>(appTag: string, tag: string) =>
        this.execute<T>('webhooks', 'fetch', appTag, tag),
      update: <T = any>(appTag: string, tag: string, data: any) =>
        this.execute<T>('webhooks', 'update', appTag, tag, data),

      events: {
        create: <T = any>(appTag: string, data: any) =>
          this.execute<T>('webhooks', 'events.create', appTag, data),
        list: <T = any>(appTag: string, webhookTag: string) =>
          this.execute<T>('webhooks', 'events.list', appTag, webhookTag),
        fetch: <T = any>(appTag: string, eventTag: string) =>
          this.execute<T>('webhooks', 'events.fetch', appTag, eventTag),
        update: <T = any>(appTag: string, eventTag: string, data: any) =>
          this.execute<T>('webhooks', 'events.update', appTag, eventTag, data),
      },
    },
  };

  // ==================== SESSIONS MODULE ====================
  sessions = {
    create: <T = any>(product: string, payload: any) =>
      this.execute<T>('sessions', 'create', product, payload),
    update: <T = any>(product: string, tag: string, payload: any) =>
      this.execute<T>('sessions', 'update', product, tag, payload),
    list: <T = any>(product: string) => this.execute<T>('sessions', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('sessions', 'fetch', product, tag),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('sessions', 'delete', product, tag),
    users: <T = any>(product: string, data: any) =>
      this.execute<T>('sessions', 'users', product, data),

    // Session lifecycle
    start: <T = any>(data: any) => this.execute<T>('sessions', 'start', data),
    verify: <T = any>(data: any) => this.execute<T>('sessions', 'verify', data),
    refresh: <T = any>(data: any) => this.execute<T>('sessions', 'refresh', data),
    revoke: <T = any>(data: any) => this.execute<T>('sessions', 'revoke', data),
    listActive: <T = any>(data: any) => this.execute<T>('sessions', 'listActive', data),
    revokeAll: <T = any>(data: any) => this.execute<T>('sessions', 'revokeAll', data),
    updateData: <T = any>(data: any) => this.execute<T>('sessions', 'updateData', data),
    extendSession: <T = any>(data: any) => this.execute<T>('sessions', 'extendSession', data),
  };

  // ==================== STORAGE MODULE ====================
  storage = {
    create: <T = any>(data: any) =>
      this.execute<T>('storage', 'create', data),
    list: <T = any>(product: string) => this.execute<T>('storage', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('storage', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('storage', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('storage', 'delete', product, tag),

    // File operations
    upload: <T = any>(data: any) => this.execute<T>('storage', 'upload', data),
    download: <T = any>(data: any) => this.execute<T>('storage', 'download', data),
    remove: <T = any>(data: any) => this.execute<T>('storage', 'remove', data),
    listFiles: <T = any>(data: any) => this.execute<T>('storage', 'listFiles', data),
    getSignedUrl: <T = any>(data: any) => this.execute<T>('storage', 'getSignedUrl', data),
    dispatch: <T = any>(data: any) => this.execute<T>('storage', 'dispatch', data),
    stats: <T = any>(data: any) => this.execute<T>('storage', 'stats', data),
  };

  // ==================== NOTIFICATIONS MODULE ====================
  notifications = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('notifications', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('notifications', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('notifications', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('notifications', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('notifications', 'delete', product, tag),

    templates: {
      create: <T = any>(data: any) =>
        this.execute<T>('notifications', 'templates.create', data),
      list: <T = any>(data: any) => this.execute<T>('notifications', 'templates.list', data),
      fetch: <T = any>(data: any) => this.execute<T>('notifications', 'templates.fetch', data),
      update: <T = any>(data: any) =>
        this.execute<T>('notifications', 'templates.update', data),
      delete: <T = any>(data: any) =>
        this.execute<T>('notifications', 'templates.delete', data),
    },

    dispatch: <T = any>(data: any) => this.execute<T>('notifications', 'dispatch', data),
    send: <T = any>(data: any) => this.execute<T>('notifications', 'send', data),
  };

  // ==================== MESSAGE BROKERS MODULE ====================
  messageBrokers = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('messageBrokers', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('messageBrokers', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('messageBrokers', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('messageBrokers', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('messageBrokers', 'delete', product, tag),

    topics: {
      create: <T = any>(data: any) => this.execute<T>('messageBrokers', 'topics.create', data),
      list: <T = any>(data: any) => this.execute<T>('messageBrokers', 'topics.list', data),
      fetch: <T = any>(data: any) => this.execute<T>('messageBrokers', 'topics.fetch', data),
      update: <T = any>(data: any) => this.execute<T>('messageBrokers', 'topics.update', data),
      delete: <T = any>(data: any) => this.execute<T>('messageBrokers', 'topics.delete', data),
    },

    publish: <T = any>(data: any) => this.execute<T>('messageBrokers', 'publish', data),
    subscribe: <T = any>(data: any) => this.execute<T>('messageBrokers', 'subscribe', data),
    dispatch: <T = any>(data: any) => this.execute<T>('messageBrokers', 'dispatch', data),
  };

  // ==================== CACHES MODULE ====================
  caches = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('caches', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('caches', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('caches', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('caches', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('caches', 'delete', product, tag),

    // Cache operations
    get: <T = any>(data: any) => this.execute<T>('caches', 'get', data),
    set: <T = any>(data: any) => this.execute<T>('caches', 'set', data),
    del: <T = any>(data: any) => this.execute<T>('caches', 'del', data),
    has: (data: any) => this.execute<boolean>('caches', 'has', data),
    clear: <T = any>(data: any) => this.execute<T>('caches', 'clear', data),
    ttl: (data: any) => this.execute<number>('caches', 'ttl', data),
    expire: <T = any>(data: any) => this.execute<T>('caches', 'expire', data),
    keys: <T = any>(data: any) => this.execute<T>('caches', 'keys', data),

    fetchRemote: <T = any>(data: any) => this.execute<T>('caches', 'fetchRemote', data),
    dispatch: <T = any>(data: any) => this.execute<T>('caches', 'dispatch', data),
  };

  // ==================== JOBS MODULE ====================
  jobs = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('jobs', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('jobs', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('jobs', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('jobs', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('jobs', 'delete', product, tag),

    // Job lifecycle
    get: <T = any>(jobId: string) => this.execute<T>('jobs', 'get', jobId),
    listJobs: <T = any>(options?: any) => this.execute<T>('jobs', 'listJobs', options),
    cancel: <T = any>(jobId: string, options?: any) =>
      this.execute<T>('jobs', 'cancel', jobId, options),
    cancelMany: <T = any>(filter: any) => this.execute<T>('jobs', 'cancelMany', filter),
    pause: <T = any>(jobId: string) => this.execute<T>('jobs', 'pause', jobId),
    pauseMany: <T = any>(filter: any) => this.execute<T>('jobs', 'pauseMany', filter),
    resume: <T = any>(jobId: string) => this.execute<T>('jobs', 'resume', jobId),
    resumeMany: <T = any>(filter: any) => this.execute<T>('jobs', 'resumeMany', filter),
    retry: <T = any>(jobId: string, options?: any) =>
      this.execute<T>('jobs', 'retry', jobId, options),
    retryMany: <T = any>(filter: any) => this.execute<T>('jobs', 'retryMany', filter),
    reschedule: <T = any>(jobId: string, options: any) =>
      this.execute<T>('jobs', 'reschedule', jobId, options),
    getHistory: <T = any>(jobId: string, options?: any) =>
      this.execute<T>('jobs', 'getHistory', jobId, options),
    getStats: <T = any>(options?: any) => this.execute<T>('jobs', 'getStats', options),
    setWebhook: <T = any>(config: any) => this.execute<T>('jobs', 'setWebhook', config),
  };

  // ==================== FEATURES MODULE ====================
  features = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('features', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('features', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('features', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('features', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('features', 'delete', product, tag),

    isEnabled: (data: any) => this.execute<boolean>('features', 'isEnabled', data),
    dispatch: <T = any>(data: any) => this.execute<T>('features', 'dispatch', data),
    run: <T = any>(data: any) => this.execute<T>('features', 'run', data),
  };

  // ==================== ACTIONS MODULE ====================
  actions = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('actions', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('actions', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('actions', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('actions', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('actions', 'delete', product, tag),

    dispatch: <T = any>(data: any) => this.execute<T>('actions', 'dispatch', data),
    run: <T = any>(data: any) => this.execute<T>('actions', 'run', data),
    import: <T = any>(data: any) => this.execute<T>('actions', 'import', data),
  };

  // ==================== DATABASES MODULE ====================
  databases = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('databases', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('databases', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('databases', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('databases', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('databases', 'delete', product, tag),

    // Connection management
    connect: <T = any>(data: any) => this.execute<T>('databases', 'connect', data),
    disconnect: <T = any>(data: any) => this.execute<T>('databases', 'disconnect', data),
    closeAll: <T = any>() => this.execute<T>('databases', 'closeAll'),
    testConnection: (data: any) => this.execute<boolean>('databases', 'testConnection', data),

    // Database query operations
    query: <T = any>(data: any) => this.execute<T>('databases', 'query', data),
    execute: <T = any>(data: any) => this.execute<T>('databases', 'execute', data),
    insert: <T = any>(data: any) => this.execute<T>('databases', 'insert', data),
    updateData: <T = any>(data: any) => this.execute<T>('databases', 'update', data),
    deleteData: <T = any>(data: any) => this.execute<T>('databases', 'delete', data),
    count: (data: any) => this.execute<number>('databases', 'count', data),

    // Table/Collection operations
    listTables: <T = any>(data: any) => this.execute<T>('databases', 'listTables', data),
    listTablesWithInfo: <T = any>(data: any) => this.execute<T>('databases', 'listTablesWithInfo', data),
    createTable: <T = any>(data: any) => this.execute<T>('databases', 'createTable', data),
    dropTable: <T = any>(data: any) => this.execute<T>('databases', 'dropTable', data),
    alterTable: <T = any>(data: any) => this.execute<T>('databases', 'alterTable', data),
    truncateTable: <T = any>(data: any) => this.execute<T>('databases', 'truncateTable', data),

    // Schema operations
    describe: <T = any>(data: any) => this.execute<T>('databases', 'describe', data),
    getSchema: <T = any>(data: any) => this.execute<T>('databases', 'getSchema', data),

    // Index operations
    createIndex: <T = any>(data: any) => this.execute<T>('databases', 'createIndex', data),
    dropIndex: <T = any>(data: any) => this.execute<T>('databases', 'dropIndex', data),
    listIndexes: <T = any>(data: any) => this.execute<T>('databases', 'listIndexes', data),
  };

  // ==================== WEBHOOKS MODULE ====================
  webhooks = {
    list: <T = any>(product: string, accessTag: string) =>
      this.execute<T>('webhooks', 'list', product, accessTag),
    enable: <T = any>(data: any) => this.execute<T>('webhooks', 'enable', data),
    generateLink: <T = any>(data: any) => this.execute<T>('webhooks', 'generateLink', data),
    trigger: <T = any>(data: any) => this.execute<T>('webhooks', 'trigger', data),
  };

  // ==================== QUOTAS MODULE ====================
  quotas = {
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('quotas', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('quotas', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('quotas', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('quotas', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('quotas', 'delete', product, tag),

    // Runtime quota operations
    check: (data: any) => this.execute<boolean>('quotas', 'check', data),
    consume: <T = any>(data: any) => this.execute<T>('quotas', 'consume', data),
    reset: <T = any>(data: any) => this.execute<T>('quotas', 'reset', data),
    getUsage: <T = any>(data: any) => this.execute<T>('quotas', 'getUsage', data),
  };

  // ==================== VECTOR MODULE ====================
  vector = {
    // CRUD operations
    create: <T = any>(options: any) => this.execute<T>('vector', 'create', options),
    list: <T = any>(options: { product: string }) => this.execute<T>('vector', 'list', options),
    fetch: <T = any>(options: { product: string; tag: string }) =>
      this.execute<T>('vector', 'fetch', options),
    update: <T = any>(options: any) => this.execute<T>('vector', 'update', options),
    delete: <T = any>(options: { product: string; tag: string }) =>
      this.execute<T>('vector', 'delete', options),

    // Connection management
    connect: <T = any>(options: { product: string; env: string; tag: string }) =>
      this.execute<T>('vector', 'connect', options),
    disconnect: <T = any>(options: { product: string; env: string; tag: string }) =>
      this.execute<T>('vector', 'disconnect', options),
    disconnectAll: <T = any>() => this.execute<T>('vector', 'disconnectAll'),
    testConnection: (options: { product: string; env: string; tag: string }) =>
      this.execute<boolean>('vector', 'testConnection', options),

    // Vector operations - interface matches SDK exactly (uses 'vector' parameter)
    query: <T = any>(options: any) => this.execute<T>('vector', 'query', options),
    upsert: <T = any>(options: any) => this.execute<T>('vector', 'upsert', options),
    upsertOne: <T = any>(options: any) => this.execute<T>('vector', 'upsertOne', options),
    fetchVectors: <T = any>(options: any) => this.execute<T>('vector', 'fetchVectors', options),
    fetchOne: <T = any>(options: any) => this.execute<T>('vector', 'fetchOne', options),
    deleteVectors: <T = any>(options: any) => this.execute<T>('vector', 'deleteVectors', options),
    deleteByIds: <T = any>(options: any) => this.execute<T>('vector', 'deleteByIds', options),
    deleteAll: <T = any>(options: any) => this.execute<T>('vector', 'deleteAll', options),
    findSimilar: <T = any>(options: any) => this.execute<T>('vector', 'findSimilar', options),
    updateVector: <T = any>(options: any) => this.execute<T>('vector', 'updateVector', options),
    updateMetadata: <T = any>(options: any) => this.execute<T>('vector', 'updateMetadata', options),

    // List operations
    listVectors: <T = any>(options: any) => this.execute<T>('vector', 'listVectors', options),
    listAllVectors: <T = any>(options: any) => this.execute<T>('vector', 'listAllVectors', options),

    // Namespace operations
    listNamespaces: <T = any>(options: { product: string; env: string; vector: string }) =>
      this.execute<T>('vector', 'listNamespaces', options),
    deleteNamespace: <T = any>(options: any) => this.execute<T>('vector', 'deleteNamespace', options),

    // Index operations
    describeIndex: <T = any>(options: { product: string; env: string; vector: string }) =>
      this.execute<T>('vector', 'describeIndex', options),
    getStats: <T = any>(options: { product: string; env: string; vector: string }) =>
      this.execute<T>('vector', 'getStats', options),
    createIndex: <T = any>(options: any) => this.execute<T>('vector', 'createIndex', options),
    deleteIndex: <T = any>(options: any) => this.execute<T>('vector', 'deleteIndex', options),
    listIndexes: <T = any>(options: { product: string; env: string; vector: string }) =>
      this.execute<T>('vector', 'listIndexes', options),

    // Utility methods
    count: (options: { product: string; env: string; vector: string; namespace?: string }) =>
      this.execute<number>('vector', 'count', options),
    exists: (options: { product: string; env: string; vector: string; id: string; namespace?: string }) =>
      this.execute<boolean>('vector', 'exists', options),
    supportsFeature: (options: { product: string; env: string; vector: string; feature: string }) =>
      this.execute<boolean>('vector', 'supportsFeature', options),

    // Service access
    getService: <T = any>() => this.execute<T>('vector', 'getService'),
  };

  // ==================== LOGS MODULE ====================
  logs = {
    query: <T = any>(options: any) => this.execute<T>('logs', 'query', options),
    fetch: <T = any>(logId: string) => this.execute<T>('logs', 'fetch', logId),
    list: <T = any>(options?: any) => this.execute<T>('logs', 'list', options),
    stream: <T = any>(options: any) => this.execute<T>('logs', 'stream', options),
  };

  // ==================== RESILIENCE MODULE ====================
  resilience = {
    quotas: {
      create: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.create', data),
      list: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.list', data),
      fetch: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.fetch', data),
      update: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.update', data),
      delete: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.delete', data),
      check: (data: any) => this.execute<boolean>('resilience', 'quotas.check', data),
      consume: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.consume', data),
      reset: <T = any>(data: any) => this.execute<T>('resilience', 'quotas.reset', data),
    },

    fallbacks: {
      create: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.create', data),
      list: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.list', data),
      fetch: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.fetch', data),
      update: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.update', data),
      delete: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.delete', data),
      execute: <T = any>(data: any) => this.execute<T>('resilience', 'fallbacks.execute', data),
    },
  };

  // ==================== SECRETS MODULE ====================
  secrets = {
    create: <T = any>(data: any) => this.execute<T>('secrets', 'create', data),
    list: <T = any>() => this.execute<T>('secrets', 'list'),
    fetch: <T = any>(key: string) => this.execute<T>('secrets', 'fetch', key),
    update: <T = any>(key: string, data: any) => this.execute<T>('secrets', 'update', key, data),
    delete: <T = any>(key: string) => this.execute<T>('secrets', 'delete', key),
    exists: (key: string) => this.execute<boolean>('secrets', 'exists', key),
    revoke: <T = any>(key: string) => this.execute<T>('secrets', 'revoke', key),
    resolve: <T = any>(value: any, options?: any) => this.execute<T>('secrets', 'resolve', value, options),
    validate: <T = any>(value: any) => this.execute<T>('secrets', 'validate', value),
  };

  // ==================== HEALTH MODULE ====================
  health = {
    define: <T = any>(product: string, data: any) =>
      this.execute<T>('health', 'define', product, data),
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('health', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('health', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('health', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('health', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('health', 'delete', product, tag),
    status: <T = any>(data: any) => this.execute<T>('health', 'status', data),
    check: <T = any>(data: any) => this.execute<T>('health', 'check', data),
    run: <T = any>(data: any) => this.execute<T>('health', 'run', data),
  };

  // ==================== FALLBACK MODULE ====================
  fallback = {
    define: <T = any>(product: string, data: any) =>
      this.execute<T>('fallback', 'define', product, data),
    create: <T = any>(product: string, data: any) =>
      this.execute<T>('fallback', 'create', product, data),
    list: <T = any>(product: string) => this.execute<T>('fallback', 'list', product),
    fetch: <T = any>(product: string, tag: string) =>
      this.execute<T>('fallback', 'fetch', product, tag),
    update: <T = any>(product: string, tag: string, data: any) =>
      this.execute<T>('fallback', 'update', product, tag, data),
    delete: <T = any>(product: string, tag: string) =>
      this.execute<T>('fallback', 'delete', product, tag),
    run: <T = any>(data: any) => this.execute<T>('fallback', 'run', data),
    dispatch: <T = any>(data: any) => this.execute<T>('fallback', 'dispatch', data),
  };
}

/**
 * Create a new SDKProxyService instance
 */
export function createSDKProxy(config: SDKProxyConfig): SDKProxyService {
  return new SDKProxyService(config);
}

/**
 * Hook-friendly factory for React components
 */
export function useSDKProxy(config: SDKProxyConfig | null): SDKProxyService | null {
  if (!config || !config.workspace_id || !config.user_id || !config.token || !config.public_key) {
    return null;
  }
  return new SDKProxyService(config);
}

export default SDKProxyService;

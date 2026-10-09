/**
 * Workspace-data tool catalog for the chatbot.
 *
 * Reads (list_products, list_apps, list_environments, get_logs, ductape_query)
 * execute immediately. Anything that changes the workspace goes through
 * ductape_mutate, whose calls are never auto-executed here — the caller
 * (useAgentChat) must hold each ductape_mutate call for explicit user
 * approval before invoking WorkspaceDataTools.execute for it. The "secrets"
 * and "cloud" modules are blocked entirely, in both tiers, and a short list
 * of unsupported/destructive database operations (execute, dropTable, truncateTable,
 * dropIndex) is intentionally left off the write allowlist — those stay
 * something the user does deliberately in the workbench UI.
 */

import productServicesReal from '@/services/productServicesReal';
import appServicesReal from '@/services/appServicesReal';
import { fetchLogs } from '@/services/logsServices';
import { SDKProxyService, type SDKModule } from '@/services/sdkProxy';
import type { IProduct } from '@/types/product';
import type { User } from '@/types/auth';
import type { AgentToolDefinition } from './types';
import { describeMethodContract, assertMutationContract, hasVerifiedMutationContract } from './methodContracts';

export interface ToolContext {
  user: User;
  workspaceId: string;
}

export const MUTATE_TOOL_NAME = 'ductape_mutate';

const READ_METHODS: Record<string, Set<string>> = {
  product: new Set([
    'fetch', 'environments.list', 'environments.fetch',
    'apps.list', 'apps.fetch', 'apps.webhooks.list', 'apps.health.list', 'apps.health.fetch',
  ]),
  app: new Set([
    'fetch', 'environments.list', 'environments.fetch',
    'variables.list', 'variables.fetch', 'constants.list', 'constants.fetch',
    'auths.list', 'auths.fetch',
  ]),
  actions: new Set(['list', 'fetch']),
  databases: new Set([
    'action.list', 'action.fetch',
    'list', 'fetch', 'listTables', 'listTablesWithInfo', 'describe', 'getSchema', 'listIndexes', 'count', 'query',
  ]),
  webhooks: new Set(['list', 'fetch', 'events.list', 'events.fetch']),
  graph: new Set(['list', 'fetch', 'action.fetchAll', 'action.fetch']),
  notifications: new Set([
    'list', 'fetch', 'templates.list', 'templates.fetch', 'messages.list', 'messages.fetch', 'getMessages',
  ]),
  messageBrokers: new Set([
    'list', 'fetch', 'topics.list', 'topics.fetch',
    'messages.query', 'messages.getProducers', 'messages.getConsumers', 'messages.getDeadLetters',
    'messages.getStats', 'messages.getDashboard',
  ]),
  storage: new Set(['list', 'fetch', 'listFiles', 'stats']),
  vector: new Set([
    'list', 'fetch', 'listVectors', 'listAllVectors', 'listNamespaces', 'describeIndex', 'getStats',
    'listIndexes', 'count', 'exists', 'supportsFeature', 'fetchVectors', 'fetchOne', 'query',
    'actions.fetch', 'actions.fetchAll',
  ]),
  caches: new Set(['list', 'fetch', 'get', 'has', 'ttl', 'keys', 'fetchValues']),
  sessions: new Set([
    'list', 'fetch', 'listActive', 'fetchUsers', 'fetchUserDetails', 'fetchDashboard', 'fetchUserDashboard',
  ]),
  quotas: new Set(['list', 'fetch', 'getUsage']),
  jobs: new Set(['list', 'fetch', 'get', 'listJobs', 'getHistory', 'getStats']),
  logs: new Set(['query', 'fetch', 'list']),
  resilience: new Set(['quotas.list', 'quotas.fetch', 'fallbacks.list', 'fallbacks.fetch']),
  health: new Set(['list', 'fetch', 'status']),
  fallback: new Set(['list', 'fetch']),
  feature: new Set(['fetch', 'fetchAll', 'status', 'history']),
};

/**
 * databases.execute is a saved-action operation, not arbitrary SQL, but is
 * not exposed by the current SDK proxy allowlist. Also excludes dropTable,
 * truncateTable, and dropIndex on databases — those stay UI-only regardless
 * of confirmation, since a chat click is a much lighter gate than the
 * workbench's own destructive-action UI.
 */
const WRITE_METHODS: Record<string, Set<string>> = {
  graph: new Set(['action.execute']),
  product: new Set([
    'create', 'update', 'updateValidation', 'environments.create', 'environments.update',
    'apps.connect', 'apps.add', 'apps.update', 'apps.webhooks.enable', 'apps.webhooks.generateLink',
    'apps.health.create', 'apps.health.update',
  ]),
  app: new Set([
    'create', 'update', 'environments.create', 'environments.update',
    'variables.create', 'variables.update', 'constants.create', 'constants.update',
    'auths.create', 'auths.update',
  ]),
  actions: new Set(['create', 'update', 'delete', 'dispatch', 'run', 'import']),
  databases: new Set([
    'create', 'update', 'delete', 'connect', 'disconnect', 'closeAll',
    'action.dispatch',
    'insert', 'updateData', 'deleteData', 'createTable', 'alterTable', 'createIndex',
  ]),
  webhooks: new Set([
    'create', 'createWithEvents', 'importBulk', 'update', 'delete', 'enable', 'generateLink', 'trigger',
    'events.create', 'events.update', 'events.delete',
  ]),
  notifications: new Set([
    'create', 'update', 'delete', 'templates.create', 'templates.update', 'templates.delete',
    'messages.create', 'messages.update', 'dispatch', 'send',
  ]),
  messageBrokers: new Set([
    'create', 'update', 'delete', 'topics.create', 'topics.update', 'topics.delete',
    'publish', 'subscribe', 'dispatch',
  ]),
  storage: new Set(['create', 'update', 'delete', 'upload', 'remove', 'dispatch']),
  vector: new Set([
    'create', 'update', 'delete', 'connect', 'disconnect', 'disconnectAll',
    'upsert', 'upsertOne', 'deleteVectors', 'deleteByIds', 'deleteAll', 'updateVector', 'updateMetadata',
    'deleteNamespace', 'createIndex', 'deleteIndex',
    'actions.create', 'actions.update', 'actions.delete', 'actions.execute',
  ]),
  caches: new Set(['create', 'update', 'delete', 'set', 'del', 'clear', 'expire', 'dispatch']),
  sessions: new Set([
    'create', 'update', 'delete', 'start', 'verify', 'refresh', 'revoke', 'revokeAll',
    'updateData', 'extendSession',
  ]),
  quotas: new Set(['create', 'update', 'delete', 'consume', 'reset']),
  jobs: new Set([
    'create', 'update', 'delete', 'cancel', 'cancelMany', 'pause', 'pauseMany',
    'resume', 'resumeMany', 'retry', 'retryMany', 'reschedule', 'setWebhook',
  ]),
  resilience: new Set([
    'quotas.create', 'quotas.update', 'quotas.delete', 'quotas.consume', 'quotas.reset',
    'fallbacks.create', 'fallbacks.update', 'fallbacks.delete', 'fallbacks.execute',
  ]),
  health: new Set(['define', 'create', 'update', 'delete', 'run']),
  fallback: new Set(['define', 'create', 'update', 'delete', 'run', 'dispatch']),
  feature: new Set(['create', 'update', 'delete', 'execute', 'dispatch', 'cancel']),
};

const WORKSPACE_SCOPED_MODULES = new Set<string>(['product', 'app']);
const BLOCKED_MODULES = new Set<string>(['secrets', 'cloud']);

function blockedModuleMessage(module: string): string {
  if (module === 'secrets') {
    return 'The secrets module is not accessible from chat — open Secrets in the workbench to view or manage them.';
  }
  return 'Cloud infrastructure operations are not accessible from chat — use the Cloud tab in the workbench.';
}

function isReadMethodAllowed(module: string, method: string): boolean {
  return READ_METHODS[module]?.has(method) ?? false;
}

function isWriteMethodAllowed(module: string, method: string): boolean {
  return WRITE_METHODS[module]?.has(method) ?? false;
}

export function describeAllowedReadMethods(): string {
  return Object.entries(READ_METHODS)
    .map(([module, methods]) => `- ${module}: ${Array.from(methods).join(', ')}`)
    .join('\n');
}

export function describeAllowedWriteMethods(): string {
  return Object.entries(WRITE_METHODS)
    .map(([module, methods]) => [module, new Set([...methods].filter(method => hasVerifiedMutationContract(module, method)))] as const)
    .filter(([, methods]) => methods.size > 0)
    .map(([module, methods]) => `- ${module}: ${Array.from(methods).join(', ')}`)
    .join('\n');
}

/** True for any tool call whose execution must wait on explicit user approval. */
export function requiresConfirmation(toolName: string): boolean {
  return toolName === MUTATE_TOOL_NAME;
}

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'list_products',
    description:
      'List every product in the current workspace with its environments and a summary of connected apps/databases/storage/etc. Call this first to discover valid product tags.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_environments',
    description: 'List the environments (e.g. dev, staging, prd) configured on a specific product.',
    input_schema: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Product tag, from list_products.' },
      },
      required: ['product'],
    },
  },
  {
    name: 'list_apps',
    description:
      'List every app registered in the workspace (third-party integrations and custom apps), independent of which products they are connected to.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_logs',
    description:
      'Fetch recent workspace activity logs and error metrics, optionally filtered by product, environment, status, or free text.',
    input_schema: {
      type: 'object',
      properties: {
        product_tag: { type: 'string', description: 'Filter to one product tag.' },
        env: { type: 'string', description: 'Filter to one environment slug.' },
        status: { type: 'string', description: 'e.g. "success" or "error".' },
        component: { type: 'string', description: 'e.g. "feature", "action", "database".' },
        search: { type: 'string', description: 'Free-text search within log messages.' },
        limit: { type: 'number', description: 'Max entries to return, default 20.' },
      },
    },
  },
  {
    name: 'describe_method',
    description:
      'Look up the exact call shape for one module.method before calling ductape_query/ductape_mutate with it — ' +
      'whether it takes separate positional arguments or one options object, in what order, and which fields that ' +
      'object needs. Call this first for any module.method you have not already confirmed the shape of earlier in ' +
      'this conversation; do not guess a shape and hope the call succeeds. Covers exactly the same module.method ' +
      'combinations ductape_query/ductape_mutate accept (see their own descriptions for the full allowed list) — ' +
      'asking about one not on that list just tells you so.',
    input_schema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'SDK module name, e.g. "databases", "vector", "sessions".' },
        method: { type: 'string', description: 'Method name, e.g. "query", "upsert". Dotted names like "actions.create" are valid.' },
      },
      required: ['module', 'method'],
    },
  },
  {
    name: 'ductape_query',
    description:
      'Read a Ductape SDK module directly (databases, storage, vector, sessions, caches, jobs, notifications, ' +
      'messageBrokers, quotas, actions, feature, health, fallback, resilience, webhooks, product, app). ' +
      'Read-only: write/mutating methods are rejected, use ductape_mutate for those instead. Most methods take ' +
      '(product, ...) or a single options object as their first argument — call list_products/list_environments ' +
      'first to get valid tags, and ask the user rather than guessing if the product/env is ambiguous.\n\n' +
      'Allowed module.method calls:\n' + describeAllowedReadMethods(),
    input_schema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'SDK module name, e.g. "databases", "storage", "sessions".' },
        method: { type: 'string', description: 'Method name, e.g. "list", "query". Dotted names like "topics.list" are valid.' },
        params: {
          type: 'array',
          description: 'Positional arguments in the same order as the SDK method signature.',
          items: {},
        },
        product: {
          type: 'string',
          description: 'Product tag that owns this resource. Required for every module except "product" and "app".',
        },
      },
      required: ['module', 'method'],
    },
  },
  {
    name: MUTATE_TOOL_NAME,
    description:
      'Create, update, or delete data through a Ductape SDK module (same module set as ductape_query, minus ' +
      'secrets/cloud, plus unsupported database "execute" and dropTable/truncateTable/dropIndex which are never available ' +
      'from chat). Every call to this tool is shown to the user for explicit approval before it runs — nothing ' +
      'executes silently. State exactly what you are about to do and why in your reply before calling this, so ' +
      'the confirmation the user sees makes sense. If they decline, do not retry the same call without them ' +
      'asking again.\n\nAllowed module.method calls:\n' + describeAllowedWriteMethods(),
    input_schema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'SDK module name, e.g. "databases", "actions", "feature".' },
        method: { type: 'string', description: 'Method name, e.g. "create", "update", "delete". Dotted names like "topics.create" are valid.' },
        params: {
          type: 'array',
          description: 'Positional arguments in the same order as the SDK method signature.',
          items: {},
        },
        product: {
          type: 'string',
          description: 'Product tag that owns this resource. Required for every module except "product" and "app".',
        },
      },
      required: ['module', 'method'],
    },
  },
];

export class WorkspaceDataTools {
  private context: ToolContext;
  private productsCache: IProduct[] | null = null;

  constructor(context: ToolContext) {
    this.context = context;
  }

  private async getProducts(forceRefresh = false): Promise<IProduct[]> {
    if (this.productsCache && !forceRefresh) return this.productsCache;
    const response = await productServicesReal.fetchProducts({
      workspace_id: this.context.workspaceId,
      user_id: this.context.user._id,
      public_key: this.context.user.public_key,
      status: 'all',
    });
    this.productsCache = response?.data ?? [];
    return this.productsCache;
  }

  private async findProduct(productTag: string): Promise<IProduct> {
    let products = await this.getProducts();
    let product = products.find((p) => p.tag === productTag);
    if (!product) {
      products = await this.getProducts(true);
      product = products.find((p) => p.tag === productTag);
    }
    if (!product) {
      throw new Error(`No product with tag "${productTag}" was found in this workspace. Call list_products to see available tags.`);
    }
    return product;
  }

  private async listProducts(): Promise<unknown> {
    const products = await this.getProducts();
    return products.map((p) => ({
      tag: p.tag,
      name: p.name,
      description: p.description,
      status: p.status,
      active: p.active,
      environments: p.envs?.map((e) => ({ slug: e.slug, name: e.env_name, active: e.active })),
      apps_connected: p.apps?.length ?? 0,
      databases: p.databases?.length ?? 0,
      storage: p.storage?.length ?? 0,
      caches: p.caches?.length ?? 0,
      message_brokers: p.messageBrokers?.length ?? 0,
      sessions: p.sessions?.length ?? 0,
    }));
  }

  private async listEnvironments(productTag: string): Promise<unknown> {
    const product = await this.findProduct(productTag);
    return product.envs;
  }

  private async listApps(): Promise<unknown> {
    const response = await appServicesReal.fetchWorkspaceApps({
      workspace_id: this.context.workspaceId,
      user_id: this.context.user._id,
      public_key: this.context.user.public_key,
    });
    return (response?.data ?? []).map((a) => ({
      tag: a.tag,
      name: a.app_name,
      description: a.description,
      access_tag: a.access_tag,
    }));
  }

  private async getLogs(filters: Record<string, any>): Promise<unknown> {
    const limit = filters.limit ?? 20;
    const response = await fetchLogs(
      {
        workspace_id: this.context.workspaceId,
        user_id: this.context.user._id,
        public_key: this.context.user.public_key,
      },
      {
        product_tag: filters.product_tag,
        env: filters.env,
        status: filters.status,
        component: filters.component,
        search: filters.search,
        limit,
        page: 1,
      },
    );
    return {
      metrics: response.data?.metrics,
      total: response.metadata?.total,
      entries: (response.data?.logs?.data ?? []).slice(0, limit).map((log) => ({
        timestamp: log.timestamp,
        product_tag: log.product_tag,
        env: log.env,
        component: log.component ?? log.type,
        name: log.name,
        status: log.status,
        message: log.message,
        latency_ms: log.latency,
      })),
    };
  }

  /** Pure lookup, no live call — returns the documented call shape plus whether it's reachable via query/mutate at all. */
  private describeMethod(input: { module?: string; method?: string }): unknown {
    const { module, method } = input;
    if (!module || !method) {
      throw new Error('"module" and "method" are both required.');
    }
    const readable = isReadMethodAllowed(module, method);
    const writable = isWriteMethodAllowed(module, method);
    return {
      module,
      method,
      contract: describeMethodContract(module, method),
      mutation_contract: writable ? (hasVerifiedMutationContract(module, method) ? 'verified' : 'unavailable: mutation blocked before dispatch') : 'not applicable',
      reachable_via: BLOCKED_MODULES.has(module)
        ? 'neither — this module is blocked from chat entirely'
        : writable && !readable && !hasVerifiedMutationContract(module, method)
          ? 'neither — authoritative mutation contract unavailable'
        : readable && writable
          ? 'both ductape_query and ductape_mutate'
          : readable
            ? 'ductape_query only (read-only)'
            : writable
              ? 'ductape_mutate only (requires user approval)'
              : 'neither — not in the allowed list for either tool',
    };
  }

  /** Resolves the right public_key for module/product and dispatches through SDKProxyService. Not allowlist-aware — callers must check first. */
  private async dispatch(module: string, method: string, params: any[], product?: string): Promise<unknown> {
    let publicKey: string;
    if (WORKSPACE_SCOPED_MODULES.has(module)) {
      publicKey = this.context.user.public_key;
    } else {
      if (!product) {
        throw new Error(`"${module}.${method}" requires a "product" tag identifying which product to scope this call to.`);
      }
      const found = await this.findProduct(product);
      if (!found.public_key) {
        throw new Error(`Product "${product}" has no public_key on record; it cannot be called from chat.`);
      }
      publicKey = found.public_key;
    }

    const sdk = new SDKProxyService({
      workspace_id: this.context.workspaceId,
      user_id: this.context.user._id,
      public_key: publicKey,
      token: this.context.user.auth_token,
    });

    return sdk.execute(module as SDKModule, method, ...params);
  }

  private async ductapeQuery(input: { module?: string; method?: string; params?: any[]; product?: string }): Promise<unknown> {
    const { module, method, params = [], product } = input;
    if (!module || !method) {
      throw new Error('"module" and "method" are both required.');
    }
    if (BLOCKED_MODULES.has(module)) {
      throw new Error(blockedModuleMessage(module));
    }
    if (!isReadMethodAllowed(module, method)) {
      throw new Error(
        `"${module}.${method}" is not a read method available from chat. Use ductape_mutate if this is meant to change data.\n\nAllowed module.method calls:\n${describeAllowedReadMethods()}`,
      );
    }
    return this.dispatch(module, method, params, product);
  }

  /**
   * Only ever called after the caller (useAgentChat) has obtained explicit
   * user approval for this exact module/method/params — this method itself
   * does not gate on confirmation.
   */
  private async ductapeMutate(input: { module?: string; method?: string; params?: any[]; product?: string }): Promise<unknown> {
    const { module, method, params = [], product } = input;
    if (!module || !method) {
      throw new Error('"module" and "method" are both required.');
    }
    if (BLOCKED_MODULES.has(module)) {
      throw new Error(blockedModuleMessage(module));
    }
    if (!isWriteMethodAllowed(module, method)) {
      throw new Error(
        `"${module}.${method}" is not a write method available from chat.\n\nAllowed module.method calls:\n${describeAllowedWriteMethods()}`,
      );
    }
    assertMutationContract(module, method);
    return this.dispatch(module, method, params, product);
  }

  async execute(toolName: string, input: any): Promise<unknown> {
    switch (toolName) {
      case 'list_products':
        return this.listProducts();
      case 'list_environments':
        return this.listEnvironments(input?.product);
      case 'list_apps':
        return this.listApps();
      case 'get_logs':
        return this.getLogs(input ?? {});
      case 'describe_method':
        return this.describeMethod(input ?? {});
      case 'ductape_query':
        return this.ductapeQuery(input ?? {});
      case MUTATE_TOOL_NAME:
        return this.ductapeMutate(input ?? {});
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

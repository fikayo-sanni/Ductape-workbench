/**
 * SDK modules and methods for publishable key scope (must match backend proxy validators).
 * Used for scope dropdowns in Tokens tab.
 * Only execution-style methods are exposable: query, insert, delete, run, execute, dispatch, send, upload, download, etc.
 */

/** Method names that may be exposed in publishable key scope (execute/run operations only). */
const SCOPE_ALLOWED_METHODS = new Set([
  // Databases: data operations
  'query',
  'insert',
  'updateRecords',
  'delete',
  'upsert',
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'aggregate',
  'beginTransaction',
  'action.dispatch',
  'dispatch',
  // Graph: query / execute
  'createNode',
  'findNodes',
  'findNodeById',
  'updateNode',
  'deleteNode',
  'mergeNode',
  'createRelationship',
  'findRelationships',
  'findRelationshipById',
  'updateRelationship',
  'deleteRelationship',
  'mergeRelationship',
  'traverse',
  'shortestPath',
  'allPaths',
  'getNeighborhood',
  'findConnectedComponents',
  'countNodes',
  'countRelationships',
  'fullTextSearch',
  'vectorSearch',
  'query',
  'executeTransaction',
  'beginTransaction',
  'commitTransaction',
  'rollbackTransaction',
  'dispatch',
  'execute',
  // Webhooks
  'trigger',
  'enable',
  // Notifications
  'dispatch',
  'send',
  // Message brokers
  'produce',
  'consume',
  'dispatch',
  'messages.query',
  // Storage
  'upload',
  'download',
  'getSignedUrl',
  'dispatch',
  // Vector
  'query',
  'upsert',
  'upsertOne',
  'fetchVectors',
  'fetchOne',
  'deleteVectors',
  'deleteByIds',
  'deleteAll',
  'findSimilar',
  'updateVector',
  'updateMetadata',
  'count',
  'exists',
  // Caches (execute: get/set/del are data ops; dispatch for jobs)
  'get',
  'set',
  'del',
  'has',
  'ttl',
  'expire',
  'keys',
  'fetchValues',
  'dispatch',
  // Sessions
  'users',
  'start',
  'verify',
  'refresh',
  'revoke',
  'updateData',
  'extendSession',
  // Quotas
  'check',
  'consume',
  'reset',
  'getUsage',
  // Actions
  'dispatch',
  'run',
  // Jobs
  'cancel',
  'cancelMany',
  'pause',
  'pauseMany',
  'resume',
  'resumeMany',
  'retry',
  'retryMany',
  'reschedule',
  // Logs
  'query',
  'fetch',
  'list',
  'stream',
  // Resilience
  'quotas.check',
  'quotas.consume',
  'quotas.reset',
  'fallbacks.execute',
  // Health
  'status',
  'check',
  'run',
  // Fallback
  'run',
  'dispatch',
  // Secrets (resolve/validate are execution-style)
  'resolve',
  'validate',
]);

export const PUBLISHABLE_SCOPE_MODULES = [
  'product',
  'app',
  'databases',
  'graph',
  'webhooks',
  'notifications',
  'messageBrokers',
  'storage',
  'vector',
  'caches',
  'sessions',
  'quotas',
  'actions',
  'jobs',
  'logs',
  'resilience',
  'health',
  'fallback',
  'secrets',
] as const;

export type PublishableScopeModule = (typeof PUBLISHABLE_SCOPE_MODULES)[number];

/** Methods allowed per module (subset for scope UI; full list in backend proxy validators). */
export const PUBLISHABLE_SCOPE_METHODS: Record<string, readonly string[]> = {
  product: ['create', 'fetch', 'update', 'init', 'updateValidation', 'environments.create', 'environments.list', 'environments.fetch', 'environments.update', 'apps.connect', 'apps.add', 'apps.list', 'apps.fetch', 'apps.update', 'apps.webhooks.list', 'apps.webhooks.enable', 'apps.webhooks.generateLink', 'apps.health.create', 'apps.health.update', 'apps.health.fetch', 'apps.health.list'],
  app: ['create', 'fetch', 'update', 'init', 'environments.create', 'environments.list', 'environments.fetch', 'environments.update', 'variables.create', 'variables.list', 'variables.fetch', 'variables.update', 'constants.create', 'constants.list', 'constants.fetch', 'constants.update', 'actions.create', 'actions.list', 'actions.fetch', 'actions.update', 'actions.delete', 'auths.create', 'auths.list', 'auths.fetch', 'auths.update', 'webhooks.create', 'webhooks.list', 'webhooks.fetch', 'webhooks.update', 'webhooks.events.create', 'webhooks.events.list', 'webhooks.events.fetch', 'webhooks.events.update'],
  databases: ['connect', 'testConnection', 'disconnect', 'closeAll', 'getCurrentContext', 'connection', 'create', 'register', 'list', 'fetch', 'update', 'updateLocalConfig', 'query', 'insert', 'updateRecords', 'delete', 'upsert', 'count', 'sum', 'avg', 'min', 'max', 'aggregate', 'beginTransaction', 'schema.create', 'schema.drop', 'schema.addField', 'schema.dropField', 'schema.renameField', 'schema.modifyField', 'schema.createIndex', 'schema.dropIndex', 'schema.addConstraint', 'schema.dropConstraint', 'schema.rename', 'schema.exists', 'schema.list', 'schema.describe', 'schema.indexes', 'migration.create', 'migration.update', 'migration.fetch', 'migration.list', 'migration.delete', 'migration.run', 'migration.rollback', 'migration.history', 'migration.status', 'action.create', 'action.update', 'action.fetch', 'action.list', 'action.delete', 'action.dispatch', 'dispatch', 'getAdapter', 'getService'],
  graph: ['connect', 'testConnection', 'disconnect', 'disconnectAll', 'getCurrentContext', 'create', 'fetchAll', 'fetch', 'update', 'delete', 'createNode', 'findNodes', 'findNodeById', 'updateNode', 'deleteNode', 'mergeNode', 'addLabels', 'removeLabels', 'setLabels', 'createRelationship', 'findRelationships', 'findRelationshipById', 'updateRelationship', 'deleteRelationship', 'mergeRelationship', 'traverse', 'shortestPath', 'allPaths', 'getNeighborhood', 'findConnectedComponents', 'countNodes', 'countRelationships', 'getStatistics', 'fullTextSearch', 'vectorSearch', 'query', 'schema.createNodeIndex', 'schema.createNodeConstraint', 'schema.createRelationshipIndex', 'schema.listIndexes', 'schema.listConstraints', 'schema.dropIndex', 'schema.dropConstraint', 'schema.listLabels', 'schema.listRelationshipTypes', 'action.create', 'action.list', 'action.fetch', 'action.update', 'action.delete', 'action.dispatch', 'executeTransaction', 'beginTransaction', 'commitTransaction', 'rollbackTransaction', 'dispatch', 'execute', 'getService'],
  webhooks: ['create', 'createWithEvents', 'importBulk', 'list', 'fetch', 'update', 'enable', 'generateLink', 'trigger', 'events.create', 'events.list', 'events.fetch', 'events.update'],
  notifications: ['getMessages', 'create', 'list', 'fetch', 'update', 'delete', 'templates.create', 'templates.list', 'templates.fetch', 'templates.update', 'templates.delete', 'messages.create', 'messages.list', 'messages.fetch', 'messages.update', 'dispatch', 'send'],
  messageBrokers: ['create', 'list', 'fetch', 'update', 'delete', 'topics.create', 'topics.list', 'topics.fetch', 'topics.update', 'topics.delete', 'publish', 'subscribe', 'dispatch', 'testConnection', 'messages.query', 'messages.getProducers', 'messages.getConsumers', 'messages.getDeadLetters', 'messages.getStats', 'messages.getDashboard'],
  storage: ['create', 'list', 'fetch', 'update', 'delete', 'upload', 'download', 'remove', 'listFiles', 'getSignedUrl', 'dispatch', 'stats', 'testConnection'],
  vector: ['create', 'list', 'fetch', 'update', 'delete', 'connect', 'disconnect', 'disconnectAll', 'testConnection', 'query', 'upsert', 'upsertOne', 'fetchVectors', 'fetchOne', 'deleteVectors', 'deleteByIds', 'deleteAll', 'findSimilar', 'updateVector', 'updateMetadata', 'listVectors', 'listAllVectors', 'listNamespaces', 'deleteNamespace', 'describeIndex', 'getStats', 'createIndex', 'deleteIndex', 'listIndexes', 'count', 'exists', 'supportsFeature', 'getService', 'actions.create', 'actions.update', 'actions.fetch', 'actions.fetchAll', 'actions.delete', 'actions.execute'],
  caches: ['create', 'list', 'fetch', 'update', 'delete', 'get', 'set', 'del', 'has', 'clear', 'ttl', 'expire', 'keys', 'fetchValues', 'fetchRemote', 'dispatch'],
  sessions: ['create', 'update', 'list', 'fetch', 'delete', 'users', 'start', 'verify', 'refresh', 'revoke', 'listActive', 'revokeAll', 'updateData', 'extendSession', 'fetchUsers', 'fetchUserDetails', 'fetchDashboard', 'fetchUserDashboard'],
  quotas: ['create', 'list', 'fetch', 'update', 'delete', 'check', 'consume', 'reset', 'getUsage'],
  actions: ['create', 'list', 'fetch', 'update', 'delete', 'dispatch', 'run', 'import'],
  jobs: ['create', 'list', 'fetch', 'update', 'delete', 'get', 'listJobs', 'cancel', 'cancelMany', 'pause', 'pauseMany', 'resume', 'resumeMany', 'retry', 'retryMany', 'reschedule', 'getHistory', 'getStats', 'setWebhook', 'getService'],
  logs: ['query', 'fetch', 'list', 'stream'],
  resilience: ['quotas.create', 'quotas.list', 'quotas.fetch', 'quotas.update', 'quotas.delete', 'quotas.check', 'quotas.consume', 'quotas.reset', 'fallbacks.create', 'fallbacks.list', 'fallbacks.fetch', 'fallbacks.update', 'fallbacks.delete', 'fallbacks.execute'],
  health: ['define', 'create', 'list', 'fetch', 'update', 'delete', 'status', 'check', 'run'],
  fallback: ['define', 'create', 'list', 'fetch', 'update', 'delete', 'run', 'dispatch'],
  secrets: ['create', 'list', 'fetch', 'update', 'delete', 'exists', 'revoke', 'resolve', 'validate', 'getService'],
};

/** Returns only execution-style methods allowed in scope (query, insert, delete, run, execute, dispatch, send, upload, etc.). */
export function getMethodsForModule(module: string): string[] {
  const all = PUBLISHABLE_SCOPE_METHODS[module] ?? [];
  return all.filter((m) => SCOPE_ALLOWED_METHODS.has(m));
}

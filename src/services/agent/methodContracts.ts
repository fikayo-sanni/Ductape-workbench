/**
 * Exact call-shape reference for every module.method the chatbot's ductape_query/ductape_mutate
 * tools can reach (see tools.ts's READ_METHODS/WRITE_METHODS — this file's keys are kept in sync
 * with that allowlist, not with the full SDK).
 *
 * Two independent things make a `sdk[module][method](...)` call's real signature hard to guess
 * from the tool schema alone, and both are exactly what caused real-world confusion this was
 * written to prevent:
 *
 * 1. "positional" vs "object" shape. Many methods take separate positional arguments
 *    (`fetch(product, tag)`); many others take one single options object
 *    (`query({product, env, table, where, ...})`). `params` on the tool call must be built to
 *    match — `params: ['buydeck', 'orders-db']` for the first shape, `params: [{...}]` for the
 *    second. The `product` field on the tool call itself is ONLY used to resolve which product's
 *    public_key to authenticate the request with — it is never auto-inserted into `params`. A
 *    positional method that needs the product tag needs it in `params` too, even though it was
 *    also given separately.
 * 2. Field-name collisions with the wrapping concepts. E.g. vector query/upsert use `tag` for the
 *    vector *resource* identifier and a separate `vector` field for the actual numeric array being
 *    queried/stored — the module is also called "vector", which invites confusing the resource tag
 *    with the module name or the payload field.
 *
 * Sourced directly from `src/services/sdkProxy.ts` (the same dispatch layer every other workbench
 * feature already calls correctly) for shape/argument order, cross-checked against the real
 * `@ductape/sdk` option interfaces for the object-shaped calls. Where a method's object shape is
 * genuinely not pinned down in either place, the entry says so explicitly rather than guessing —
 * do not execute mutations until an authoritative contract is available. Validation errors
 * from live mutations are not a schema-discovery mechanism.
 */

const UNSPECIFIED_OBJECT_SHAPE =
  'Exact input schema unavailable. Do not guess arguments or probe with a live mutation. ' +
  'Use the resource editor or obtain an authoritative SDK contract before enabling this operation.';

export const METHOD_CONTRACTS: Record<string, Record<string, string>> = {
  product: {
    fetch: 'positional: (tag: string). "product" field on the call can repeat the same tag.',
    'environments.list': 'positional: (product: string)',
    'environments.fetch': 'positional: (product: string, slug: string)',
    'environments.create': 'positional: (product: string, data: {env_name: string, description?: string} — three-char slug required, see product docs)',
    'environments.update': 'positional: (product: string, slug: string, data: object — partial patch)',
    'apps.list': 'positional: (product: string) — every App connected to this product, with tag/app_tag AND access_tag on each.',
    'apps.fetch': 'positional: (product: string, tag: string) — tag here means the App connection\'s access_tag, not the bare app tag.',
    'apps.connect': 'positional: (product: string, appTag: string) — connects a marketplace/workspace App by its own tag; returns the new access_tag.',
    'apps.add': 'positional: (product: string, app: object) — lower-level than apps.connect; prefer apps.connect for a normal "connect this app" request.',
    'apps.update': 'positional: (product: string, accessTag: string, data: object) — accessTag must be the connection\'s access_tag (from apps.list), NOT the bare app tag.',
    'apps.webhooks.list': 'positional: (product: string, accessTag: string)',
    'apps.webhooks.enable': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'apps.webhooks.generateLink': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'apps.health.list': 'positional: (product: string, accessTag: string)',
    'apps.health.fetch': 'positional: (product: string, accessTag: string, tag: string)',
    'apps.health.create': 'positional: (product: string, data: object)',
    'apps.health.update': 'positional: (product: string, tag: string, data: object)',
    create: 'positional: (data: object — full product definition)',
    update: 'positional: (tag: string, data: object — partial patch)',
    updateValidation: 'positional: (product: string, tag: string, update: object)',
  },

  app: {
    fetch: 'positional: (tag: string) — the App\'s own tag, not an access_tag (apps are workspace-level, not per-product).',
    'environments.list': 'positional: (appTag: string)',
    'environments.fetch': 'positional: (appTag: string, slug: string)',
    'environments.create': 'positional: (appTag: string, data: object)',
    'environments.update': 'positional: (appTag: string, slug: string, data: object)',
    'variables.list': 'positional: (appTag: string)',
    'variables.fetch': 'positional: (appTag: string, tag: string)',
    'variables.create': 'positional: (appTag: string, data: object)',
    'variables.update': 'positional: (appTag: string, tag: string, data: object)',
    'constants.list': 'positional: (appTag: string)',
    'constants.fetch': 'positional: (appTag: string, tag: string)',
    'constants.create': 'positional: (appTag: string, data: object)',
    'constants.update': 'positional: (appTag: string, tag: string, data: object)',
    'auths.list': 'positional: (appTag: string) — the App\'s formal auth schemes, if any. auths_count: 0 means this App has none; use the connection\'s `credentials` field instead of an auth_tag for it.',
    'auths.fetch': 'positional: (appTag: string, tag: string)',
    'auths.create': 'positional: (appTag: string, data: object — defines a new formal auth scheme on the App itself, not a per-connection credential)',
    'auths.update': 'positional: (appTag: string, tag: string, data: object)',
    create: 'positional: (data: object)',
    update: 'positional: (tag: string, data: object)',
  },

  actions: {
    list: 'positional: (appTag: string) — third-party App actions catalogued on that App.',
    fetch: 'positional: (appTag: string, tag: string)',
    create: 'positional: (appTag: string, data: object)',
    update: 'positional: (appTag: string, tag: string, data: object)',
    delete: 'positional: (appTag: string, tag: string)',
    dispatch: `single object argument (async execution). ${UNSPECIFIED_OBJECT_SHAPE}`,
    run: `single object argument (an App action's live HTTP call — needs product, env, app access_tag, action tag, and input). ${UNSPECIFIED_OBJECT_SHAPE}`,
    import: `single object argument (OpenAPI/Postman import). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  databases: {
    'action.list': 'positional: (databaseTag: string). Returns saved database action definitions; use the fully qualified database tag.',
    'action.fetch': 'positional: (tag: string). Use the saved action tag returned by action.list.',
    'action.dispatch': 'single object argument (IDBActionDispatchInput): {product: string, env: string, database: string, event: string, input: {data: Record<string, unknown>, filter?: Record<string, unknown>}, session?: string, cache?: string, retries?: number, schedule?: {start_at?: number|string, cron?: string, every?: number, limit?: number, endDate?: number|string, tz?: string}}. Schedules a saved database action and may create a job definition. event is the saved action tag. Inspect action.fetch and confirm exact inputs and schedule first; this is asynchronous, not synchronous execute.',
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    listTables: 'single object argument: {product, env, database} (database = the database\'s own tag).',
    listTablesWithInfo: 'single object argument: {product, env, database}',
    describe: 'single object argument: {product, env, database, table}',
    getSchema: 'single object argument: {product, env, database, table?} — omit table for the whole database schema.',
    listIndexes: 'single object argument: {product, env, database, table}',
    count: 'single object argument (IBaseAggregationOptions): {product, env, database, table, where?, session?, transaction?}',
    query: 'single object argument (IQueryOptions): {table, select?, where?, orderBy?, limit?, offset?, include?, env?, product?, database?, transaction?, session?, cache?}. `where` is a plain object of field:value or {$eq,$ne,$gt,$gte,$lt,$lte,$in,...} per field (Mongo-style operators, lowercase $).',
    create: 'positional: (product: string, data: object — full database definition)',
    update: 'positional: (product: string, tag: string, data: object — definition patch, NOT row data; for row updates use updateData)',
    delete: 'positional: (product: string, tag: string) — deletes the whole database definition, not a row. For row deletion use deleteData.',
    connect: 'single object argument: {product, env, database}',
    disconnect: 'single object argument: {product, env, database}',
    closeAll: 'no arguments.',
    insert: 'single object argument (IInsertOptions): {table, data: object|object[], returning?, returningColumns?, onConflict?: {columns, action, update?}, env?, product?, database?, transaction?, preSave?, session?, cache?}',
    updateData: 'single object argument (IUpdateOptions) — this is the ROW-level update, mapped from the tool\'s "updateData" to the SDK\'s "update": {table, data: object (fields, or $inc/$set/$unset/$push/... operators), where: object (required), returning?, env?, product?, database?, transaction?, session?, cache?}',
    deleteData: 'single object argument (IDeleteOptions) — the ROW-level delete, mapped to the SDK\'s "delete": {table, where: object (required), returning?, env?, product?, database?, transaction?, session?, cache?}',
    createTable: UNSPECIFIED_OBJECT_SHAPE,
    alterTable: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    createIndex: `single object argument: {product, env, database, table, columns/fields, unique?}. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  graph: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, graphTag: string)',
    'action.fetchAll': 'single object argument: {product: string, graph: string}. Lists saved action definitions.',
    'action.fetch': 'single object argument: {product: string, graph: string, action: string}. Inspect the saved action parameter contract before execution.',
    'action.execute': 'single object argument (IExecuteGraphActionOptions): {product: string, env: string, graph: string, action: string, input?: Record<string, unknown>, session?: string, cache?: string}. Executes a saved action, which may write data. Inspect action.fetch and obtain approval for the exact inputs first.',
  },

  webhooks: {
    list: 'positional: (product: string, accessTag: string) — accessTag is the App connection\'s access_tag.',
    fetch: 'positional: (appTag: string, tag: string)',
    'events.list': 'positional: (appTag: string, webhookTag: string)',
    'events.fetch': 'positional: (appTag: string, eventTag: string)',
    create: 'positional: (appTag: string, data: object)',
    createWithEvents: 'positional: (appTag: string, data: object — includes an `events` array; creates the webhook then all its events in one call)',
    importBulk: 'positional: (appTag: string, data: object)',
    update: 'positional: (appTag: string, tag: string, data: object)',
    delete: 'positional: (appTag: string, tag: string)',
    enable: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    generateLink: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    trigger: `single object argument (manually fires a webhook event). ${UNSPECIFIED_OBJECT_SHAPE}`,
    'events.create': 'positional: (appTag: string, data: object)',
    'events.update': 'positional: (appTag: string, eventTag: string, data: object)',
    'events.delete': 'positional: (appTag: string, eventTag: string)',
  },

  notifications: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    'templates.list': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'templates.fetch': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'messages.list': 'positional: (product: string, notificationTag: string)',
    'messages.fetch': 'positional: (product: string, tag: string)',
    getMessages: 'single object argument: {product_tag?, env?, notification_tag?, status?, type?, start_date?, end_date?, page?, limit?} — send history with decrypted input.',
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    'templates.create': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'templates.update': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'templates.delete': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'messages.create': 'positional: (product: string, data: object)',
    'messages.update': 'positional: (product: string, tag: string, data: object)',
    dispatch: `single object argument (schedules a notification send). ${UNSPECIFIED_OBJECT_SHAPE}`,
    send: `single object argument (sends immediately: {product, env, notification, channel, input, session?} roughly — confirm channel/input shape from what the user describes). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  messageBrokers: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    'topics.list': `single object argument: {product, brokerTag or similar}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'topics.fetch': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'messages.query': 'single object argument: {product, env, brokerTag, topicTag?, producerTag?, consumerTag?, status?, startDate?, endDate?, page?, limit?}',
    'messages.getProducers': 'single object argument: {product, env, brokerTag, topicTag?, page?, limit?}',
    'messages.getConsumers': 'single object argument: {product, env, brokerTag, topicTag?, page?, limit?}',
    'messages.getDeadLetters': 'single object argument: {product, env, brokerTag, topicTag?, consumerTag?, startDate?, endDate?, page?, limit?}',
    'messages.getStats': 'single object argument: {product, env, brokerTag}',
    'messages.getDashboard': 'single object argument: {product, env, brokerTag}',
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    'topics.create': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'topics.update': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'topics.delete': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    publish: 'single object argument: {product, env, event (format "broker_tag:topic_tag"), message: object, cache?, session?}',
    subscribe: `single object argument (registers a consumer, not something a chat assistant should normally do). ${UNSPECIFIED_OBJECT_SHAPE}`,
    dispatch: `single object argument (scheduled publish). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  storage: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    listFiles: 'single object argument: {product, env, storage, prefix?, limit?, continuationToken?}',
    stats: 'single object argument: {product, env, storage}',
    create: 'positional: (data: object — full storage component definition, no product/tag positional args)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string) — deletes the whole storage COMPONENT from the product, not a file. For file deletion use remove.',
    upload: 'single object argument (IUploadOptions): {product, env, storage, fileName, buffer or data (base64), mimeType?, cache?, session?}',
    remove: 'single object argument (IDeleteOptions, file-deletion — NOT storage.delete): {product, env, storage, fileName, session?}',
    dispatch: `single object argument (scheduled storage operation). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  vector: {
    list: 'single object argument: {product}',
    fetch: 'single object argument: {product, tag} — tag is the vector config\'s own tag.',
    listVectors: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    listAllVectors: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    listNamespaces: 'single object argument: {product, env, vector} — vector is the vector config\'s tag (note the field is called "vector" here, not "tag").',
    describeIndex: 'single object argument: {product, env, vector}',
    getStats: 'single object argument: {product, env, vector}',
    listIndexes: 'single object argument: {product, env, vector}',
    count: 'single object argument: {product, env, vector, namespace?}',
    exists: 'single object argument: {product, env, vector, id, namespace?}',
    supportsFeature: 'single object argument: {product, env, vector, feature}',
    fetchVectors: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    fetchOne: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    query: 'single object argument (IProductVectorQueryOptions): {product, env, tag (vector config\'s tag), vector: number[] (the query embedding), topK, namespace?, filter?, includeValues?, includeMetadata?, minScore?, sparseVector?, alpha?, cache?, session?}. Note "tag" = which vector config, "vector" = the numeric query embedding — do not confuse the two.',
    'actions.fetch': 'single object argument: {product, vector, actionTag}',
    'actions.fetchAll': 'single object argument: {product, vector}',
    create: `single object argument (full vector config definition). ${UNSPECIFIED_OBJECT_SHAPE}`,
    update: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    delete: 'single object argument: {product, tag}',
    connect: 'single object argument: {product, env, tag}',
    disconnect: 'single object argument: {product, env, tag}',
    disconnectAll: 'no arguments.',
    upsert: 'single object argument (IProductVectorUpsertOptions): {product, env, tag (vector config\'s tag), vectors: Array<{id, values: number[], metadata?}>, namespace?, wait?, session?}',
    upsertOne: 'single object argument (upsert exactly one vector — same field names as upsert but a single vector, not an array)',
    deleteVectors: `single object argument: {product, env, tag, ids or filter}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    deleteByIds: 'single object argument: {product, env, tag, ids: string[]}',
    deleteAll: 'single object argument: {product, env, tag, namespace?}',
    updateVector: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    updateMetadata: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    deleteNamespace: 'single object argument: {product, env, tag, namespace}',
    createIndex: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    deleteIndex: 'single object argument: {product, env, tag}',
    'actions.create': 'single object argument: {product, vector, name, actionTag, operation, description?, template: object, parameters?: Array<{name, path, type, defaultValue?, required?, description?}>}',
    'actions.update': 'single object argument: {product, vector, actionTag, name?, description?, template?, parameters?}',
    'actions.delete': 'single object argument: {product, vector, actionTag}',
    'actions.execute': 'single object argument: {product, env, vector, action, input: object}',
  },

  caches: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    get: 'single object argument (IGetCacheValueOptions): {key, env?} — deliberately NOT product/cache-scoped; `key` must already be the exact cache key (from `keys`/`fetchValues`), not just a short name.',
    has: 'single object argument, same shape as get: {key, env?}',
    ttl: 'single object argument, same shape as get: {key, env?}',
    keys: `single object argument: {product, env, cache}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    fetchValues: 'single object argument: {product, cache, env?, page?, limit?, expiryFilter?: "all"|"expiring"|"permanent"|"expired"}',
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string) — deletes the cache COMPONENT, not a key. For a key use del.',
    set: 'single object argument (ISetCacheValueOptions): {product, cache, key, value, componentTag?, componentType?, expiry?: Date, env?} — unlike get, set DOES need product/cache explicitly.',
    del: 'single object argument, same key-addressing as get: {key, env?}',
    clear: `single object argument: {product, env, cache}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    expire: `single object argument: {key, expiry, env?}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    dispatch: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  sessions: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    listActive: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    fetchUsers: 'single object argument: {product, session, env?, page?, limit?}',
    fetchUserDetails: 'single object argument: {product, session, identifier, env?}',
    fetchDashboard: 'single object argument: {product, session, env?}',
    fetchUserDashboard: 'single object argument: {product, session, identifier, env?}',
    create: 'positional: (product: string, payload: object — session definition, not a live login)',
    update: 'positional: (product: string, tag: string, payload: object)',
    delete: 'positional: (product: string, tag: string)',
    start: `single object argument (issues a live session token for an end-user — needs the session definition's tag plus whatever identifies that user). ${UNSPECIFIED_OBJECT_SHAPE}`,
    verify: `single object argument: {session token string, ...}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    refresh: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    revoke: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    revokeAll: `single object argument (revokes every active token for one user/session definition — a broad action, confirm scope with the user before calling). ${UNSPECIFIED_OBJECT_SHAPE}`,
    updateData: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    extendSession: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  quotas: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    getUsage: `single object argument: {product, env, tag}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    consume: `single object argument (records real quota usage — this has a real side effect even though it is a "runtime" call, treat it as a mutation in spirit even if the allowlist has it under reads). ${UNSPECIFIED_OBJECT_SHAPE}`,
    reset: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  jobs: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    get: 'positional: (jobId: string) — a specific scheduled job INSTANCE id, not the job definition tag.',
    listJobs: `single optional object argument (filter). ${UNSPECIFIED_OBJECT_SHAPE}`,
    getHistory: 'positional: (jobId: string, options?: object)',
    getStats: `single optional object argument (filter). ${UNSPECIFIED_OBJECT_SHAPE}`,
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    cancel: 'positional: (jobId: string, options?: object)',
    cancelMany: `positional: (filter: object). ${UNSPECIFIED_OBJECT_SHAPE}`,
    pause: 'positional: (jobId: string)',
    pauseMany: `positional: (filter: object). ${UNSPECIFIED_OBJECT_SHAPE}`,
    resume: 'positional: (jobId: string)',
    resumeMany: `positional: (filter: object). ${UNSPECIFIED_OBJECT_SHAPE}`,
    retry: 'positional: (jobId: string, options?: object)',
    retryMany: `positional: (filter: object). ${UNSPECIFIED_OBJECT_SHAPE}`,
    reschedule: `positional: (jobId: string, options: object — new schedule). ${UNSPECIFIED_OBJECT_SHAPE}`,
    setWebhook: `positional: (config: object). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  logs: {
    query: 'single object argument: {product_tag?, env?, status?, component?, search?, limit?, page?}',
    fetch: 'positional: (logId: string)',
    list: 'single optional object argument, same filters as query',
  },

  resilience: {
    'quotas.list': `single object argument: {product}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.fetch': `single object argument: {product, tag}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.list': `single object argument: {product}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.fetch': `single object argument: {product, tag}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.create': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.update': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.delete': `single object argument: {product, tag}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.consume': `single object argument (records real quota usage — a genuine side effect). ${UNSPECIFIED_OBJECT_SHAPE}`,
    'quotas.reset': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.create': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.update': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.delete': `single object argument: {product, tag}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    'fallbacks.execute': `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  health: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    status: `single object argument: {product, tag or env}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    define: 'positional: (product: string, data: object)',
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    run: `single object argument (executes a healthcheck probe on demand — a real network call to the target resource, treat it as having a side effect on the target even though it's a read of Ductape's own data). ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  fallback: {
    list: 'positional: (product: string)',
    fetch: 'positional: (product: string, tag: string)',
    define: 'positional: (product: string, data: object)',
    create: 'positional: (product: string, data: object)',
    update: 'positional: (product: string, tag: string, data: object)',
    delete: 'positional: (product: string, tag: string)',
    run: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
    dispatch: `single object argument. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },

  feature: {
    fetch: 'positional: (tag: string, product?: string)',
    fetchAll: 'positional: (product?: string)',
    status: `single object argument: {feature_id}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    history: `single object argument: {product, tag or feature_id}. ${UNSPECIFIED_OBJECT_SHAPE}`,
    create: 'positional: (product: string, data: object) — needs the exact compiled Feature shape (steps, input/output schema) produced by feature.define in the product\'s own codebase; a hand-written object here will not behave like a real Feature. Don\'t attempt this from a chat description.',
    update: 'positional: (tag: string, product: string, data: object) — note the argument order: tag first, then product.',
    delete: 'positional: (tag: string, product: string)',
    execute: 'single object argument: {product, env, tag, input: object, session?}. Runs the Feature for real — confirm with the user which product/env and what input before calling.',
    dispatch: 'single object argument, same shape as execute but scheduled/async',
    cancel: `single object argument: {feature_id, reason}. ${UNSPECIFIED_OBJECT_SHAPE}`,
  },
};

/** Returns the documented call shape for one module.method, or a clear "not documented" message. */
export function describeMethodContract(module: string, method: string): string {
  const entry = METHOD_CONTRACTS[module]?.[method];
  if (entry) return entry;
  return (
    `No call-shape reference exists for "${module}.${method}". Confirm it is actually in the ` +
    'allowed list first (ductape_query/ductape_mutate error messages list every allowed method ' +
    'for a module). This is a documentation gap: do not guess inputs or probe a live mutation. ' +
    'Use the resource editor until an authoritative contract is supported.'
  );
}

// Only explicitly reviewed complete call shapes are executable mutations. Broad
// `data: object` placeholders remain blocked even when the method is allowlisted.
const VERIFIED_MUTATION_CONTRACTS = new Set([
  'product.apps.connect',
  'databases.connect', 'databases.disconnect', 'databases.closeAll',
  'databases.action.dispatch',
  'vector.connect', 'vector.disconnect', 'vector.disconnectAll',
  'vector.deleteByIds', 'vector.deleteAll', 'vector.deleteNamespace', 'vector.deleteIndex',
  'vector.actions.delete',
  'feature.delete',
  'graph.action.execute',
]);

export function hasVerifiedMutationContract(module: string, method: string): boolean {
  return VERIFIED_MUTATION_CONTRACTS.has(`${module}.${method}`) && Boolean(METHOD_CONTRACTS[module]?.[method]);
}

export function assertMutationContract(module: string, method: string): void {
  if (!hasVerifiedMutationContract(module, method)) {
    throw Object.assign(new Error(
      `Cannot execute ${module}.${method}: authoritative mutation input contract unavailable. ` +
      'No request was sent. Do not guess fields or retry with speculative inputs; use the Workbench resource editor until authoritative schema lookup is supported.',
    ), { code: 'MUTATION_CONTRACT_UNAVAILABLE', module, method });
  }
}

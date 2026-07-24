export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'mongodb_atlas' | 'neo4j_aura';

export function isManagedDatabaseProvider(provider?: string): provider is 'mongodb_atlas' | 'neo4j_aura' {
  return provider === 'mongodb_atlas' || provider === 'neo4j_aura';
}

export function defaultScopesForProvider(provider: CloudProvider): string[] {
  if (provider === 'mongodb_atlas') return ['database'];
  if (provider === 'neo4j_aura') return ['graph'];
  return ['storage', 'broker', 'database', 'graph', 'vector', 'notifications'];
}

export const SCOPE_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  storage: { label: 'Storage', description: 'Buckets and blob containers' },
  broker: { label: 'Messaging', description: 'Queues and pub/sub' },
  database: { label: 'Databases', description: 'Managed database instances' },
  graph: { label: 'Graphs', description: 'Graph databases' },
  vector: { label: 'Vectors', description: 'Vector / search domains' },
  notifications: { label: 'Notifications', description: 'Firebase push delivery' },
};

export const SERVICES_BY_PROVIDER: Record<
  CloudProvider,
  { service: string; label: string; scope: string }[]
> = {
  aws: [
    { service: 's3', label: 'S3 buckets', scope: 'storage' },
    { service: 'sqs', label: 'SQS queues', scope: 'broker' },
    { service: 'rds', label: 'RDS instances', scope: 'database' },
    { service: 'neptune', label: 'Neptune clusters', scope: 'graph' },
    { service: 'opensearch', label: 'OpenSearch domains', scope: 'vector' },
  ],
  gcp: [
    { service: 'gcs', label: 'GCS buckets', scope: 'storage' },
    { service: 'pubsub', label: 'Pub/Sub topics', scope: 'broker' },
    { service: 'cloudsql', label: 'Cloud SQL (PostgreSQL)', scope: 'database' },
    { service: 'spanner-graph', label: 'Spanner (graph)', scope: 'graph' },
    { service: 'vertex-vector-search', label: 'Vertex AI Vector Search', scope: 'vector' },
  ],
  azure: [
    { service: 'blob', label: 'Blob containers', scope: 'storage' },
    { service: 'servicebus', label: 'Service Bus queues', scope: 'broker' },
    { service: 'postgresql', label: 'PostgreSQL Flexible Server', scope: 'database' },
    { service: 'cosmos-gremlin', label: 'Cosmos DB (Gremlin)', scope: 'graph' },
    { service: 'azure-search', label: 'Azure AI Search', scope: 'vector' },
  ],
  mongodb_atlas: [{ service: 'atlas-cluster', label: 'Atlas clusters', scope: 'database' }],
  neo4j_aura: [{ service: 'aura-instance', label: 'Aura instances', scope: 'graph' }],
};

/** SDK cloud APIs use connection tag; fall back to id for legacy tabs */
export function cloudConnectionRef(connection: { tag?: string; id?: string }): string {
  return String(connection.tag || connection.id || '').trim();
}

export type CloudConnectionQueryRecord = {
  id?: string;
  tag?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Apply mutation/fetch results to cloud-connection queries so detail panels update immediately. */
export function syncCloudConnectionAfterMutation(
  queryClient: {
    setQueryData: (key: unknown[], value: unknown) => void;
    setQueriesData: (
      filters: { queryKey: unknown[]; exact?: boolean },
      updater: (cached: CloudConnectionQueryRecord | undefined) => CloudConnectionQueryRecord | undefined,
    ) => void;
    invalidateQueries: (filters: { queryKey: unknown[] }) => void;
    refetchQueries: (filters: { queryKey: unknown[]; exact?: boolean }) => Promise<unknown>;
  },
  workspaceId: string | null | undefined,
  connection: { id?: string; tag?: string },
  updated: CloudConnectionQueryRecord,
) {
  const cloudRef = cloudConnectionRef(connection);
  const resolvedId = connection.id;
  if (cloudRef && resolvedId) {
    queryClient.setQueryData(
      ['cloud-connection', workspaceId ?? '', cloudRef, resolvedId],
      updated,
    );
  }

  queryClient.setQueriesData(
    { queryKey: ['cloud-connection', workspaceId ?? ''], exact: false },
    (cached) => {
      if (!cached || typeof cached !== 'object') return cached;
      const id = String(cached.id || '');
      const tag = String(cached.tag || '');
      const updId = String(updated.id || '');
      if ((updId && id === updId) || (cloudRef && (tag === cloudRef || id === cloudRef))) {
        return { ...cached, ...updated };
      }
      return cached;
    },
  );

  queryClient.invalidateQueries({ queryKey: ['cloud-connections', workspaceId ?? ''] });
  void queryClient.refetchQueries({ queryKey: ['cloud-connection', workspaceId ?? ''] });
}

/** True when the connection still needs provider credentials / validation */
export function connectionNeedsSetup(status?: string): boolean {
  if (!status) return true;
  return status === 'pending' || status === 'error';
}

/** Connection is validated and usable for resources, security groups, and product linking */
export function isCloudConnectionActive(status?: string): boolean {
  return status === 'active' || status === 'validated';
}

export function connectionStatusMeta(status?: string): {
  label: string;
  className: string;
  dotClassName: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        dotClassName: 'bg-emerald-500',
      };
    case 'validated':
      return {
        label: 'Validated',
        className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        dotClassName: 'bg-emerald-500',
      };
    case 'pending':
      return {
        label: 'Pending setup',
        className: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
        dotClassName: 'bg-amber-500',
      };
    case 'error':
      return {
        label: 'Error',
        className: 'bg-red-500/10 text-red-700 border-red-500/20',
        dotClassName: 'bg-red-500',
      };
    case 'revoked':
      return {
        label: 'Revoked',
        className: 'bg-grey-200 text-grey-600 border-grey-400',
        dotClassName: 'bg-grey-400',
      };
    default:
      return {
        label: status || 'Unknown',
        className: 'bg-grey-100 text-grey-600 border-grey-400',
        dotClassName: 'bg-grey-400',
      };
  }
}

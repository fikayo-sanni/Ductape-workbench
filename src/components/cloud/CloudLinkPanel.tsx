import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Cloud, Loader2, Link2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SDKProxyService } from '@/services/sdkProxy';
import AwsProvisionNetworkingSection from '@/components/cloud/AwsProvisionNetworkingSection';
import { resolveAwsProvisionNetworkingUi } from '@/components/cloud/awsProvisionNetworking';
import { isCloudConnectionActive } from '@/components/cloud/cloudConnection.constants';
import {
  mergeBrokerEnvFromDraft,
  mergeDatabaseEnvFromDraft,
  mergeGraphEnvFromDraft,
  mergeStorageEnvFromDraft,
  mergeVectorEnvFromDraft,
  extractCloudDraftEnv,
  storageResourceShellDraft,
} from '@/utils/cloudDraftMerge';

export type CloudComponentKind = 'storage' | 'messageBrokers' | 'databases' | 'graphs' | 'vectors';

interface CloudLinkPanelProps {
  sdkProxy: SDKProxyService;
  productTag: string;
  componentTag: string;
  componentType: CloudComponentKind;
  envSlug: string;
  storageProvider?: 'aws' | 'azure' | 'gcp';
  onDraftApplied: (draftEnv: Record<string, unknown>) => void;
}

const SERVICE_BY_KIND: Record<CloudComponentKind, { aws: string[]; gcp: string[]; azure: string[] }> = {
  storage: { aws: ['s3'], gcp: ['gcs'], azure: ['blob'] },
  messageBrokers: { aws: ['sqs'], gcp: ['pubsub'], azure: ['servicebus'] },
  databases: { aws: ['rds'], gcp: ['cloudsql'], azure: ['postgresql'] },
  graphs: { aws: ['neptune'], gcp: ['spanner-graph'], azure: ['cosmos-gremlin'] },
  vectors: { aws: ['opensearch'], gcp: ['vertex-vector-search'], azure: ['azure-search'] },
};

/** Common GCS bucket locations (multi-region and regional). */
const GCS_BUCKET_LOCATIONS: { value: string; label: string }[] = [
  { value: 'US', label: 'US — multi-region (United States)' },
  { value: 'EU', label: 'EU — multi-region (Europe)' },
  { value: 'ASIA', label: 'ASIA — multi-region (Asia)' },
  { value: 'us-central1', label: 'us-central1 — Iowa' },
  { value: 'us-east1', label: 'us-east1 — South Carolina' },
  { value: 'us-east4', label: 'us-east4 — Northern Virginia' },
  { value: 'us-west1', label: 'us-west1 — Oregon' },
  { value: 'us-west4', label: 'us-west4 — Las Vegas' },
  { value: 'northamerica-northeast1', label: 'northamerica-northeast1 — Montréal' },
  { value: 'southamerica-east1', label: 'southamerica-east1 — São Paulo' },
  { value: 'europe-west1', label: 'europe-west1 — Belgium' },
  { value: 'europe-west4', label: 'europe-west4 — Netherlands' },
  { value: 'europe-west9', label: 'europe-west9 — Paris' },
  { value: 'asia-east1', label: 'asia-east1 — Taiwan' },
  { value: 'asia-northeast1', label: 'asia-northeast1 — Tokyo' },
  { value: 'asia-southeast1', label: 'asia-southeast1 — Singapore' },
  { value: 'australia-southeast1', label: 'australia-southeast1 — Sydney' },
];

/** Services that support create-new via provision API */
const PROVISIONABLE_SERVICES = new Set([
  's3',
  'sqs',
  'gcs',
  'pubsub',
  'blob',
  'servicebus',
  'postgresql',
  'cosmos-gremlin',
  'azure-search',
  'rds',
  'cloudsql',
  'neptune',
  'spanner-graph',
  'opensearch',
  'vertex-vector-search',
]);

function mergeDraftForComponent(
  componentType: CloudComponentKind,
  draftEnv: Record<string, unknown>,
): Record<string, unknown> {
  if (componentType === 'storage') return mergeStorageEnvFromDraft({}, draftEnv);
  if (componentType === 'databases') return mergeDatabaseEnvFromDraft({}, draftEnv);
  if (componentType === 'graphs') return mergeGraphEnvFromDraft({}, draftEnv);
  if (componentType === 'vectors') return mergeVectorEnvFromDraft({}, draftEnv);
  if (componentType === 'messageBrokers') {
    const cfg = (draftEnv as { config?: Record<string, unknown> }).config || draftEnv;
    return mergeBrokerEnvFromDraft({}, { config: cfg });
  }
  return draftEnv;
}

function servicesForProvider(
  kind: CloudComponentKind,
  provider: string,
  storageProvider?: string,
): string[] {
  const map = SERVICE_BY_KIND[kind];
  if (kind === 'storage' && storageProvider) {
    if (storageProvider === 'aws') return map.aws;
    if (storageProvider === 'gcp') return map.gcp;
    if (storageProvider === 'azure') return map.azure;
    return [];
  }
  if (provider === 'aws') return map.aws;
  if (provider === 'gcp') return map.gcp;
  if (provider === 'azure') return map.azure;
  return [];
}

export default function CloudLinkPanel({
  sdkProxy,
  productTag,
  componentTag,
  componentType,
  envSlug,
  storageProvider,
  onDraftApplied,
}: CloudLinkPanelProps) {
  const [connectionId, setConnectionId] = useState('');
  const [service, setService] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [gcsLocation, setGcsLocation] = useState('US');
  const [provisionName, setProvisionName] = useState('');
  const [selectedSecurityGroups, setSelectedSecurityGroups] = useState<string[]>([]);
  const [existingDbPassword, setExistingDbPassword] = useState('');

  const awsVpcService = service === 'rds' || service === 'neptune';
  const awsVpcResourceType = service === 'neptune' ? 'neptune' : 'rds';

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: ['cloud-connections'],
    queryFn: async () => {
      const res = await sdkProxy.cloud.connections.list();
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const matchingConnections = useMemo(
    () =>
      connections.filter((c: any) => {
        if (!isCloudConnectionActive(c.status)) return false;
        if (storageProvider && c.provider !== storageProvider) return false;
        const services = servicesForProvider(componentType, c.provider, storageProvider);
        if (services.length === 0) return false;
        return true;
      }),
    [connections, storageProvider, componentType],
  );

  const selectedConnection = matchingConnections.find((c: any) => c.id === connectionId);
  const awsNetworkingUi = useMemo(
    () =>
      awsVpcService && selectedConnection
        ? resolveAwsProvisionNetworkingUi(selectedConnection.metadata, awsVpcResourceType)
        : null,
    [awsVpcService, selectedConnection, awsVpcResourceType],
  );

  const autoSecurityGroupsDraft = (customerTags: string[] = selectedSecurityGroups) => ({
    ...(customerTags.length
      ? { securityGroups: customerTags, securityGroupsAuto: false }
      : awsNetworkingUi?.autoGroups.length
        ? { securityGroupsAuto: true }
        : { securityGroupsAuto: false }),
  });
  const availableServices = selectedConnection
    ? servicesForProvider(componentType, selectedConnection.provider, storageProvider)
    : [];

  useEffect(() => {
    if (connectionId && !matchingConnections.some((c: any) => c.id === connectionId)) {
      setConnectionId('');
      setService('');
      setResourceId('');
    }
  }, [connectionId, matchingConnections]);

  useEffect(() => {
    if (availableServices.length === 0) {
      setService('');
      return;
    }
    setService((prev) => (availableServices.includes(prev) ? prev : availableServices[0]));
  }, [connectionId, storageProvider, componentType, selectedConnection?.provider]);

  useEffect(() => {
    setSelectedSecurityGroups([]);
    setExistingDbPassword('');
  }, [connectionId, service]);

  const { data: resources = [], isFetching: loadingResources, refetch: refetchResources } = useQuery({
    queryKey: ['cloud-resources', connectionId, service, region],
    queryFn: async () => {
      if (!connectionId || !service) return [];
      const res = await sdkProxy.cloud.resources.list({
        cloud: selectedConnection.tag,
        service,
        region: service === 'gcs' || service === 'blob' ? undefined : region || undefined,
      });
      return (res as any)?.resources || [];
    },
    enabled: Boolean(connectionId && service),
  });

  const selectedResourceHasStoredCredentials = useMemo(() => {
    if (!resourceId) return false;
    const match = resources.find((r: { id?: string }) => r.id === resourceId);
    return Boolean((match as { metadata?: { hasStoredCredentials?: boolean } })?.metadata?.hasStoredCredentials);
  }, [resources, resourceId]);

  const needsExistingDbPassword =
    componentType === 'databases' &&
    Boolean(resourceId) &&
    (service === 'rds' || service === 'cloudsql' || service === 'postgresql') &&
    !selectedResourceHasStoredCredentials;

  const applyStorageDraft = (draftEnv: Record<string, unknown>) => {
    const merged = mergeDraftForComponent(componentType, draftEnv);
    onDraftApplied(
      componentType === 'storage' ? { ...merged, linkedFromCloud: true } : merged,
    );
  };

  const notifyStorageCloudSelection = (overrides?: {
    bucketName?: string;
    containerName?: string;
    region?: string;
    location?: string;
  }) => {
    if (componentType !== 'storage' || !selectedConnection || !storageProvider) return;
    const bucket =
      overrides?.bucketName ||
      overrides?.containerName ||
      resourceId ||
      provisionName ||
      '';
    applyStorageDraft({
      cloud: selectedConnection.tag,
      type: storageProvider,
      linkedFromCloud: true,
      bucketName: storageProvider === 'azure' ? undefined : bucket,
      containerName: storageProvider === 'azure' ? bucket : undefined,
      region: overrides?.region ?? region,
      location: overrides?.location ?? gcsLocation,
    });
  };

  const notifyDatabaseCloudSelection = (overrides?: {
    instance?: string;
    region?: string;
    securityGroups?: string[];
    masterPassword?: string;
    importExisting?: boolean;
    credentialsStored?: boolean;
  }) => {
    if (componentType !== 'databases' || !selectedConnection) return;
    const instance = overrides?.instance ?? (resourceId || provisionName || '');
    const tags = overrides?.securityGroups ?? selectedSecurityGroups;
    const linkingExisting = overrides?.importExisting ?? Boolean(resourceId);
    const credentialsStored =
      overrides?.credentialsStored ??
      (linkingExisting ? selectedResourceHasStoredCredentials : false);
    const password = overrides?.masterPassword ?? existingDbPassword;
    applyStorageDraft({
      cloud: selectedConnection.tag,
      linkedFromCloud: true,
      instance,
      region: overrides?.region ?? region,
      importExisting: linkingExisting,
      credentialsStored: linkingExisting && credentialsStored,
      ...autoSecurityGroupsDraft(tags),
      ...(linkingExisting && password && !credentialsStored ? { masterPassword: password } : {}),
    });
  };

  const notifyBrokerCloudSelection = (overrides?: { queueName?: string; region?: string }) => {
    if (componentType !== 'messageBrokers' || !selectedConnection) return;
    const queueName = overrides?.queueName || resourceId || provisionName || '';
    applyStorageDraft({
      cloud: selectedConnection.tag,
      linkedFromCloud: true,
      config: {
        cloud: selectedConnection.tag,
        queueName,
        region: overrides?.region ?? region,
      },
    });
  };

  const deferProvisionComponentTypes = new Set<CloudComponentKind>([
    'storage',
    'databases',
    'messageBrokers',
  ]);

  const importMutation = useMutation({
    mutationFn: async (selectedResourceId?: string) => {
      const id = selectedResourceId || resourceId;
      if (!selectedConnection || !service || !id) {
        throw new Error('Select connection, service, and resource');
      }
      return sdkProxy.cloud.resources.import({
        cloud: selectedConnection.tag,
        service,
        resource: id,
        type: componentType,
        product: productTag,
        component: componentTag,
        env: envSlug,
      });
    },
    onSuccess: (result: any, selectedResourceId?: string) => {
      const id = selectedResourceId || resourceId;
      const resource = resources.find((r: { id: string }) => r.id === id);
      const draftEnv =
        extractCloudDraftEnv(result, envSlug) ??
        (componentType === 'storage' && storageProvider
          ? storageResourceShellDraft(storageProvider, resource, id, envSlug)
          : undefined);

      if (!draftEnv) {
        toast.error('Import succeeded but no environment draft returned');
        return;
      }
      applyStorageDraft(draftEnv);
      toast.success('Cloud resource linked — credentials stored as workspace secrets');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to import resource'),
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConnection || !service) throw new Error('Select connection and service');
      const provisionInput: Record<string, unknown> = {
        cloud: selectedConnection.tag,
        service,
        template: 'default',
        type: componentType,
        product: productTag,
        component: componentTag,
        env: envSlug,
      };
      if (['s3', 'sqs', 'rds', 'neptune', 'opensearch'].includes(service)) {
        provisionInput.region = region;
      }
      if (service === 'gcs') {
        provisionInput.location = gcsLocation;
      }
      if (service === 's3' || service === 'gcs') {
        provisionInput.bucketName = provisionName || undefined;
      }
      if (service === 'sqs') {
        provisionInput.queueName = provisionName || undefined;
      }
      if (service === 'pubsub') {
        provisionInput.topicName = provisionName || undefined;
        provisionInput.queueName = provisionName || undefined;
      }
      if (service === 'blob') {
        provisionInput.containerName = provisionName || undefined;
      }
      if (service === 'rds') {
        provisionInput.instance = provisionName || undefined;
        provisionInput.engine = 'postgres';
        provisionInput.dbName = 'ductape';
      }
      if (service === 'neptune') {
        provisionInput.clusterIdentifier = provisionName || undefined;
      }
      if (service === 'cloudsql') {
        provisionInput.instance = provisionName || undefined;
        provisionInput.engine = 'postgres';
        provisionInput.dbName = 'ductape';
        provisionInput.region = region;
      }
      if (awsVpcService) {
        if (awsNetworkingUi?.needsNetworkingSetup) {
          throw new Error(
            `Configure Private access on cloud connection "${selectedConnection.tag}" before provisioning AWS ${service} — use IP allowlist, VPC connector, or register your security groups.`,
          );
        }
        if (awsNetworkingUi?.requiresCustomerSelection && !selectedSecurityGroups.length) {
          throw new Error(
            `Select at least one registered security group for AWS ${service}, or configure IP allowlist / VPC connector on the cloud connection.`,
          );
        }
        if (selectedSecurityGroups.length) {
          provisionInput.securityGroups = selectedSecurityGroups;
        }
        provisionInput.publiclyAccessible = true;
      }
      if (service === 'spanner-graph') {
        provisionInput.instance = provisionName || undefined;
        provisionInput.region = region;
      }
      if (service === 'opensearch') {
        provisionInput.domainName = provisionName || undefined;
      }
      if (service === 'vertex-vector-search') {
        provisionInput.indexName = provisionName || undefined;
        provisionInput.region = region;
      }
      return sdkProxy.cloud.resources.provision(provisionInput);
    },
    onSuccess: (result: any) => {
      const draftEnv = extractCloudDraftEnv(result, envSlug);
      if (draftEnv) {
        applyStorageDraft(draftEnv);
      }
      toast.success('Resource provisioned and linked');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to provision resource'),
  });

  const canProvision = Boolean(service && PROVISIONABLE_SERVICES.has(service));
  const provisionSlow = service === 'rds' || service === 'cloudsql' || service === 'neptune' || service === 'opensearch' || service === 'spanner-graph' || service === 'vertex-vector-search';


  if (connectionId && availableServices.length === 0) {
    return (
      <p className="text-sm text-amber-700">
        This cloud connection does not support {componentType} resources. Choose another
        connection or enter credentials manually below.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-grey">
        <Cloud className="h-4 w-4 text-primary" />
        Link from cloud account
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Cloud connection</Label>
          <Select value={connectionId} onValueChange={(value) => {
            setConnectionId(value);
            const conn = matchingConnections.find((c: { id: string }) => c.id === value);
            if (!conn) return;
            if (componentType === 'storage') {
              applyStorageDraft({
                cloud: conn.tag,
                type: storageProvider,
                linkedFromCloud: true,
                region,
                location: gcsLocation,
              });
            } else if (componentType === 'databases') {
              const connUi = resolveAwsProvisionNetworkingUi(conn.metadata, 'rds');
              applyStorageDraft({
                cloud: conn.tag,
                linkedFromCloud: true,
                region,
                instance: resourceId || provisionName || '',
                ...(connUi.autoGroups.length ? { securityGroupsAuto: true } : { securityGroupsAuto: false }),
              });
            } else if (componentType === 'messageBrokers') {
              applyStorageDraft({
                cloud: conn.tag,
                linkedFromCloud: true,
                config: {
                  cloud: conn.tag,
                  queueName: resourceId || provisionName || '',
                  region,
                },
              });
            } else if (componentType === 'graphs' || componentType === 'vectors') {
              const graphUi =
                conn.provider === 'aws'
                  ? resolveAwsProvisionNetworkingUi(conn.metadata, 'neptune')
                  : null;
              applyStorageDraft({
                cloud: conn.tag,
                linkedFromCloud: true,
                region,
                ...(graphUi?.autoGroups.length ? { securityGroupsAuto: true } : { securityGroupsAuto: false }),
              });
            }
          }}>
            <SelectTrigger className="mt-1.5 bg-white">
              <SelectValue placeholder={loadingConnections ? 'Loading…' : 'Select connection'} />
            </SelectTrigger>
            <SelectContent>
              {matchingConnections.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  {storageProvider
                    ? `No ${storageProvider.toUpperCase()} connections — add one in Settings → Cloud`
                    : 'No active cloud connections'}
                </SelectItem>
              ) : (
                matchingConnections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.display_name || c.tag}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {availableServices.length > 0 && (
          <div>
            <Label>Service</Label>
            <Select
              value={service}
              onValueChange={(v) => {
                setService(v);
                setResourceId('');
              }}
            >
              <SelectTrigger className="mt-1.5 bg-white">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {availableServices.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {service && ['s3', 'sqs', 'rds', 'cloudsql', 'neptune', 'opensearch', 'spanner-graph', 'vertex-vector-search'].includes(service) && (
        <div>
          <Label>{service === 'cloudsql' ? 'Region (GCP)' : 'Region'}</Label>
          <Input
            className="mt-1.5 bg-white"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              if (componentType === 'storage') {
                notifyStorageCloudSelection({ region: e.target.value });
              } else if (componentType === 'databases') {
                notifyDatabaseCloudSelection({ region: e.target.value });
              } else if (componentType === 'messageBrokers') {
                notifyBrokerCloudSelection({ region: e.target.value });
              }
            }}
            placeholder={service === 'cloudsql' ? 'us-central1' : 'us-east-1'}
          />
        </div>
      )}

      {awsVpcService && selectedConnection && awsNetworkingUi && (
        <AwsProvisionNetworkingSection
          ui={awsNetworkingUi}
          resourceType={awsVpcResourceType}
          selectedTags={selectedSecurityGroups}
          connectionTag={selectedConnection.tag}
          onSelectedTagsChange={(tags) => {
            setSelectedSecurityGroups(tags);
            if (componentType === 'databases') {
              notifyDatabaseCloudSelection({ securityGroups: tags });
            } else if (componentType === 'graphs') {
              applyStorageDraft({
                cloud: selectedConnection.tag,
                linkedFromCloud: true,
                region,
                instance: resourceId || provisionName || '',
                ...autoSecurityGroupsDraft(tags),
              });
            }
          }}
        />
      )}

      {service === 'gcs' && (
        <div>
          <Label>Bucket location</Label>
          <Select value={gcsLocation} onValueChange={(value) => {
            setGcsLocation(value);
            if (componentType === 'storage') {
              notifyStorageCloudSelection({ location: value });
            }
          }}>
            <SelectTrigger className="mt-1.5 bg-white">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {GCS_BUCKET_LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {service && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Resource</Label>
            <Select
              value={resourceId}
              onValueChange={(value) => {
                setResourceId(value);
                if (!value) {
                  if (componentType === 'databases') {
                    setExistingDbPassword('');
                    notifyDatabaseCloudSelection({ importExisting: false, masterPassword: '' });
                  }
                  return;
                }
                if (componentType === 'storage' && storageProvider) {
                  notifyStorageCloudSelection({
                    bucketName: storageProvider !== 'azure' ? value : undefined,
                    containerName: storageProvider === 'azure' ? value : undefined,
                  });
                  return;
                }
                if (componentType === 'databases') {
                  setProvisionName('');
                  notifyDatabaseCloudSelection({ instance: value, importExisting: true });
                  return;
                }
                if (componentType === 'messageBrokers') {
                  notifyBrokerCloudSelection({ queueName: value });
                  return;
                }
                importMutation.mutate(value);
              }}
            >
              <SelectTrigger className="mt-1.5 bg-white">
                <SelectValue
                  placeholder={
                    loadingResources ? 'Loading resources…' : 'Select existing resource'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name || r.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchResources()}
            disabled={loadingResources}
          >
            Refresh
          </Button>
          {componentType !== 'storage' &&
            componentType !== 'databases' &&
            componentType !== 'messageBrokers' && (
          <Button
            type="button"
            size="sm"
            className="gap-1"
            disabled={!resourceId || importMutation.isPending}
            onClick={() => importMutation.mutate(undefined)}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Import
          </Button>
          )}
        </div>
      )}

      {needsExistingDbPassword ? (
        <div className="space-y-1.5">
          <Label htmlFor={`existing-db-password-${envSlug}`}>Master password</Label>
          <Input
            id={`existing-db-password-${envSlug}`}
            type="password"
            className="mt-0 bg-white"
            value={existingDbPassword}
            onChange={(e) => {
              setExistingDbPassword(e.target.value);
              notifyDatabaseCloudSelection({
                masterPassword: e.target.value,
                importExisting: true,
                credentialsStored: false,
              });
            }}
            placeholder="RDS master user password"
            autoComplete="new-password"
          />
          <p className="text-xs text-grey-600 leading-relaxed">
            This instance was not provisioned through Ductape. Enter the master password you set
            when the database was created — it is stored as a workspace secret on save.
          </p>
        </div>
      ) : selectedResourceHasStoredCredentials && componentType === 'databases' && resourceId ? (
        <p className="text-xs text-emerald-700 leading-relaxed rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3">
          Credentials for this instance are already in workspace secrets from a previous Ductape
          link — no password needed.
        </p>
      ) : null}

      {canProvision && (
        <div className="flex flex-col gap-2 pt-2 border-t border-grey-300">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Create new (optional name)</Label>
              <Input
                className="mt-1.5 bg-white"
                value={provisionName}
                onChange={(e) => {
                  setProvisionName(e.target.value);
                  if (componentType === 'storage' && storageProvider) {
                    notifyStorageCloudSelection({
                      bucketName: storageProvider !== 'azure' ? e.target.value : undefined,
                      containerName: storageProvider === 'azure' ? e.target.value : undefined,
                    });
                  } else if (componentType === 'databases') {
                    setResourceId('');
                    setExistingDbPassword('');
                    notifyDatabaseCloudSelection({
                      instance: e.target.value,
                      importExisting: false,
                      masterPassword: '',
                    });
                  } else if (componentType === 'messageBrokers') {
                    notifyBrokerCloudSelection({ queueName: e.target.value });
                  }
                }}
                placeholder={
                  service === 'rds'
                    ? 'db instance id (same name across envs = one RDS)'
                      : service === 'cloudsql'
                      ? 'cloud sql instance id (optional)'
                      : service === 'pubsub'
                        ? 'topic name (optional)'
                      : service === 'spanner-graph'
                        ? 'spanner instance id (optional)'
                      : service === 'vertex-vector-search'
                        ? 'index endpoint name (optional)'
                      : service === 'neptune'
                      ? 'cluster id (optional)'
                      : service === 'opensearch'
                        ? 'domain name (optional)'
                        : 'auto-generated if empty'
                }
              />
            </div>
            {deferProvisionComponentTypes.has(componentType) ? (
              <p className="text-xs text-grey-600 self-center">
                New resources are created when you save the component
              </p>
            ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              disabled={provisionMutation.isPending}
              onClick={() => provisionMutation.mutate()}
            >
              {provisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Provision
            </Button>
            )}
          </div>
          {provisionSlow && (
            <p className="text-xs text-amber-700">
              Provisioning may take 10–20 minutes. Keep this tab open until it completes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
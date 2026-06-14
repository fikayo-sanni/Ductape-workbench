import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import DeleteCloudConnectionModal from '@/components/modals/DeleteCloudConnectionModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useSDKProxy } from '@/services/sdkProxy';
import { useWorkbenchStore } from '@/stores/workbench-store';
import {
  logCloud,
  logCloudError,
  logCloudWarn,
  sanitizeCloudPayload,
  summarizeCloudSetupResult,
} from '@/utils/cloudConnectionLog';
import CloudSetupGuidePanel from '@/components/cloud/CloudSetupGuidePanel';
import AwsAssumeRoleTroubleshooting from '@/components/cloud/AwsAssumeRoleTroubleshooting';
import AwsIamUserPolicySection from '@/components/cloud/AwsIamUserPolicySection';
import AwsTrustPolicySection from '@/components/cloud/AwsTrustPolicySection';
import AwsCustomerRoleNetworkingPolicySection from '@/components/cloud/AwsCustomerRoleNetworkingPolicySection';
import { isAssumeRoleValidationError } from '@/components/cloud/awsIamUserPolicy';
import CloudConnectionDetailView from '@/components/cloud/CloudConnectionDetailView';
import CloudConnectionEditPanel from '@/components/cloud/CloudConnectionEditPanel';
import {
  cloudConnectionRef,
  connectionNeedsSetup,
  isCloudConnectionActive,
  isManagedDatabaseProvider,
} from '@/components/cloud/cloudConnection.constants';
import AwsCloudNetworkingPanel from '@/components/cloud/AwsCloudNetworkingPanel';
import ManagedDatabaseNetworkingPanel from '@/components/cloud/ManagedDatabaseNetworkingPanel';
import DuctapeApiProxyIpsPanel from '@/components/cloud/DuctapeApiProxyIpsPanel';
import { CLOUD_PROVIDER_GUIDES, type CloudProvider } from '@/components/cloud/cloudSetupGuide';
import CloudProviderIcon from '@/components/cloud/CloudProviderIcon';

type Provider = CloudProvider;

export interface CloudConnectionsSettingsProps {
  mode?: 'detail' | 'setup';
  connection?: {
    id: string;
    display_name?: string;
    tag?: string;
    description?: string;
    provider?: Provider;
    status?: string;
    scopes?: string[];
    account_identifier?: string;
    metadata?: { external_id?: string; last_validation_error?: string };
    setupPayload?: Record<string, unknown>;
    trust_policy?: unknown;
    external_id?: string;
    ductape_aws_account_id?: string;
    ductape_caller_arn?: string;
  };
  connectionId?: string;
  tabId?: string;
  initialSetup?: Record<string, unknown>;
}

function formatTrustPolicyJson(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function applySetupPayload(
  setup: Record<string, unknown>,
  apply: {
    setTrustPolicy: (v: string) => void;
    setExternalId: (v: string) => void;
    setDuctapeAwsAccountId: (v: string) => void;
    setDuctapeCallerArn: (v: string) => void;
    setSetupInstructions: (v: string) => void;
  },
) {
  if (setup.trust_policy) {
    apply.setTrustPolicy(formatTrustPolicyJson(setup.trust_policy));
  }
  if (typeof setup.external_id === 'string') {
    apply.setExternalId(setup.external_id);
  }
  if (typeof setup.ductape_aws_account_id === 'string') {
    apply.setDuctapeAwsAccountId(setup.ductape_aws_account_id);
  }
  if (typeof setup.ductape_caller_arn === 'string') {
    apply.setDuctapeCallerArn(setup.ductape_caller_arn);
  }
  if (typeof setup.setup_instructions === 'string') {
    apply.setSetupInstructions(setup.setup_instructions);
  }
}

function mergeLiveConnection(
  base: CloudConnectionsSettingsProps['connection'] | undefined,
  fetched: unknown,
): CloudConnectionsSettingsProps['connection'] | undefined {
  if (!base) return undefined;
  if (!fetched || typeof fetched !== 'object') return base;
  const fc = fetched as Record<string, unknown>;
  const fetchedId = fc.id != null ? String(fc.id) : '';
  if (fetchedId && fetchedId !== base.id) return base;
  return {
    ...base,
    id: String(fc.id || base.id),
    display_name: (fc.display_name as string) || base.display_name,
    tag: (fc.tag as string) || base.tag,
    description: (fc.description as string) || base.description,
    provider: (fc.provider as Provider) || base.provider,
    status: (fc.status as string) || base.status,
    scopes: Array.isArray(fc.scopes) ? (fc.scopes as string[]) : base.scopes,
    account_identifier: (fc.account_identifier as string) || base.account_identifier,
    metadata: (fc.metadata as typeof base.metadata) || base.metadata,
  };
}

export default function CloudConnectionsSettings({
  mode = 'detail',
  connection,
  connectionId,
  tabId,
  initialSetup,
}: CloudConnectionsSettingsProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { closeTab } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const proxyConfig =
    currentWorkspaceId && user?._id
      ? {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          token: user.auth_token || '',
          public_key: user.public_key || '',
        }
      : null;
  const sdkProxy = useSDKProxy(proxyConfig);

  const resolvedId = connectionId || connection?.id;
  const cloudRef = connection ? cloudConnectionRef(connection) : resolvedId || '';
  const resolvedProvider = (connection?.provider as Provider) || 'aws';
  const [provider, setProvider] = useState<Provider>(resolvedProvider);
  const [name, setName] = useState(connection?.display_name || '');
  const isSetupMode = mode === 'setup';
  const [setupConnectionId, setSetupConnectionId] = useState<string | null>(
    isSetupMode || connectionNeedsSetup(connection?.status) ? resolvedId || null : null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [trustPolicy, setTrustPolicy] = useState('');
  const [externalId, setExternalId] = useState('');
  const [ductapeAwsAccountId, setDuctapeAwsAccountId] = useState('');
  const [ductapeCallerArn, setDuctapeCallerArn] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [projectId, setProjectId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureDefaultLocation, setAzureDefaultLocation] = useState('eastus');
  const [azureConnectionString, setAzureConnectionString] = useState('');
  const [atlasPublicKey, setAtlasPublicKey] = useState('');
  const [atlasPrivateKey, setAtlasPrivateKey] = useState('');
  const [auraClientId, setAuraClientId] = useState('');
  const [auraClientSecret, setAuraClientSecret] = useState('');
  const [auraInstanceId, setAuraInstanceId] = useState('');
  const [validationError, setValidationError] = useState('');

  const closeCloudConnectionTab = () => {
    const id = setupConnectionId || resolvedId;
    const targetTabId = tabId || (id ? `cloud-${id}` : '');
    if (targetTabId) closeTab(targetTabId);
  };

  const needsSetup = connectionNeedsSetup(connection?.status);

  const showAwsTrustPolicy =
    resolvedProvider === 'aws' && (isSetupMode || needsSetup);
  const isDetailMode = mode === 'detail' && Boolean(connection);
  const isSetupWithConnection = isSetupMode && Boolean(connection);
  const shouldFetchConnection = Boolean(
    sdkProxy &&
      cloudRef &&
      (isDetailMode || isSetupWithConnection || isSetupMode || needsSetup),
  );

  const { data: fetchedConnection, isLoading: loadingConnection, isError: fetchError } = useQuery({
    queryKey: ['cloud-connection', cloudRef, resolvedId],
    queryFn: async () => {
      if (!sdkProxy) return null;
      if (cloudRef) {
        try {
          return await sdkProxy.cloud.connections.fetch(cloudRef);
        } catch {
          // Tag fetch can fail after refresh when only the connection id was restored.
        }
      }
      if (resolvedId) {
        const list = await sdkProxy.cloud.connections.list();
        const rows = Array.isArray(list) ? list : [];
        return (
          rows.find(
            (c: { id?: string; tag?: string }) =>
              c.id === resolvedId || c.tag === cloudRef,
          ) || null
        );
      }
      return null;
    },
    enabled: shouldFetchConnection,
  });

  useEffect(() => {
    if (connection?.provider) {
      setProvider(connection.provider as Provider);
    }
    if (connection?.display_name) {
      setName(connection.display_name);
    }
    if (
      resolvedId &&
      (isSetupMode || connectionNeedsSetup(connection?.status))
    ) {
      setSetupConnectionId(resolvedId);
    }
  }, [connection, mode, isSetupMode, resolvedId, connection?.status]);

  useEffect(() => {
    const payload = initialSetup || connection?.setupPayload;
    if (payload) {
      applySetupPayload(payload, {
        setTrustPolicy,
        setExternalId,
        setDuctapeAwsAccountId,
        setDuctapeCallerArn,
        setSetupInstructions,
      });
    }
  }, [initialSetup, connection?.setupPayload]);

  useEffect(() => {
    if (!connection) return;
    if (connection.trust_policy) {
      setTrustPolicy(formatTrustPolicyJson(connection.trust_policy));
    }
    if (connection.external_id) {
      setExternalId(connection.external_id);
    }
    if (connection.ductape_aws_account_id) {
      setDuctapeAwsAccountId(connection.ductape_aws_account_id);
    }
    if (connection.ductape_caller_arn) {
      setDuctapeCallerArn(connection.ductape_caller_arn);
    }
  }, [
    connection?.id,
    connection?.trust_policy,
    connection?.external_id,
    connection?.ductape_aws_account_id,
    connection?.ductape_caller_arn,
  ]);

  useEffect(() => {
    if (!fetchedConnection) return;
    const fc = fetchedConnection as Record<string, unknown>;
    const meta = (fc.metadata || {}) as Record<string, unknown>;
    const extId =
      (typeof fc.external_id === 'string' ? fc.external_id : undefined) ||
      (typeof meta.external_id === 'string' ? meta.external_id : undefined);
    if (extId) setExternalId(extId);
    if (fc.trust_policy) {
      setTrustPolicy(formatTrustPolicyJson(fc.trust_policy));
    }
    if (typeof fc.ductape_aws_account_id === 'string') {
      setDuctapeAwsAccountId(fc.ductape_aws_account_id);
    }
    if (typeof fc.ductape_caller_arn === 'string') {
      setDuctapeCallerArn(fc.ductape_caller_arn);
    }
    if (typeof fc.setup_instructions === 'string') {
      setSetupInstructions(fc.setup_instructions);
    }
    const metaErr =
      typeof meta.last_validation_error === 'string' ? meta.last_validation_error : undefined;
    if (metaErr) setValidationError(metaErr);
    if (typeof meta.role_arn === 'string') setRoleArn(meta.role_arn);
    if (typeof meta.project_id === 'string') setProjectId(meta.project_id);
    if (typeof meta.tenant_id === 'string') setAzureTenantId(meta.tenant_id);
    if (typeof meta.subscription_id === 'string') {
      setAzureSubscriptionId(meta.subscription_id);
    } else if (typeof fc.account_identifier === 'string') {
      setAzureSubscriptionId(fc.account_identifier);
    }
    if (typeof meta.client_id === 'string') setAzureClientId(meta.client_id);
    if (typeof meta.default_location === 'string') {
      setAzureDefaultLocation(meta.default_location);
    }
    if (typeof meta.atlas_public_key === 'string') setAtlasPublicKey(meta.atlas_public_key);
    if (typeof meta.aura_client_id === 'string') setAuraClientId(meta.aura_client_id);
    if (typeof meta.aura_instance_id === 'string') setAuraInstanceId(meta.aura_instance_id);
  }, [fetchedConnection]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const start = Date.now();
      const id = setupConnectionId || resolvedId;
      const activeProvider = resolvedProvider;
      const body: Record<string, string> = {};
      if (activeProvider === 'aws') body.role_arn = roleArn.trim();
      if (activeProvider === 'gcp') {
        body.project_id = projectId.trim();
        body.service_account_json = serviceAccountJson.trim();
      }
      if (activeProvider === 'azure') {
        body.tenant_id = azureTenantId.trim();
        body.subscription_id = azureSubscriptionId.trim();
        body.client_id = azureClientId.trim();
        body.client_secret = azureClientSecret.trim();
        if (azureDefaultLocation.trim()) body.default_location = azureDefaultLocation.trim();
        if (azureConnectionString.trim()) body.connection_string = azureConnectionString.trim();
      }
      if (activeProvider === 'mongodb_atlas') {
        body.project_id = projectId.trim();
        body.atlas_public_key = atlasPublicKey.trim();
        body.atlas_private_key = atlasPrivateKey.trim();
      }
      if (activeProvider === 'neo4j_aura') {
        body.aura_client_id = auraClientId.trim();
        body.aura_client_secret = auraClientSecret.trim();
        if (auraInstanceId.trim()) body.aura_instance_id = auraInstanceId.trim();
      }
      logCloud('Complete connection — start', {
        connectionId: id,
        provider: activeProvider,
        body: sanitizeCloudPayload(body),
      });
      if (!sdkProxy || !cloudRef) {
        logCloudWarn('Complete connection — missing sdkProxy or connection tag');
        throw new Error('No connection to complete');
      }
      try {
        const result = await sdkProxy.cloud.connections.complete(cloudRef, body);
        logCloud('Complete connection — success', {
          durationMs: Date.now() - start,
          result: summarizeCloudSetupResult(result),
        });
        return result;
      } catch (e) {
        logCloudError('Complete connection — failed', e, { durationMs: Date.now() - start });
        throw e;
      }
    },
    onSuccess: async () => {
      const id = setupConnectionId || resolvedId;
      if (sdkProxy && id) {
        logCloud('Validate connection — start (after complete)', { connectionId: id });
        const validateStart = Date.now();
        try {
          const validation = (await sdkProxy.cloud.connections.validate(cloudRef)) as {
            valid?: boolean;
            message?: string;
          };
          logCloud('Validate connection — response', {
            durationMs: Date.now() - validateStart,
            result: summarizeCloudSetupResult(validation),
          });
          if (validation?.valid === false) {
            const msg = validation.message || 'Validation failed';
            setValidationError(msg);
            toast.error(msg);
            queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
            queryClient.invalidateQueries({ queryKey: ['cloud-connection', id] });
            return;
          }
          setValidationError('');
        } catch (e) {
          logCloudError('Validate connection — failed', e, {
            durationMs: Date.now() - validateStart,
          });
          const msg = e instanceof Error ? e.message : 'Validation failed after setup';
          setValidationError(msg);
          toast.error(msg);
          queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
          return;
        }
      }
      logCloud('Complete connection — flow finished');
      toast.success('Cloud connection active');
      setValidationError('');
      queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['cloud-connection', cloudRef] });
        queryClient.invalidateQueries({ queryKey: ['cloud-connection', id] });
      }
      closeCloudConnectionTab();
    },
    onError: (e: Error) => {
      logCloudError('Complete connection — mutation error', e);
      toast.error(e.message || 'Failed to complete connection');
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!sdkProxy || !cloudRef) throw new Error('No connection');
      return sdkProxy.cloud.connections.validate(cloudRef);
    },
    onSuccess: () => {
      toast.success('Connection validated');
      queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
      queryClient.invalidateQueries({ queryKey: ['cloud-connection', cloudRef] });
    },
    onError: (e: Error) => toast.error(e.message || 'Validation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!sdkProxy || !cloudRef) throw new Error('SDK proxy not available');
      return sdkProxy.cloud.connections.delete(cloudRef);
    },
    onSuccess: () => {
      toast.success('Connection removed');
      queryClient.invalidateQueries({ queryKey: ['cloud-connections'] });
      if (resolvedId) {
        closeTab(`cloud-${resolvedId}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete'),
  });

  if (!sdkProxy) {
    return (
      <p className="text-sm text-grey-600">Sign in with a workspace to manage cloud connections.</p>
    );
  }

  const activeProvider = resolvedProvider;
  const liveConnection = mergeLiveConnection(connection, fetchedConnection);
  const effectiveStatus = liveConnection?.status || connection?.status;
  const wantsSetup = connectionNeedsSetup(effectiveStatus);
  const guide = CLOUD_PROVIDER_GUIDES[activeProvider];

  if (connection && wantsSetup) {
    const setupLive = liveConnection || connection;
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="bg-white border-b border-grey-400 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <CloudProviderIcon provider={setupLive.provider as Provider} size="md" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Setup in progress
                </p>
                <h1 className="text-xl font-semibold text-grey mt-0.5">
                  Connect {guide.shortLabel}
                </h1>
                <p className="text-sm text-grey-600 mt-1">
                  {setupLive.display_name}
                  {setupLive.tag ? (
                    <>
                      {' · '}
                      <span className="font-mono text-grey">{setupLive.tag}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              disabled={deleteMutation.isPending}
              className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full space-y-5">
          {connection.description ? (
            <p className="text-sm text-grey-600">{connection.description}</p>
          ) : null}
          {validationError ? (
            activeProvider === 'aws' && isAssumeRoleValidationError(validationError) ? (
              <AwsAssumeRoleTroubleshooting
                errorMessage={validationError}
                externalId={externalId}
                ductapeAwsAccountId={ductapeAwsAccountId}
                ductapeCallerArn={ductapeCallerArn}
              />
            ) : (
              <div className="rounded-lg border border-red/30 bg-red/5 p-4">
                <p className="text-sm font-semibold text-grey">Validation failed</p>
                <p className="text-sm text-grey-600 mt-1 leading-relaxed">{validationError}</p>
              </div>
            )
          ) : null}
          {setupInstructions ? (
            <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
              <p className="text-sm text-grey-600">{setupInstructions}</p>
            </div>
          ) : null}
          <CloudSetupGuidePanel
            provider={activeProvider}
            compact={activeProvider === 'aws'}
            gcpProjectId={activeProvider === 'gcp' ? projectId : undefined}
          />
          {isManagedDatabaseProvider(activeProvider) && sdkProxy ? (
            <DuctapeApiProxyIpsPanel sdkProxy={sdkProxy} variant="setup" />
          ) : null}
          {showAwsTrustPolicy ? (
            <div className="space-y-4">
              <AwsIamUserPolicySection
                roleArn={roleArn}
                ductapeAwsAccountId={ductapeAwsAccountId}
                ductapeCallerArn={ductapeCallerArn}
              />
              <AwsTrustPolicySection
                trustPolicy={trustPolicy}
                externalId={externalId}
                ductapeAwsAccountId={ductapeAwsAccountId}
                loading={loadingConnection}
              />
              <AwsCustomerRoleNetworkingPolicySection variant="setup" />
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-sm text-grey-700">
                After activation, open <span className="font-medium text-grey">Private access</span> on
                this connection to configure IP allowlist, VPC connector, or your own security groups.
              </div>
            </div>
          ) : null}
          {renderCredentialsPanel()}
        </div>
        <DeleteCloudConnectionModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          displayName={setupLive.display_name || setupLive.tag || 'Cloud connection'}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
        />
      </div>
    );
  }

  if (mode === 'detail' && connection && liveConnection && !wantsSetup) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <CloudConnectionDetailView
          connection={liveConnection}
          sdkProxy={sdkProxy}
          loadingConnection={loadingConnection}
          hasFetchedConnection={Boolean(fetchedConnection)}
          onValidate={() => validateMutation.mutate()}
          validating={validateMutation.isPending}
          onDelete={() => setDeleteModalOpen(true)}
          deleting={deleteMutation.isPending}
          showSetupTab={false}
          securityGroupsContent={
            liveConnection.provider === 'aws' &&
            isCloudConnectionActive(liveConnection.status) &&
            sdkProxy ? (
              <AwsCloudNetworkingPanel
                connection={{
                  ...liveConnection,
                  metadata:
                    (fetchedConnection as { metadata?: Record<string, unknown> } | null)
                      ?.metadata ?? liveConnection.metadata,
                }}
                sdkProxy={sdkProxy}
                workspaceId={currentWorkspaceId}
              />
            ) : isManagedDatabaseProvider(liveConnection.provider) &&
              isCloudConnectionActive(liveConnection.status) &&
              sdkProxy ? (
              <ManagedDatabaseNetworkingPanel
                connection={{
                  ...liveConnection,
                  metadata:
                    (fetchedConnection as { metadata?: Record<string, unknown> } | null)
                      ?.metadata ?? liveConnection.metadata,
                }}
                sdkProxy={sdkProxy}
              />
            ) : null
          }
          settingsContent={
            <CloudConnectionEditPanel
              connection={{
                ...liveConnection,
                metadata:
                  (fetchedConnection as { metadata?: Record<string, unknown> } | null)?.metadata ??
                  liveConnection.metadata,
              }}
              sdkProxy={sdkProxy}
              tabId={tabId}
            />
          }
        />
        <DeleteCloudConnectionModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          displayName={liveConnection.display_name || liveConnection.tag || 'Cloud connection'}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
        />
      </div>
    );
  }

  if (connection && loadingConnection && !liveConnection) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-grey-100 p-6">
      <div className="max-w-md text-center space-y-2">
        <p className="text-sm font-medium text-grey">Could not load this cloud connection</p>
        <p className="text-xs text-grey-600 leading-relaxed">
          {fetchError
            ? 'The connection request failed. Check your network or sign in again, then reopen the tab from the Cloud sidebar.'
            : 'Connection data is missing or still loading. Try selecting the connection again from the Cloud sidebar.'}
        </p>
      </div>
    </div>
  );

  function renderCredentialsPanel() {
    const completing = completeMutation.isPending;
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-grey">Step 4 — Activate connection</h3>
          <p className="text-xs text-grey-600 mt-1">{guide.ductapeFieldHint}</p>
        </div>

        {activeProvider === 'aws' ? (
          <div>
            <Label htmlFor="role-arn-setup">Role ARN</Label>
            <Input
              id="role-arn-setup"
              className="mt-2 font-mono text-sm"
              placeholder="arn:aws:iam::123456789012:role/DuctapeAccess"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
            />
            <p className="text-xs text-grey-600 mt-2">
              Use the ARN for your <span className="font-mono">DuctapeAccess</span> role (name must match
              the IAM user policy above), then activate once both policies are saved in AWS.
            </p>
          </div>
        ) : null}

        {activeProvider === 'gcp' && (
          <>
            <div>
              <Label htmlFor="gcp-project">Project ID</Label>
              <Input
                id="gcp-project"
                className="mt-2"
                placeholder="my-gcp-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
              <p className="text-xs text-grey-600 mt-2">
                Enable the Google Cloud APIs for each feature you use (see setup guide above) before
                activating — e.g. Cloud SQL Admin API for databases.
              </p>
            </div>
            <div>
              <Label htmlFor="gcp-sa-json">Service account JSON</Label>
              <Textarea
                id="gcp-sa-json"
                className="mt-2 font-mono text-xs min-h-[100px]"
                placeholder='{ "type": "service_account", ... }'
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
              />
            </div>
          </>
        )}

        {activeProvider === 'azure' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="azure-tenant">Directory (tenant) ID</Label>
              <Input
                id="azure-tenant"
                className="mt-2 font-mono text-sm"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={azureTenantId}
                onChange={(e) => setAzureTenantId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="azure-subscription">Subscription ID</Label>
              <Input
                id="azure-subscription"
                className="mt-2 font-mono text-sm"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={azureSubscriptionId}
                onChange={(e) => setAzureSubscriptionId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="azure-client-id">Application (client) ID</Label>
              <Input
                id="azure-client-id"
                className="mt-2 font-mono text-sm"
                value={azureClientId}
                onChange={(e) => setAzureClientId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="azure-client-secret">Client secret</Label>
              <Input
                id="azure-client-secret"
                type="password"
                className="mt-2 font-mono text-sm"
                value={azureClientSecret}
                onChange={(e) => setAzureClientSecret(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="azure-location">Default region</Label>
              <Input
                id="azure-location"
                className="mt-2 font-mono text-sm"
                placeholder="eastus"
                value={azureDefaultLocation}
                onChange={(e) => setAzureDefaultLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="azure-conn">Storage connection string (optional legacy)</Label>
              <Input
                id="azure-conn"
                type="password"
                className="mt-2 font-mono text-sm"
                placeholder="Only if not using service principal for blob"
                value={azureConnectionString}
                onChange={(e) => setAzureConnectionString(e.target.value)}
              />
            </div>
          </div>
        )}

        {activeProvider === 'mongodb_atlas' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="atlas-project-id">Atlas project ID</Label>
              <Input
                id="atlas-project-id"
                className="mt-2 font-mono text-sm"
                placeholder="24-character hex project ID"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="atlas-public-key">API public key</Label>
              <Input
                id="atlas-public-key"
                className="mt-2 font-mono text-sm"
                value={atlasPublicKey}
                onChange={(e) => setAtlasPublicKey(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="atlas-private-key">API private key</Label>
              <Input
                id="atlas-private-key"
                type="password"
                className="mt-2 font-mono text-sm"
                value={atlasPrivateKey}
                onChange={(e) => setAtlasPrivateKey(e.target.value)}
                placeholder={
                  (fetchedConnection as { metadata?: { has_atlas_private_key?: boolean } } | null)
                    ?.metadata?.has_atlas_private_key
                    ? 'Enter new key to rotate'
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {activeProvider === 'neo4j_aura' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="aura-client-id">API client ID</Label>
              <Input
                id="aura-client-id"
                className="mt-2 font-mono text-sm"
                value={auraClientId}
                onChange={(e) => setAuraClientId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="aura-client-secret">API client secret</Label>
              <Input
                id="aura-client-secret"
                type="password"
                className="mt-2 font-mono text-sm"
                value={auraClientSecret}
                onChange={(e) => setAuraClientSecret(e.target.value)}
                placeholder={
                  (fetchedConnection as { metadata?: { has_aura_client_secret?: boolean } } | null)
                    ?.metadata?.has_aura_client_secret
                    ? 'Enter new secret to rotate'
                    : undefined
                }
              />
            </div>
            <div>
              <Label htmlFor="aura-instance-id">Aura instance ID (optional)</Label>
              <Input
                id="aura-instance-id"
                className="mt-2 font-mono text-sm"
                placeholder="For reference in this workspace"
                value={auraInstanceId}
                onChange={(e) => setAuraInstanceId(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={
              completing ||
              (activeProvider === 'aws' && !roleArn.trim()) ||
              (activeProvider === 'gcp' &&
                (!projectId.trim() ||
                  (!serviceAccountJson.trim() &&
                    !Boolean(
                      (fetchedConnection as { metadata?: { has_service_account_json?: boolean } } | null)
                        ?.metadata?.has_service_account_json,
                    )))) ||
              (activeProvider === 'azure' &&
                (!azureTenantId.trim() ||
                  !azureSubscriptionId.trim() ||
                  !azureClientId.trim() ||
                  (!azureClientSecret.trim() &&
                    !Boolean(
                      (fetchedConnection as { metadata?: { has_client_secret?: boolean } } | null)
                        ?.metadata?.has_client_secret,
                    )))) ||
              (activeProvider === 'mongodb_atlas' &&
                (!projectId.trim() ||
                  !atlasPublicKey.trim() ||
                  (!atlasPrivateKey.trim() &&
                    !Boolean(
                      (fetchedConnection as { metadata?: { has_atlas_private_key?: boolean } } | null)
                        ?.metadata?.has_atlas_private_key,
                    )))) ||
              (activeProvider === 'neo4j_aura' &&
                (!auraClientId.trim() ||
                  (!auraClientSecret.trim() &&
                    !Boolean(
                      (fetchedConnection as { metadata?: { has_aura_client_secret?: boolean } } | null)
                        ?.metadata?.has_aura_client_secret,
                    ))))
            }
            className="gap-2"
          >
            {completing && <Loader2 className="h-4 w-4 animate-spin" />}
            Activate connection
          </Button>
        </div>
      </div>
    );
  }
}

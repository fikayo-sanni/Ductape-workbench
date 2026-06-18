import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { CLOUD_PROVIDER_GUIDES, type CloudProvider } from '@/components/cloud/cloudSetupGuide';
import type { SDKProxyService } from '@/services/sdkProxy';
import { cloudConnectionRef } from '@/components/cloud/cloudConnection.constants';
import {
  cloudConnectionQueryKey,
  cloudConnectionsQueryKey,
} from '@/utils/cloudConnectionQueryKeys';

export interface CloudConnectionEditPanelProps {
  connection: {
    id?: string;
    display_name?: string;
    tag?: string;
    description?: string;
    provider?: CloudProvider;
    status?: string;
    account_identifier?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
  tabId?: string;
}

export default function CloudConnectionEditPanel({
  connection,
  sdkProxy,
  tabId,
}: CloudConnectionEditPanelProps) {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAuth();
  const { closeTab } = useWorkbenchStore();
  const cloudRef = cloudConnectionRef(connection);
  const provider = (connection.provider || 'aws') as CloudProvider;
  const guide = CLOUD_PROVIDER_GUIDES[provider];
  const meta = connection.metadata || {};

  const [displayName, setDisplayName] = useState(connection.display_name || '');
  const [description, setDescription] = useState(connection.description || '');
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

  const hasClientSecret = Boolean(meta.has_client_secret);
  const hasServiceAccount = Boolean(meta.has_service_account_json);
  const hasConnectionString = Boolean(meta.has_connection_string);
  const hasAtlasPrivateKey = Boolean(meta.has_atlas_private_key);
  const hasAuraClientSecret = Boolean(meta.has_aura_client_secret);

  useEffect(() => {
    setDisplayName(connection.display_name || '');
    setDescription(connection.description || '');
  }, [connection.display_name, connection.description]);

  useEffect(() => {
    if (typeof meta.role_arn === 'string') setRoleArn(meta.role_arn);
    if (typeof meta.project_id === 'string') setProjectId(meta.project_id);
    if (typeof meta.tenant_id === 'string') setAzureTenantId(meta.tenant_id);
    if (typeof meta.subscription_id === 'string') {
      setAzureSubscriptionId(meta.subscription_id);
    } else if (connection.account_identifier) {
      setAzureSubscriptionId(connection.account_identifier);
    }
    if (typeof meta.client_id === 'string') setAzureClientId(meta.client_id);
    if (typeof meta.default_location === 'string') {
      setAzureDefaultLocation(meta.default_location);
    }
    if (typeof meta.atlas_public_key === 'string') setAtlasPublicKey(meta.atlas_public_key);
    if (typeof meta.aura_client_id === 'string') setAuraClientId(meta.aura_client_id);
    if (typeof meta.aura_instance_id === 'string') setAuraInstanceId(meta.aura_instance_id);
  }, [
    connection.account_identifier,
    meta.role_arn,
    meta.project_id,
    meta.tenant_id,
    meta.subscription_id,
    meta.client_id,
    meta.default_location,
    meta.atlas_public_key,
    meta.aura_client_id,
    meta.aura_instance_id,
  ]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      return sdkProxy.cloud.connections.update(cloudRef, {
        display_name: displayName.trim(),
        description: description.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Connection updated');
      queryClient.invalidateQueries({ queryKey: cloudConnectionsQueryKey(currentWorkspaceId) });
      queryClient.invalidateQueries({
        queryKey: cloudConnectionQueryKey(currentWorkspaceId, cloudRef, cloudRef),
      });
      if (connection.id) {
        queryClient.invalidateQueries({
          queryKey: cloudConnectionQueryKey(currentWorkspaceId, cloudRef, connection.id),
        });
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update connection'),
  });

  const credentialsMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      const body: Record<string, string> = {};
      if (provider === 'aws' && roleArn.trim()) body.role_arn = roleArn.trim();
      if (provider === 'gcp') {
        if (projectId.trim()) body.project_id = projectId.trim();
        if (serviceAccountJson.trim()) body.service_account_json = serviceAccountJson.trim();
      }
      if (provider === 'azure') {
        if (azureTenantId.trim()) body.tenant_id = azureTenantId.trim();
        if (azureSubscriptionId.trim()) body.subscription_id = azureSubscriptionId.trim();
        if (azureClientId.trim()) body.client_id = azureClientId.trim();
        if (azureClientSecret.trim()) body.client_secret = azureClientSecret.trim();
        if (azureDefaultLocation.trim()) body.default_location = azureDefaultLocation.trim();
        if (azureConnectionString.trim()) body.connection_string = azureConnectionString.trim();
      }
      if (provider === 'mongodb_atlas') {
        if (projectId.trim()) body.project_id = projectId.trim();
        if (atlasPublicKey.trim()) body.atlas_public_key = atlasPublicKey.trim();
        if (atlasPrivateKey.trim()) body.atlas_private_key = atlasPrivateKey.trim();
      }
      if (provider === 'neo4j_aura') {
        if (auraClientId.trim()) body.aura_client_id = auraClientId.trim();
        if (auraClientSecret.trim()) body.aura_client_secret = auraClientSecret.trim();
        if (auraInstanceId.trim()) body.aura_instance_id = auraInstanceId.trim();
      }
      if (Object.keys(body).length === 0) {
        throw new Error('No credential fields to update');
      }
      await sdkProxy.cloud.connections.complete(cloudRef, body);
      return sdkProxy.cloud.connections.validate(cloudRef);
    },
    onSuccess: (validation) => {
      const result = validation as { valid?: boolean; message?: string };
      if (result?.valid === false) {
        toast.error(result.message || 'Validation failed after saving credentials');
      } else {
        toast.success('Credentials saved and validated');
        if (provider === 'neo4j_aura') {
          const targetTabId = tabId || (connection.id ? `cloud-${connection.id}` : '');
          if (targetTabId) closeTab(targetTabId);
        }
      }
      queryClient.invalidateQueries({ queryKey: cloudConnectionsQueryKey(currentWorkspaceId) });
      queryClient.invalidateQueries({
        queryKey: cloudConnectionQueryKey(currentWorkspaceId, cloudRef, cloudRef),
      });
      if (connection.id) {
        queryClient.invalidateQueries({
          queryKey: cloudConnectionQueryKey(currentWorkspaceId, cloudRef, connection.id),
        });
      }
      setAzureClientSecret('');
      setServiceAccountJson('');
      setAzureConnectionString('');
      setAtlasPrivateKey('');
      setAuraClientSecret('');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update credentials'),
  });

  const metadataDirty =
    displayName.trim() !== (connection.display_name || '').trim() ||
    description.trim() !== (connection.description || '').trim();

  const canSaveCredentials =
    provider === 'aws'
      ? Boolean(roleArn.trim())
      : provider === 'gcp'
        ? Boolean(projectId.trim()) && (Boolean(serviceAccountJson.trim()) || hasServiceAccount)
        : provider === 'mongodb_atlas'
          ? Boolean(projectId.trim()) &&
            Boolean(atlasPublicKey.trim()) &&
            (Boolean(atlasPrivateKey.trim()) || hasAtlasPrivateKey)
          : provider === 'neo4j_aura'
            ? Boolean(auraClientId.trim()) &&
              (Boolean(auraClientSecret.trim()) || hasAuraClientSecret)
            : Boolean(azureTenantId.trim()) &&
              Boolean(azureSubscriptionId.trim()) &&
              Boolean(azureClientId.trim()) &&
              (Boolean(azureClientSecret.trim()) || hasClientSecret || hasConnectionString);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-grey">Connection details</h2>
          <p className="text-xs text-grey-600 mt-1">
            Update the display name and description shown in the workbench. The connection tag used in
            code cannot be changed.
          </p>
        </div>
        <div>
          <Label htmlFor="conn-display-name">Display name</Label>
          <Input
            id="conn-display-name"
            className="mt-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="conn-description">Description</Label>
          <Textarea
            id="conn-description"
            className="mt-2 min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this connection"
          />
        </div>
        {connection.tag ? (
          <div>
            <Label>Connection tag</Label>
            <p className="mt-2 font-mono text-sm text-grey-600">{connection.tag}</p>
          </div>
        ) : null}
        <div className="flex justify-end pt-2 border-t border-grey-400">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!metadataDirty || !displayName.trim() || updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save details
          </Button>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-grey">Credentials</h2>
          <p className="text-xs text-grey-600 mt-1">{guide.ductapeFieldHint}</p>
        </div>

        {provider === 'aws' && (
          <div>
            <Label htmlFor="edit-role-arn">Role ARN</Label>
            <Input
              id="edit-role-arn"
              className="mt-2 font-mono text-sm"
              placeholder="arn:aws:iam::123456789012:role/DuctapeAccess"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
            />
            <p className="text-xs text-grey-600 mt-2">
              Role name must be <span className="font-mono">DuctapeAccess</span> to match the IAM user
              policy Resource ARN.
            </p>
          </div>
        )}

        {provider === 'gcp' && (
          <>
            <div>
              <Label htmlFor="edit-gcp-project">Project ID</Label>
              <Input
                id="edit-gcp-project"
                className="mt-2"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-gcp-sa-json">
                Service account JSON{hasServiceAccount ? ' (leave blank to keep current)' : ''}
              </Label>
              <Textarea
                id="edit-gcp-sa-json"
                className="mt-2 font-mono text-xs min-h-[100px]"
                placeholder={hasServiceAccount ? 'Enter new JSON to rotate credentials' : '{ "type": "service_account", ... }'}
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
              />
            </div>
          </>
        )}

        {provider === 'azure' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-azure-tenant">Directory (tenant) ID</Label>
              <Input
                id="edit-azure-tenant"
                className="mt-2 font-mono text-sm"
                value={azureTenantId}
                onChange={(e) => setAzureTenantId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-azure-subscription">Subscription ID</Label>
              <Input
                id="edit-azure-subscription"
                className="mt-2 font-mono text-sm"
                value={azureSubscriptionId}
                onChange={(e) => setAzureSubscriptionId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-azure-client-id">Application (client) ID</Label>
              <Input
                id="edit-azure-client-id"
                className="mt-2 font-mono text-sm"
                value={azureClientId}
                onChange={(e) => setAzureClientId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-azure-client-secret">
                Client secret{hasClientSecret ? ' (leave blank to keep current)' : ''}
              </Label>
              <Input
                id="edit-azure-client-secret"
                type="password"
                className="mt-2 font-mono text-sm"
                placeholder={hasClientSecret ? 'Enter new secret to rotate' : undefined}
                value={azureClientSecret}
                onChange={(e) => setAzureClientSecret(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-azure-location">Default region</Label>
              <Input
                id="edit-azure-location"
                className="mt-2 font-mono text-sm"
                value={azureDefaultLocation}
                onChange={(e) => setAzureDefaultLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-azure-conn">
                Storage connection string (optional legacy)
                {hasConnectionString ? ' (leave blank to keep current)' : ''}
              </Label>
              <Input
                id="edit-azure-conn"
                type="password"
                className="mt-2 font-mono text-sm"
                value={azureConnectionString}
                onChange={(e) => setAzureConnectionString(e.target.value)}
              />
            </div>
          </div>
        )}

        {provider === 'mongodb_atlas' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-atlas-project">Atlas project ID</Label>
              <Input
                id="edit-atlas-project"
                className="mt-2 font-mono text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-atlas-public-key">API public key</Label>
              <Input
                id="edit-atlas-public-key"
                className="mt-2 font-mono text-sm"
                value={atlasPublicKey}
                onChange={(e) => setAtlasPublicKey(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-atlas-private-key">
                API private key{hasAtlasPrivateKey ? ' (leave blank to keep current)' : ''}
              </Label>
              <Input
                id="edit-atlas-private-key"
                type="password"
                className="mt-2 font-mono text-sm"
                placeholder={hasAtlasPrivateKey ? 'Enter new key to rotate' : undefined}
                value={atlasPrivateKey}
                onChange={(e) => setAtlasPrivateKey(e.target.value)}
              />
            </div>
          </div>
        )}

        {provider === 'neo4j_aura' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-aura-client-id">API client ID</Label>
              <Input
                id="edit-aura-client-id"
                className="mt-2 font-mono text-sm"
                value={auraClientId}
                onChange={(e) => setAuraClientId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aura-client-secret">
                API client secret{hasAuraClientSecret ? ' (leave blank to keep current)' : ''}
              </Label>
              <Input
                id="edit-aura-client-secret"
                type="password"
                className="mt-2 font-mono text-sm"
                placeholder={hasAuraClientSecret ? 'Enter new secret to rotate' : undefined}
                value={auraClientSecret}
                onChange={(e) => setAuraClientSecret(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-aura-instance-id">Aura instance ID (optional)</Label>
              <Input
                id="edit-aura-instance-id"
                className="mt-2 font-mono text-sm"
                value={auraInstanceId}
                onChange={(e) => setAuraInstanceId(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-grey-400">
          <Button
            onClick={() => credentialsMutation.mutate()}
            disabled={!canSaveCredentials || credentialsMutation.isPending}
            className="gap-2"
          >
            {credentialsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save credentials
          </Button>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HardDrive, Save, ChevronRight, Loader2, CheckCircle, Upload, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useSDKProxy } from '@/services/sdkProxy';
import { cn } from '@/lib/utils';
import CloudLinkPanel from '@/components/cloud/CloudLinkPanel';
import { isSecretRef, getStorageBucketName, mergeStorageEnvFromDraft, shouldHideManualCloudCredentials } from '@/utils/cloudDraftMerge';

interface InlineStorageFormProps {
  product: {
    _id: string;
    name: string;
    tag: string;
    logo?: string;
    envs: Array<{ slug: string; name?: string; env_name?: string }>;
    workspace_id?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

interface EnvConfig {
  slug: string;
  env_name: string;
  type: string;
  // AWS
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  // Azure
  containerName: string;
  connectionString: string;
  // GCP
  gcpBucketName: string;
  gcpConfigType: string;
  gcpProjectId: string;
  gcpPrivateKeyId: string;
  gcpPrivateKey: string;
  gcpClientEmail: string;
  gcpClientId: string;
  gcpAuthUri: string;
  gcpTokenUri: string;
  gcpAuthProviderX509CertUrl: string;
  gcpClientX509CertUrl: string;
  gcpUniverseDomain: string;
  /** Cloud connection tag when linking from a workspace cloud account */
  cloud?: string;
  location?: string;
  linkedFromCloud?: boolean;
}

function showCloudLinkPanel(
  sdkProxy: ReturnType<typeof useSDKProxy>,
  formTag: string,
  provider: string,
): boolean {
  return Boolean(sdkProxy && formTag && ['aws', 'azure', 'gcp'].includes(provider));
}

function isStorageEnvCloudLinked(env: EnvConfig): boolean {
  if (env.cloud) return true;
  const bucket = getStorageBucketName(env);
  if (!bucket) return false;
  if (env.linkedFromCloud) return true;
  if (env.type === 'aws') {
    return isSecretRef(env.accessKeyId) || isSecretRef(env.secretAccessKey);
  }
  if (env.type === 'azure') {
    return isSecretRef(env.connectionString);
  }
  if (env.type === 'gcp') {
    return isSecretRef(env.gcpPrivateKey) || isSecretRef(env.gcpClientEmail);
  }
  return false;
}

export default function InlineStorageForm({ product, onCancel, onSuccess }: InlineStorageFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Proxy configuration
  const proxyConfig = product?.workspace_id && user?._id
    ? {
        workspace_id: product.workspace_id || currentWorkspaceId || '',
        user_id: user._id || '',
        token: user.auth_token || '',
        public_key: user.public_key || '',
      }
    : null;

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(proxyConfig);

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
  });

  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);
  const [showEnvs, setShowEnvs] = useState(false);
  const [showSecretKeys, setShowSecretKeys] = useState<Record<string, boolean>>({});

  // Initialize env configs from product environments
  useEffect(() => {
    if (product?.envs && product.envs.length > 0 && envConfigs.length === 0) {
      setEnvConfigs(
        product.envs.map((env: any) => ({
          slug: env.slug,
          env_name: env.name || env.env_name || env.slug,
          type: '',
          bucketName: '',
          accessKeyId: '',
          secretAccessKey: '',
          region: 'us-east-1',
          containerName: '',
          connectionString: '',
          gcpBucketName: '',
          gcpConfigType: 'service_account',
          gcpProjectId: '',
          gcpPrivateKeyId: '',
          gcpPrivateKey: '',
          gcpClientEmail: '',
          gcpClientId: '',
          gcpAuthUri: 'https://accounts.google.com/o/oauth2/auth',
          gcpTokenUri: 'https://oauth2.googleapis.com/token',
          gcpAuthProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
          gcpClientX509CertUrl: '',
          gcpUniverseDomain: 'googleapis.com',
          cloud: '',
          location: 'US',
        }))
      );
    }
  }, [product?.envs]);

  // Build provider-specific config
  const buildConfigForProvider = (env: EnvConfig, type: string) => {
    if (env.cloud) {
      const bucket = getStorageBucketName(env as unknown as Record<string, unknown>);
      if (type.toLowerCase() === 'aws') {
        return {
          cloud: env.cloud,
          bucketName: bucket,
          region: env.region || 'us-east-1',
        };
      }
      if (type.toLowerCase() === 'gcp') {
        return {
          cloud: env.cloud,
          bucketName: bucket,
          location: env.location || 'US',
        };
      }
      if (type.toLowerCase() === 'azure') {
        return {
          cloud: env.cloud,
          containerName: bucket || env.containerName,
        };
      }
    }

    switch (type.toLowerCase()) {
      case 'aws':
        return {
          bucketName: env.bucketName,
          accessKeyId: env.accessKeyId,
          secretAccessKey: env.secretAccessKey,
          region: env.region,
        };
      case 'azure':
        return {
          containerName: env.containerName,
          connectionString: env.connectionString,
        };
      case 'gcp':
        const gcpConfig: any = {
          type: env.gcpConfigType,
          auth_uri: env.gcpAuthUri,
          token_uri: env.gcpTokenUri,
          auth_provider_x509_cert_url: env.gcpAuthProviderX509CertUrl,
          universe_domain: env.gcpUniverseDomain,
        };

        // Only include optional fields if they have values
        if (env.gcpProjectId) gcpConfig.project_id = env.gcpProjectId;
        if (env.gcpPrivateKeyId) gcpConfig.private_key_id = env.gcpPrivateKeyId;
        if (env.gcpPrivateKey) gcpConfig.private_key = env.gcpPrivateKey;
        if (env.gcpClientEmail) gcpConfig.client_email = env.gcpClientEmail;
        if (env.gcpClientId) gcpConfig.client_id = env.gcpClientId;
        if (env.gcpClientX509CertUrl) gcpConfig.client_x509_cert_url = env.gcpClientX509CertUrl;

        return {
          bucketName: getStorageBucketName(env as unknown as Record<string, unknown>),
          config: gcpConfig,
        };
      default:
        return {};
    }
  };

  // Create storage mutation
  const { mutateAsync: createStorage, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; tag: string; description?: string; envs: Array<{ slug: string; type: string; config: any }> }) => {
      if (!sdkProxy) throw new Error('SDK proxy not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      const data = {
        product: product.tag,
        name: values.name,
        tag: values.tag,
        description: values.description,
        envs: values.envs,
      };

      const storage = await sdkProxy.storage.create(data);
      return storage;
    },
    onSuccess: async () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['storages'] });
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['product', product._id] });

      toast.success('Storage created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create storage');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a storage name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a storage tag');
      return;
    }

    // Validate at least one environment is configured
    const hasConfiguredEnv = envConfigs.some(env => env.type);
    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment');
      return;
    }

    // Validate configured environments have required fields
    for (const env of envConfigs) {
      if (env.type) {
        if (env.cloud) {
          if (!getStorageBucketName(env as unknown as Record<string, unknown>)) {
            toast.error(`Select or enter a bucket for ${env.env_name}`);
            return;
          }
          continue;
        }
        if (env.type === 'aws' && !getStorageBucketName(env)) {
          toast.error(
            env.linkedFromCloud
              ? `Select a bucket to link for ${env.env_name}`
              : `Link or enter a bucket name for ${env.env_name}`,
          );
          return;
        }
        if (
          env.type === 'aws' &&
          !isSecretRef(env.accessKeyId) &&
          (!env.accessKeyId || !env.secretAccessKey)
        ) {
          toast.error(`Enter credentials or link a cloud account for ${env.env_name}`);
          return;
        }
        if (env.type === 'azure' && !env.containerName) {
          toast.error(`Please enter container name for ${env.env_name}`);
          return;
        }
        if (
          env.type === 'azure' &&
          !isSecretRef(env.connectionString) &&
          !env.connectionString
        ) {
          toast.error(`Enter connection string or link a cloud account for ${env.env_name}`);
          return;
        }
        if (env.type === 'gcp') {
          if (!getStorageBucketName(env)) {
            toast.error(
              env.linkedFromCloud
                ? `Select a bucket to link for ${env.env_name}`
                : `Link or enter a bucket name for ${env.env_name}`,
            );
            return;
          }
          const hasCloudCreds =
            isSecretRef(env.gcpPrivateKey) ||
            isSecretRef(env.gcpClientEmail);
          if (
            !hasCloudCreds &&
            (!env.gcpProjectId || !env.gcpClientEmail || !env.gcpPrivateKey)
          ) {
            toast.error(
              env.linkedFromCloud
                ? `Wait for cloud import to finish for ${env.env_name}, then try again`
                : `Link a cloud account or upload service account JSON for ${env.env_name}`,
            );
            return;
          }
        }
      }
    }

    try {
      await createStorage({
        name: formData.name,
        tag: formData.tag,
        description: formData.description || undefined,
        envs: envConfigs
          .filter(env => env.type)
          .map(env => ({
            slug: env.slug,
            type: env.type,
            config: buildConfigForProvider(env, env.type),
          })),
      });
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const handleNameChange = (value: string) => {
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    // Auto-fill description if it's empty or still the auto-generated one
    const shouldUpdateDescription =
      !formData.description ||
      formData.description.startsWith('Storage for ');

    setFormData({
      ...formData,
      name: value,
      tag: sanitizedTag,
      description: shouldUpdateDescription && value.trim()
        ? `Storage for ${value.trim()}`
        : formData.description,
    });
  };

  const handleContinue = () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Please fill in name and tag');
      return;
    }
    setShowEnvs(true);
  };

  const updateEnvConfig = (index: number, field: string, value: string) => {
    const updated = [...envConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConfigs(updated);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6 pb-24">
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-grey-500 hover:text-grey -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">Create New Storage</h1>
                <p className="text-sm text-grey-600">
                  Adding to {product.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Storage Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production Storage"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this storage configuration</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., prod-storage"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Unique identifier (auto-generated from name)
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Primary storage for production assets and user uploads"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2 min-h-[80px]"
              />
              <p className="text-xs text-grey-600 mt-1">
                Optional description for this storage configuration
              </p>
            </div>

            {!showEnvs && (
              <Button onClick={handleContinue} className="gap-2">
                Continue to Environment Configuration
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Environment Configurations */}
          {showEnvs && (
            <div className="space-y-6 pt-6 border-t border-grey-400">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-grey">Environment Configuration</h3>
                <p className="text-sm text-grey-600">Configure storage for each environment</p>
              </div>

              {envConfigs.map((env, index) => {
                const useCloudLink = showCloudLinkPanel(sdkProxy, formData.tag, env.type);
                const cloudLinked = isStorageEnvCloudLinked(env);
                const hideManualCredentials = shouldHideManualCloudCredentials(env, useCloudLink);

                return (
                <div key={env.slug} className="p-4 bg-grey-100 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-grey">{env.env_name}</h4>
                    <span className="text-xs text-grey-600">{env.slug}</span>
                  </div>

                  <div>
                    <Label htmlFor={`type-${index}`}>Storage Provider</Label>
                    <Select
                      value={env.type}
                      onValueChange={(value) => updateEnvConfig(index, 'type', value)}
                    >
                      <SelectTrigger id={`type-${index}`} className="mt-2 bg-white">
                        <SelectValue placeholder="Select storage provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">AWS S3</SelectItem>
                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                        <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {useCloudLink && (
                    <CloudLinkPanel
                      sdkProxy={sdkProxy!}
                      productTag={product.tag}
                      componentTag={formData.tag}
                      componentType="storage"
                      envSlug={env.slug}
                      storageProvider={env.type as 'aws' | 'azure' | 'gcp'}
                      onDraftApplied={(draft) => {
                        setEnvConfigs((prev) => {
                          const updated = [...prev];
                          updated[index] = {
                            ...updated[index],
                            ...(mergeStorageEnvFromDraft(
                              updated[index] as unknown as Record<string, unknown>,
                              draft,
                            ) as Partial<EnvConfig>),
                            linkedFromCloud: Boolean(draft.linkedFromCloud ?? updated[index].linkedFromCloud),
                          };
                          return updated;
                        });
                      }}
                    />
                  )}

                  {useCloudLink && cloudLinked && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
                      <p className="text-sm font-medium text-grey flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        Cloud account linked — bucket will be imported or created on save
                      </p>
                      {env.cloud && (
                        <p className="text-xs text-grey-600 pl-6">Cloud: {env.cloud}</p>
                      )}
                      {env.type === 'aws' && getStorageBucketName(env) && (
                        <p className="text-xs text-grey-600 pl-6">Bucket: {getStorageBucketName(env)}</p>
                      )}
                      {env.type === 'azure' && env.containerName && (
                        <p className="text-xs text-grey-600 pl-6">Container: {env.containerName}</p>
                      )}
                      {env.type === 'gcp' && getStorageBucketName(env) && (
                        <p className="text-xs text-grey-600 pl-6">Bucket: {getStorageBucketName(env)}</p>
                      )}
                    </div>
                  )}

                  {/* AWS manual configuration — hidden when using cloud link */}
                  {env.type === 'aws' && !hideManualCredentials && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`bucketName-${index}`} className="required">Bucket Name</Label>
                          <Input
                            id={`bucketName-${index}`}
                            placeholder="my-bucket"
                            value={env.bucketName}
                            onChange={(e) => updateEnvConfig(index, 'bucketName', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`region-${index}`}>Region</Label>
                          <Input
                            id={`region-${index}`}
                            placeholder="us-east-1"
                            value={env.region}
                            onChange={(e) => updateEnvConfig(index, 'region', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`accessKeyId-${index}`}>Access Key ID</Label>
                          <Input
                            id={`accessKeyId-${index}`}
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value={env.accessKeyId}
                            onChange={(e) => updateEnvConfig(index, 'accessKeyId', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`secretAccessKey-${index}`}>Secret Access Key</Label>
                          <div className="relative mt-2">
                            <Input
                              id={`secretAccessKey-${index}`}
                              type={showSecretKeys[`${env.slug}-secretKey`] ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={env.secretAccessKey}
                              onChange={(e) => updateEnvConfig(index, 'secretAccessKey', e.target.value)}
                              className="bg-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecretKeys(prev => ({ ...prev, [`${env.slug}-secretKey`]: !prev[`${env.slug}-secretKey`] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                            >
                              {showSecretKeys[`${env.slug}-secretKey`] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Azure manual configuration — hidden when using cloud link */}
                  {env.type === 'azure' && !hideManualCredentials && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div>
                        <Label htmlFor={`containerName-${index}`} className="required">Container Name</Label>
                        <Input
                          id={`containerName-${index}`}
                          placeholder="my-container"
                          value={env.containerName}
                          onChange={(e) => updateEnvConfig(index, 'containerName', e.target.value)}
                          className="mt-2 bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`connectionString-${index}`}>Connection String</Label>
                        <Input
                          id={`connectionString-${index}`}
                          type="password"
                          placeholder="DefaultEndpointsProtocol=https;..."
                          value={env.connectionString}
                          onChange={(e) => updateEnvConfig(index, 'connectionString', e.target.value)}
                          className="mt-2 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* GCP manual configuration — hidden when using cloud link */}
                  {env.type === 'gcp' && !hideManualCredentials && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-grey">Service Account Credentials</h5>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const json = JSON.parse(event.target?.result as string);
                                    const updated = [...envConfigs];
                                    updated[index] = {
                                      ...updated[index],
                                      gcpConfigType: json.type || 'service_account',
                                      gcpProjectId: json.project_id || '',
                                      gcpPrivateKeyId: json.private_key_id || '',
                                      gcpPrivateKey: json.private_key || '',
                                      gcpClientEmail: json.client_email || '',
                                      gcpClientId: json.client_id || '',
                                      gcpAuthUri: json.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
                                      gcpTokenUri: json.token_uri || 'https://oauth2.googleapis.com/token',
                                      gcpAuthProviderX509CertUrl: json.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
                                      gcpClientX509CertUrl: json.client_x509_cert_url || '',
                                      gcpUniverseDomain: json.universe_domain || 'googleapis.com',
                                    };
                                    setEnvConfigs(updated);
                                    toast.success('Service account file loaded successfully');
                                  } catch (error) {
                                    toast.error('Failed to parse JSON file');
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className="hidden"
                            id={`gcp-service-account-${index}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`gcp-service-account-${index}`)?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Service Account JSON
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`gcpBucketName-${index}`} className="required">Bucket Name</Label>
                          <Input
                            id={`gcpBucketName-${index}`}
                            placeholder="my-bucket"
                            value={env.gcpBucketName}
                            onChange={(e) => updateEnvConfig(index, 'gcpBucketName', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gcpProjectId-${index}`}>Project ID</Label>
                          <Input
                            id={`gcpProjectId-${index}`}
                            placeholder="my-project-id"
                            value={env.gcpProjectId}
                            onChange={(e) => updateEnvConfig(index, 'gcpProjectId', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`gcpPrivateKeyId-${index}`}>Private Key ID</Label>
                        <Input
                          id={`gcpPrivateKeyId-${index}`}
                          placeholder="Private key identifier"
                          value={env.gcpPrivateKeyId}
                          onChange={(e) => updateEnvConfig(index, 'gcpPrivateKeyId', e.target.value)}
                          className="mt-2 bg-white font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`gcpPrivateKey-${index}`}>Private Key</Label>
                        <Textarea
                          id={`gcpPrivateKey-${index}`}
                          placeholder="-----BEGIN PRIVATE KEY-----&#10;..."
                          value={env.gcpPrivateKey}
                          onChange={(e) => updateEnvConfig(index, 'gcpPrivateKey', e.target.value)}
                          className="mt-2 bg-white min-h-20 font-mono text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`gcpClientEmail-${index}`}>Client Email</Label>
                          <Input
                            id={`gcpClientEmail-${index}`}
                            placeholder="service-account@project.iam.gserviceaccount.com"
                            value={env.gcpClientEmail}
                            onChange={(e) => updateEnvConfig(index, 'gcpClientEmail', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gcpClientId-${index}`}>Client ID</Label>
                          <Input
                            id={`gcpClientId-${index}`}
                            placeholder="your-client-id"
                            value={env.gcpClientId}
                            onChange={(e) => updateEnvConfig(index, 'gcpClientId', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`gcpClientX509CertUrl-${index}`}>Client x509 Cert URL</Label>
                        <Input
                          id={`gcpClientX509CertUrl-${index}`}
                          placeholder="https://www.googleapis.com/robot/v1/metadata/x509/..."
                          value={env.gcpClientX509CertUrl}
                          onChange={(e) => updateEnvConfig(index, 'gcpClientX509CertUrl', e.target.value)}
                          className="mt-2 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                );
              })}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Storage
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

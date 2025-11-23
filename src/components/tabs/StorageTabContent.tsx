import { HardDrive, Cloud, Server, Copy, Check, Eye, EyeOff, Edit2, Loader2, Save, X, Upload, CheckCircle, FolderOpen, Code } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageProviders } from '@ductape/sdk/dist/types';
import { useWorkbenchStore } from '@/stores/workbench-store';
import CodeSidebar from '@/components/CodeSidebar';

interface StorageTabContentProps {
  storage: any;
}

export default function StorageTabContent({ storage }: StorageTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
  });
  const [envConfigs, setEnvConfigs] = useState<any[]>([]);
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const productTag = storage?.productTag;
  
  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch storage details from SDK (this will have decrypted credentials)
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['storage', productTag, storage?.tag],
    queryFn: async () => {
      if (!ductape || !productTag || !storage?.tag) return storage;
      const productBuilder = ductape as any;
      await productBuilder.init(productTag);
      return await productBuilder.storage.fetch(storage.tag);
    },
    enabled: !!ductape && !!productTag && !!storage?.tag,
  });

  const displayData = storageData || storage;

  // Initialize form data when storage data is available
  useEffect(() => {
    if (displayData && !isEditing) {
      setFormData({
        name: displayData.name || '',
        tag: displayData.tag || '',
      });
      if (displayData.envs && displayData.envs.length > 0) {
        setEnvConfigs(
          displayData.envs.map((env: any) => {
            const config = env.config || {};
            const isAWS = env.type?.toLowerCase() === 'aws' || config.provider?.toLowerCase() === 'aws';
            const isAzure = env.type?.toLowerCase() === 'azure' || config.provider?.toLowerCase() === 'azure';
            const isGCP = env.type?.toLowerCase() === 'gcp' || config.provider?.toLowerCase() === 'gcp';

            return {
              slug: env.slug,
              env_name: env.env_name || env.slug,
              type: env.type || config.provider || '',
              // AWS fields
              bucketName: isAWS ? (config.bucketName || config.bucket || '') : '',
              accessKeyId: isAWS ? (config.accessKeyId || '') : '',
              secretAccessKey: isAWS ? (config.secretAccessKey || '') : '',
              region: isAWS ? (config.region || 'us-east-1') : 'us-east-1',
              // Azure fields
              containerName: isAzure ? (config.containerName || '') : '',
              connectionString: isAzure ? (config.connectionString || '') : '',
              // GCP fields
              gcpBucketName: isGCP ? (config.bucketName || config.config?.bucketName || '') : '',
              gcpConfigType: isGCP ? (config.config?.type || 'service_account') : '',
              gcpProjectId: isGCP ? (config.projectId || config.config?.project_id || '') : '',
              gcpPrivateKeyId: isGCP ? (config.config?.private_key_id || '') : '',
              gcpPrivateKey: isGCP ? (config.config?.private_key || '') : '',
              gcpClientEmail: isGCP ? (config.config?.client_email || '') : '',
              gcpClientId: isGCP ? (config.config?.client_id || '') : '',
              gcpAuthUri: isGCP ? (config.config?.auth_uri || '') : '',
              gcpTokenUri: isGCP ? (config.config?.token_uri || '') : '',
              gcpAuthProviderX509CertUrl: isGCP ? (config.config?.auth_provider_x509_cert_url || '') : '',
              gcpClientX509CertUrl: isGCP ? (config.config?.client_x509_cert_url || '') : '',
              gcpUniverseDomain: isGCP ? (config.config?.universe_domain || '') : '',
            };
          })
        );
      }
    }
  }, [displayData, isEditing]);

  // Build provider-specific config, merging with original to preserve unchanged credentials
  const buildConfigForProvider = (env: any, type: string, originalEnv?: any) => {
    const originalConfig = originalEnv?.config || {};

    switch (type.toLowerCase()) {
      case 'aws':
        return {
          bucketName: env.bucketName || originalConfig.bucketName || originalConfig.bucket || '',
          accessKeyId: env.accessKeyId || originalConfig.accessKeyId || '',
          secretAccessKey: env.secretAccessKey || originalConfig.secretAccessKey || '',
          region: env.region || originalConfig.region || 'us-east-1',
        };
      case 'azure':
        return {
          containerName: env.containerName || originalConfig.containerName || '',
          connectionString: env.connectionString || originalConfig.connectionString || '',
        };
      case 'gcp':
        const originalGcpConfig = originalConfig.config || {};
        return {
          bucketName: env.gcpBucketName || originalConfig.bucketName || originalConfig.config?.bucketName || '',
          config: {
            type: env.gcpConfigType || originalGcpConfig.type || 'service_account',
            project_id: env.gcpProjectId || originalConfig.projectId || originalGcpConfig.project_id || '',
            private_key_id: env.gcpPrivateKeyId || originalGcpConfig.private_key_id || '',
            private_key: env.gcpPrivateKey || originalGcpConfig.private_key || '',
            client_email: env.gcpClientEmail || originalGcpConfig.client_email || '',
            client_id: env.gcpClientId || originalGcpConfig.client_id || '',
            auth_uri: env.gcpAuthUri || originalGcpConfig.auth_uri || '',
            token_uri: env.gcpTokenUri || originalGcpConfig.token_uri || '',
            auth_provider_x509_cert_url: env.gcpAuthProviderX509CertUrl || originalGcpConfig.auth_provider_x509_cert_url || '',
            client_x509_cert_url: env.gcpClientX509CertUrl || originalGcpConfig.client_x509_cert_url || '',
            universe_domain: env.gcpUniverseDomain || originalGcpConfig.universe_domain || '',
          },
        };
      default:
        return {};
    }
  };

  // Update storage mutation - MUST be called before any conditional returns
  const { mutateAsync: updateStorage, isPending: isUpdating } = useMutation({
    mutationFn: async (values: { name: string; envs: Array<{ slug: string; type: string; config: any }> }) => {
      if (!ductape) throw new Error('Product not initialized');
      if (!productTag) throw new Error('Product tag not found');
      if (!displayData?.tag) throw new Error('Storage tag not found');

      await ductape.init(productTag);
      const productBuilder = ductape as any;

      await productBuilder.storage.update(displayData.tag, {
        name: values.name,
        envs: values.envs.map(env => ({
          slug: env.slug,
          type: env.type.toLowerCase() as StorageProviders,
          config: env.config,
        })),
      });
      return { tag: displayData.tag, name: values.name };
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['storage', productTag, displayData?.tag] });
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      setIsEditing(false);
      toast.success('Storage updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update storage');
    },
  });

  const handleUpdateStorage = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (displayData) {
      setFormData({
        name: displayData.name || '',
        tag: displayData.tag || '',
      });
      if (displayData.envs && displayData.envs.length > 0) {
        setEnvConfigs(
          displayData.envs.map((env: any) => {
            const config = env.config || {};
            const isAWS = env.type?.toLowerCase() === 'aws' || config.provider?.toLowerCase() === 'aws';
            const isAzure = env.type?.toLowerCase() === 'azure' || config.provider?.toLowerCase() === 'azure';
            const isGCP = env.type?.toLowerCase() === 'gcp' || config.provider?.toLowerCase() === 'gcp';

            return {
              slug: env.slug,
              env_name: env.env_name || env.slug,
              type: env.type || config.provider || '',
              bucketName: isAWS ? (config.bucketName || config.bucket || '') : '',
              accessKeyId: isAWS ? (config.accessKeyId || '') : '',
              secretAccessKey: isAWS ? (config.secretAccessKey || '') : '',
              region: isAWS ? (config.region || 'us-east-1') : 'us-east-1',
              containerName: isAzure ? (config.containerName || '') : '',
              connectionString: isAzure ? (config.connectionString || '') : '',
              gcpBucketName: isGCP ? (config.bucketName || config.config?.bucketName || '') : '',
              gcpConfigType: isGCP ? (config.config?.type || 'service_account') : '',
              gcpProjectId: isGCP ? (config.projectId || config.config?.project_id || '') : '',
              gcpPrivateKeyId: isGCP ? (config.config?.private_key_id || '') : '',
              gcpPrivateKey: isGCP ? (config.config?.private_key || '') : '',
              gcpClientEmail: isGCP ? (config.config?.client_email || '') : '',
              gcpClientId: isGCP ? (config.config?.client_id || '') : '',
              gcpAuthUri: isGCP ? (config.config?.auth_uri || '') : '',
              gcpTokenUri: isGCP ? (config.config?.token_uri || '') : '',
              gcpAuthProviderX509CertUrl: isGCP ? (config.config?.auth_provider_x509_cert_url || '') : '',
              gcpClientX509CertUrl: isGCP ? (config.config?.client_x509_cert_url || '') : '',
              gcpUniverseDomain: isGCP ? (config.config?.universe_domain || '') : '',
            };
          })
        );
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a storage name');
      return;
    }

    // Validate at least one environment is configured
    const hasConfiguredEnv = envConfigs.some(env => env.type);
    if (!hasConfiguredEnv) {
      toast.error('Please configure at least one environment');
      return;
    }

    try {
      await updateStorage({
        name: formData.name,
        envs: envConfigs
          .filter(env => env.type)
          .map((env, idx) => {
            // Find the original environment config to preserve unchanged credentials
            const originalEnv = displayData?.envs?.find((e: any) => e.slug === env.slug) || displayData?.envs?.[idx];
            return {
              slug: env.slug,
              type: env.type,
              config: buildConfigForProvider(env, env.type, originalEnv),
            };
          }),
      });
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const updateEnvConfig = (index: number, field: string, value: string) => {
    const updated = [...envConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setEnvConfigs(updated);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'aws':
      case 's3':
        return <Cloud className="h-5 w-5" />;
      case 'azure':
        return <Server className="h-5 w-5" />;
      case 'gcp':
        return <Cloud className="h-5 w-5" />;
      default:
        return <HardDrive className="h-5 w-5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'aws':
      case 's3':
        return 'bg-orange-500/10 text-orange-500';
      case 'azure':
        return 'bg-blue/10 text-blue';
      case 'gcp':
        return 'bg-green/10 text-green';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  const handleViewFiles = () => {
    // Use the first available environment
    const firstEnv = displayData.envs?.[0];
    if (!firstEnv) {
      toast.error('No environment configured');
      return;
    }

    openTab({
      id: `storage-explorer-${displayData.tag}-${firstEnv.slug}`,
      type: 'storage',
      title: `${displayData.name} - Files`,
      itemId: `${displayData.tag}-${firstEnv.slug}`,
      data: {
        storage: {
          name: displayData.name,
          tag: displayData.tag,
          type: firstEnv.type,
          env: firstEnv,
        },
        isExplorer: true,
      },
    });
  };

  const handleViewCode = () => {
    setShowCodeSidebar(true);
  };

  // Generate SDK code examples for storage
  const generateCodeSections = (language: string, env?: string) => {
    const storageTag = displayData.tag || 'your-storage-tag';
    const productTagValue = productTag || 'your-product-tag';
    const envSlug = env || displayData.envs?.[0]?.slug || 'production';

    switch (language) {
      case 'javascript':
        return [
          {
            title: 'Init Ductape',
            code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`
          },
          {
            title: 'Read File',
            code: `const filePath = 'path/to/file.txt';
const file = await ductape.storage.read(filePath);`
          },
          {
            title: 'Write File',
            code: `const uploadData = {
  env: '${envSlug}',
  product: '${productTagValue}',
  event: '${storageTag}',
  file,
  retries: 3,
};

const result = await ductape.storage.save(uploadData);
console.log('File uploaded:', result.url);`
          }
        ];

      case 'typescript':
        return [
          {
            title: 'Init Ductape',
            code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`
          },
          {
            title: 'Read File',
            code: `const filePath: string = 'path/to/file.txt';
const file = await ductape.storage.read(filePath);`
          },
          {
            title: 'Write File',
            code: `const uploadData = {
  env: '${envSlug}',
  product: '${productTagValue}',
  event: '${storageTag}',
  file,
  retries: 3,
};

const {url} = await ductape.storage.save(uploadData);
console.log('File uploaded:', url);`
          }
        ];

      case 'python':
        return [
          {
            title: 'Init Ductape',
            code: `from ductape import Ductape

ductape = Ductape(
    workspace_id='your-workspace-id',
    user_id='your-user-id',
    private_key='your-private-key'
)`
          },
          {
            title: 'Read File',
            code: `file_path = 'path/to/file.txt'
input = ductape.processor.storage.read_file(file_path)`
          },
          {
            title: 'Write File',
            code: `upload_data = {
    'env': '${envSlug}',
    'product_tag': '${productTagValue}',
    'event': '${storageTag}',
    'input': input,
    'retries': 3,
}

result = ductape.processor.storage.run(upload_data)
print(f'File uploaded: {result.url}')`
          }
        ];

      default:
        return [
          {
            title: 'Example',
            code: '// Select a language to see code examples'
          }
        ];
    }
  };

  // Extract product info for header
  const product = storage?.productName && storage?.productTag ? {
    name: storage.productName,
    tag: storage.productTag,
    logo: storage.productLogo,
    _id: storage.productId,
  } : null;

  // Show loader only when actually loading
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading storage details...</p>
        </div>
      </div>
    );
  }

  // Show error if storage data is incomplete and can't be fetched
  if (!storage?.name && !storage?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete storage data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the storage from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Storage for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This storage is connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <HardDrive className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="storage-name">Storage Name</Label>
                      <Input
                        id="storage-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-2"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Tag</Label>
                      <Input
                        value={displayData.tag}
                        readOnly
                        className="mt-2 font-mono text-sm"
                        disabled={true}
                      />
                      <p className="text-xs text-grey-600 mt-1">Tag cannot be changed</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
                    </div>
                    {displayData.description && (
                      <p className="text-sm text-grey-600">{displayData.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  disabled={isUpdating}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleViewCode}
                  className="gap-2"
                  variant="outline"
                >
                  <Code className="h-4 w-4" />
                  Code
                </Button>
                <Button
                  onClick={handleViewFiles}
                  className="gap-2"
                  variant="default"
                >
                  <FolderOpen className="h-4 w-4" />
                  View Files
                </Button>
                <Button
                  onClick={handleUpdateStorage}
                  className="gap-2"
                  variant="outline"
                >
                  <Edit2 className="h-4 w-4" />
                  Update Storage
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Storage Environments */}
        {(envConfigs.length > 0 ? envConfigs : (displayData.envs || [])).map((env: any, index: number) => {
          const envKey = `${env.slug}-${index}`;
          const envConfig = envConfigs[index];
          // Get the original env from displayData for proper config access
          const originalEnv = displayData.envs?.[index] || env;
          const originalConfig = originalEnv.config || {};
          // Use envConfig if it exists (edit mode with form data), otherwise use original env config
          const config = envConfig ? {
            ...originalConfig,
            // For GCP, we need to preserve the nested structure
            ...(originalConfig.config && { config: originalConfig.config }),
          } : originalConfig;
          const providerType = envConfig?.type || originalEnv.type || originalConfig.provider || '';
          const isAWS = providerType?.toLowerCase() === 'aws';
          const isAzure = providerType?.toLowerCase() === 'azure';
          const isGCP = providerType?.toLowerCase() === 'gcp';
          
          return (
            <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey flex items-center gap-2">
                  {getProviderIcon(providerType)}
                  Environment: {env.slug || envConfig?.slug}
                </h2>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Select
                      value={providerType.toLowerCase() || ''}
                      onValueChange={(value) => updateEnvConfig(index, 'type', value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">AWS</SelectItem>
                        <SelectItem value="azure">Azure</SelectItem>
                        <SelectItem value="gcp">GCP</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn('px-3 py-1 rounded text-xs font-medium', getProviderColor(providerType))}>
                      {(providerType || 'Unknown').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Credentials Section */}
              <>

              {/* AWS S3 Configuration */}
              {isAWS && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-grey">Bucket Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={isEditing ? (envConfig?.bucketName || '') : (config.bucketName || config.bucket || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'bucketName', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm"
                      />
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(config.bucketName || config.bucket || '', `bucket-${index}`)}
                        >
                          {copiedKey === `bucket-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Region</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={isEditing ? (envConfig?.region || '') : (config.region || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'region', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm"
                      />
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(config.region || '', `region-${index}`)}
                        >
                          {copiedKey === `region-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Access Key ID</Label>
                    <div className="relative mt-1">
                      <Input
                        value={isEditing ? (envConfig?.accessKeyId || '') : (config.accessKeyId ? (showCredentials[`${envKey}-accessKey`] ? config.accessKeyId : '••••••••••••••••') : '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'accessKeyId', e.target.value) : undefined}
                        type={isEditing || showCredentials[`${envKey}-accessKey`] ? 'text' : 'password'}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm pr-10"
                      />
                      {!isEditing && config.accessKeyId && (
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, [`${envKey}-accessKey`]: !prev[`${envKey}-accessKey`] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                        >
                          {showCredentials[`${envKey}-accessKey`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Secret Access Key</Label>
                    <div className="relative mt-1">
                      <Input
                        value={isEditing ? (envConfig?.secretAccessKey || '') : (config.secretAccessKey ? (showCredentials[`${envKey}-secretKey`] ? config.secretAccessKey : '••••••••••••••••') : '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'secretAccessKey', e.target.value) : undefined}
                        type={isEditing || showCredentials[`${envKey}-secretKey`] ? 'text' : 'password'}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm pr-10"
                      />
                      {!isEditing && config.secretAccessKey && (
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, [`${envKey}-secretKey`]: !prev[`${envKey}-secretKey`] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                        >
                          {showCredentials[`${envKey}-secretKey`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Azure Blob Configuration */}
              {isAzure && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold text-grey">Container Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={isEditing ? (envConfig?.containerName || '') : (config.containerName || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'containerName', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm"
                      />
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(config.containerName || '', `container-${index}`)}
                        >
                          {copiedKey === `container-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Connection String</Label>
                    <div className="relative mt-1">
                      <Input
                        value={isEditing ? (envConfig?.connectionString || '') : (config.connectionString ? (showCredentials[`${envKey}-connectionString`] ? config.connectionString : '••••••••••••••••') : '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'connectionString', e.target.value) : undefined}
                        type={isEditing || showCredentials[`${envKey}-connectionString`] ? 'text' : 'password'}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm pr-10"
                      />
                      {!isEditing && config.connectionString && (
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, [`${envKey}-connectionString`]: !prev[`${envKey}-connectionString`] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                        >
                          {showCredentials[`${envKey}-connectionString`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* GCP Storage Configuration */}
              {isGCP && (
                <div className="space-y-3">
                  {/* Upload Service Account JSON - Only show in edit mode */}
                  {isEditing && (
                    <>
                      <div className="flex items-center gap-2">
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
                                  // Update all GCP fields at once
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
                          disabled={isUpdating}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Service Account JSON
                        </Button>
                      </div>

                      {/* Info box explaining what the upload does */}
                      <div className="border border-grey-300 rounded-lg p-4 bg-grey-100/50">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary text-sm font-semibold">i</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-grey mb-1">Upload Service Account File</h5>
                            <p className="text-sm text-grey-600 leading-relaxed">
                              Save time by uploading your Google Cloud service account JSON file. The upload will automatically populate
                              all credential fields below (project ID, private key, client email, etc.), eliminating the need to
                              manually copy and paste each value. You can still edit any field after uploading.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-grey">Bucket Name</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={isEditing ? (envConfig?.gcpBucketName || '') : (originalConfig.bucketName || originalConfig.config?.bucketName || '')}
                          onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpBucketName', e.target.value) : undefined}
                          readOnly={!isEditing}
                          disabled={isUpdating}
                          className="font-mono text-sm"
                        />
                        {!isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(originalConfig.bucketName || originalConfig.config?.bucketName || '', `gcpbucket-${index}`)}
                          >
                            {copiedKey === `gcpbucket-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-grey">Project ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={isEditing ? (envConfig?.gcpProjectId || '') : (originalConfig.projectId || originalConfig.config?.project_id || '')}
                          onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpProjectId', e.target.value) : undefined}
                          readOnly={!isEditing}
                          disabled={isUpdating}
                          className="font-mono text-sm"
                        />
                        {!isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(originalConfig.projectId || originalConfig.config?.project_id || '', `project-${index}`)}
                          >
                            {copiedKey === `project-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-grey">Config Type</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpConfigType || '') : (originalConfig.config?.type || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpConfigType', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-grey">Private Key ID</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpPrivateKeyId || '') : (originalConfig.config?.private_key_id || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpPrivateKeyId', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Private Key</Label>
                    <div className="relative mt-1">
                      <Textarea
                        value={isEditing ? (envConfig?.gcpPrivateKey || '') : (originalConfig.config?.private_key ? (showCredentials[`${envKey}-privateKey`] ? originalConfig.config.private_key : '••••••••••••••••') : '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpPrivateKey', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm pr-10"
                        rows={3}
                      />
                      {!isEditing && originalConfig.config?.private_key && (
                        <button
                          type="button"
                          onClick={() => setShowCredentials(prev => ({ ...prev, [`${envKey}-privateKey`]: !prev[`${envKey}-privateKey`] }))}
                          className="absolute right-3 top-3 text-grey-600 hover:text-grey focus:outline-none"
                        >
                          {showCredentials[`${envKey}-privateKey`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-grey">Client Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={isEditing ? (envConfig?.gcpClientEmail || '') : (originalConfig.config?.client_email || '')}
                          onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpClientEmail', e.target.value) : undefined}
                          readOnly={!isEditing}
                          disabled={isUpdating}
                          className="font-mono text-sm"
                        />
                        {!isEditing && originalConfig.config?.client_email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(originalConfig.config.client_email, `clientEmail-${index}`)}
                          >
                            {copiedKey === `clientEmail-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-grey">Client ID</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpClientId || '') : (originalConfig.config?.client_id || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpClientId', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-grey">Auth URI</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpAuthUri || '') : (originalConfig.config?.auth_uri || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpAuthUri', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-grey">Token URI</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpTokenUri || '') : (originalConfig.config?.token_uri || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpTokenUri', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-grey">Auth Provider X509 Cert URL</Label>
                    <Input
                      value={isEditing ? (envConfig?.gcpAuthProviderX509CertUrl || '') : (originalConfig.config?.auth_provider_x509_cert_url || '')}
                      onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpAuthProviderX509CertUrl', e.target.value) : undefined}
                      readOnly={!isEditing}
                      disabled={isUpdating}
                      className="font-mono text-sm mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-grey">Client X509 Cert URL</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpClientX509CertUrl || '') : (originalConfig.config?.client_x509_cert_url || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpClientX509CertUrl', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-grey">Universe Domain</Label>
                      <Input
                        value={isEditing ? (envConfig?.gcpUniverseDomain || '') : (originalConfig.config?.universe_domain || '')}
                        onChange={isEditing ? (e) => updateEnvConfig(index, 'gcpUniverseDomain', e.target.value) : undefined}
                        readOnly={!isEditing}
                        disabled={isUpdating}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
              </>
            </div>
          );
        })}

        {/* Empty State */}
        {(!envConfigs.length && (!displayData.envs || displayData.envs.length === 0)) && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Configured</h3>
            <p className="text-sm text-grey-600">
              This storage component doesn't have any environment configurations yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Storage</h3>
          <p className="text-xs text-blue-800">
            Storage components allow you to manage file storage across different cloud providers (AWS S3, Azure Blob, GCP Cloud Storage). Each environment can have its own configuration.
          </p>
        </div>
      </div>
    </div>

    {/* Code Sidebar */}
    {showCodeSidebar && (
      <CodeSidebar
        title={displayData.name || 'Storage'}
        subtitle={`Product: ${product?.name || productTag || 'Unknown'}`}
        tag={displayData.tag}
        onClose={() => setShowCodeSidebar(false)}
        generateCodeSections={generateCodeSections}
        environments={displayData.envs || []}
      />
    )}
    </>
  );
}

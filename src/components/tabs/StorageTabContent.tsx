import { HardDrive, Cloud, Server, Copy, Check, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, FolderOpen } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { connectDuctapeWorkspace } from '@/helpers/ductape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface StorageTabContentProps {
  storage: any;
}

export default function StorageTabContent({ storage }: StorageTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();

  // Initialize SDK using memoized value
  const ductape = useMemo(() => {
    if (!currentWorkspaceId || !user?._id || !user?.auth_token || !user?.public_key) {
      return null;
    }
    return connectDuctapeWorkspace({
      workspace_id: currentWorkspaceId,
      user_id: user._id,
      token: user.auth_token,
      public_key: user.public_key,
    });
  }, [currentWorkspaceId, user?._id, user?.auth_token, user?.public_key]);

  // Fetch storage details from SDK
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['storage', storage?.tag],
    queryFn: async () => {
      if (!ductape || !storage?.tag || !storage?.productTag) {
        return storage;
      }

      const result = await ductape.storage.fetch(storage.productTag, storage.tag);
      return result;
    },
    enabled: !!ductape && !!storage?.tag && !!storage?.productTag,
  });

  const displayData = storageData || storage;

  // Extract product info for header
  const product = storage?.productName && storage?.productTag ? {
    name: storage.productName,
    tag: storage.productTag,
    logo: storage.productLogo,
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

  if (!displayData) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Storage not found</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowCredential = (key: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleViewFiles = (env: any) => {
    openTab({
      id: `storage-explorer-${displayData.tag}-${env.slug}`,
      type: 'storage',
      title: `${displayData.name} (${env.slug})`,
      itemId: `${displayData.tag}-${env.slug}`,
      data: {
        storage: {
          name: displayData.name,
          tag: displayData.tag,
          type: env.type,
          provider: env.type,
          productTag: storage?.productTag,
          productName: storage?.productName,
          productId: storage?.productId,
          env: env,
        },
        isExplorer: true,
      },
    });
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

  // Mask sensitive values
  const maskValue = (value: string) => {
    if (!value) return '';
    return '••••••••••••••••';
  };

  return (
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
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <HardDrive className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Storage Environments */}
        {displayData.envs && displayData.envs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Configurations</h2>
            {displayData.envs.map((env: any, index: number) => {
              const config = env.config || {};
              const providerType = env.type || config.provider || '';
              const isAWS = providerType?.toLowerCase() === 'aws';
              const isAzure = providerType?.toLowerCase() === 'azure';
              const isGCP = providerType?.toLowerCase() === 'gcp';
              const envKey = `${env.slug}-${index}`;

              return (
                <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(providerType)}
                      <h3 className="text-base font-semibold text-grey">{env.slug}</h3>
                      <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getProviderColor(providerType))}>
                        {(providerType || 'Unknown').toUpperCase()}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleViewFiles(env)}
                      className="gap-2"
                      size="sm"
                    >
                      <FolderOpen className="h-4 w-4" />
                      View Files
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* AWS S3 Configuration */}
                  {isAWS && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-grey">Bucket Name</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={config.bucketName || config.bucket || ''}
                              readOnly
                              className="font-mono text-sm"
                            />
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
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-grey">Region</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={config.region || ''}
                              readOnly
                              className="font-mono text-sm"
                            />
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
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-grey">Access Key ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showCredentials[`${envKey}-accessKey`] ? 'text' : 'password'}
                              value={showCredentials[`${envKey}-accessKey`] ? (config.accessKeyId || '') : maskValue(config.accessKeyId)}
                              readOnly
                              className="font-mono text-sm pr-10"
                            />
                            {config.accessKeyId && (
                              <button
                                onClick={() => toggleShowCredential(`${envKey}-accessKey`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                              >
                                {showCredentials[`${envKey}-accessKey`] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(config.accessKeyId || '', `accessKey-${index}`)}
                          >
                            {copiedKey === `accessKey-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-grey">Secret Access Key</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showCredentials[`${envKey}-secretKey`] ? 'text' : 'password'}
                              value={showCredentials[`${envKey}-secretKey`] ? (config.secretAccessKey || '') : maskValue(config.secretAccessKey)}
                              readOnly
                              className="font-mono text-sm pr-10"
                            />
                            {config.secretAccessKey && (
                              <button
                                onClick={() => toggleShowCredential(`${envKey}-secretKey`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                              >
                                {showCredentials[`${envKey}-secretKey`] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(config.secretAccessKey || '', `secretKey-${index}`)}
                          >
                            {copiedKey === `secretKey-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-grey-50 border border-grey-400">
                        <p className="text-xs text-grey-600">
                          <span className="font-semibold">Note:</span> These credentials are sensitive. Keep them secure and never commit them to version control.
                        </p>
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
                            value={config.containerName || ''}
                            readOnly
                            className="font-mono text-sm"
                          />
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
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-grey">Connection String</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showCredentials[`${envKey}-connectionString`] ? 'text' : 'password'}
                              value={showCredentials[`${envKey}-connectionString`] ? (config.connectionString || '') : maskValue(config.connectionString)}
                              readOnly
                              className="font-mono text-sm pr-10"
                            />
                            {config.connectionString && (
                              <button
                                onClick={() => toggleShowCredential(`${envKey}-connectionString`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                              >
                                {showCredentials[`${envKey}-connectionString`] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(config.connectionString || '', `connectionString-${index}`)}
                          >
                            {copiedKey === `connectionString-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-grey-50 border border-grey-400">
                        <p className="text-xs text-grey-600">
                          <span className="font-semibold">Note:</span> This connection string contains sensitive credentials. Keep it secure and never commit it to version control.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* GCP Storage Configuration */}
                  {isGCP && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-grey">Bucket Name</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={config.bucketName || config.config?.bucketName || ''}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(config.bucketName || config.config?.bucketName || '', `gcpBucket-${index}`)}
                            >
                              {copiedKey === `gcpBucket-${index}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-grey">Project ID</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={config.projectId || config.config?.project_id || ''}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(config.projectId || config.config?.project_id || '', `projectId-${index}`)}
                            >
                              {copiedKey === `projectId-${index}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-grey">Client Email</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={config.config?.client_email || ''}
                            readOnly
                            className="font-mono text-sm"
                          />
                          {config.config?.client_email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(config.config?.client_email || '', `clientEmail-${index}`)}
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
                        <Label className="text-sm font-semibold text-grey">Private Key</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showCredentials[`${envKey}-privateKey`] ? 'text' : 'password'}
                              value={showCredentials[`${envKey}-privateKey`] ? (config.config?.private_key || '') : maskValue(config.config?.private_key)}
                              readOnly
                              className="font-mono text-sm pr-10"
                            />
                            {config.config?.private_key && (
                              <button
                                onClick={() => toggleShowCredential(`${envKey}-privateKey`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey"
                              >
                                {showCredentials[`${envKey}-privateKey`] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(config.config?.private_key || '', `privateKey-${index}`)}
                          >
                            {copiedKey === `privateKey-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-grey-50 border border-grey-400">
                        <p className="text-xs text-grey-600">
                          <span className="font-semibold">Note:</span> These service account credentials are sensitive. Keep them secure and never commit them to version control.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {(!displayData.envs || displayData.envs.length === 0) && (
          <div className="bg-white rounded-lg border border-grey-400 p-12 shadow-sm text-center">
            <HardDrive className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-grey mb-2">No Environments Configured</h3>
            <p className="text-sm text-grey-600">
              This storage doesn't have any environment configurations yet.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Storage</h3>
          <p className="text-xs text-blue-800">
            Storage components provide file storage management across different cloud providers (AWS S3, Azure Blob, GCP Cloud Storage). Each environment maintains its own configuration for isolation.
          </p>
        </div>
      </div>
    </div>
  );
}

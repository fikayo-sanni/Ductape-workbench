import { HardDrive, Cloud, Server, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface StorageTabContentProps {
  storage: any;
}

export default function StorageTabContent({ storage }: StorageTabContentProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <HardDrive className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{storage.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{storage.tag}</span></span>
              </div>
              {storage.description && (
                <p className="text-sm text-grey-600">{storage.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Storage Environments */}
        {storage.envs && storage.envs.length > 0 && (
          <div className="space-y-4">
            {storage.envs.map((env: any, index: number) => (
              <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-grey flex items-center gap-2">
                    {getProviderIcon(env.type || env.config?.provider)}
                    Environment: {env.slug}
                  </h2>
                  <span className={cn('px-3 py-1 rounded text-xs font-medium', getProviderColor(env.type || env.config?.provider))}>
                    {(env.type || env.config?.provider || 'Unknown').toUpperCase()}
                  </span>
                </div>

                {/* AWS S3 Configuration */}
                {env.config && (env.type?.toLowerCase() === 'aws' || env.config.provider?.toLowerCase() === 'aws') && (
                  <div className="space-y-3">
                    {env.config.region && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Region</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.region}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.region, `region-${index}`)}
                          >
                            {copiedKey === `region-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {env.config.bucket && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Bucket</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.bucket}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.bucket, `bucket-${index}`)}
                          >
                            {copiedKey === `bucket-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {env.config.accessKeyId && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Access Key ID</Label>
                        <Input
                          value="••••••••••••••••"
                          readOnly
                          className="font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Azure Blob Configuration */}
                {env.config && (env.type?.toLowerCase() === 'azure' || env.config.provider?.toLowerCase() === 'azure') && (
                  <div className="space-y-3">
                    {env.config.accountName && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Account Name</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.accountName}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.accountName, `account-${index}`)}
                          >
                            {copiedKey === `account-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {env.config.containerName && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Container</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.containerName}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.containerName, `container-${index}`)}
                          >
                            {copiedKey === `container-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* GCP Storage Configuration */}
                {env.config && (env.type?.toLowerCase() === 'gcp' || env.config.provider?.toLowerCase() === 'gcp') && (
                  <div className="space-y-3">
                    {env.config.projectId && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Project ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.projectId}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.projectId, `project-${index}`)}
                          >
                            {copiedKey === `project-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {env.config.bucketName && (
                      <div>
                        <Label className="text-sm font-semibold text-grey">Bucket Name</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={env.config.bucketName}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(env.config.bucketName, `gcpbucket-${index}`)}
                          >
                            {copiedKey === `gcpbucket-${index}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!storage.envs || storage.envs.length === 0) && (
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
  );
}

import { HardDrive, Copy, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface StorageComponentContentProps {
  storage: any;
}

export default function StorageComponentContent({ storage }: StorageComponentContentProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      'aws-s3': 'AWS S3',
      'azure-blob': 'Azure Blob Storage',
      'gcp-cloud-storage': 'Google Cloud Storage',
    };
    return labels[provider] || provider;
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'aws-s3': 'bg-orange-500/10 text-orange-500',
      'azure-blob': 'bg-blue-500/10 text-blue-500',
      'gcp-cloud-storage': 'bg-red/10 text-red',
    };
    return colors[provider] || 'bg-grey-400 text-grey-600';
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">{storage.name}</h1>
                <p className="text-sm text-grey-600">{storage.tag}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red hover:text-red">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {storage.description && (
            <p className="text-grey-600 mt-4">{storage.description}</p>
          )}
        </div>

        {/* Provider Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Provider Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-grey-600">Provider</label>
              <div className="mt-1">
                <span className={cn('inline-flex px-3 py-1 rounded-full text-sm font-medium', getProviderColor(storage.provider))}>
                  {getProviderLabel(storage.provider)}
                </span>
              </div>
            </div>

            {storage.bucket && (
              <div>
                <label className="text-sm font-medium text-grey-600">Bucket/Container Name</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {storage.bucket}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(storage.bucket, 'Bucket name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {storage.region && (
              <div>
                <label className="text-sm font-medium text-grey-600">Region</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {storage.region}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(storage.region, 'Region')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credentials Section (if available) */}
        {(storage.access_key || storage.secret_key || storage.connection_string) && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Credentials</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
                className="gap-2"
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? 'Hide' : 'Show'}
              </Button>
            </div>

            <div className="space-y-4">
              {storage.access_key && (
                <div>
                  <label className="text-sm font-medium text-grey-600">Access Key</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                      {showSecrets ? storage.access_key : '•'.repeat(20)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(storage.access_key, 'Access key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {storage.secret_key && (
                <div>
                  <label className="text-sm font-medium text-grey-600">Secret Key</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                      {showSecrets ? storage.secret_key : '•'.repeat(40)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(storage.secret_key, 'Secret key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {storage.connection_string && (
                <div>
                  <label className="text-sm font-medium text-grey-600">Connection String</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm break-all">
                      {showSecrets ? storage.connection_string : '•'.repeat(50)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(storage.connection_string, 'Connection string')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-yellow/5 border border-yellow/20 rounded-lg">
              <p className="text-sm text-grey-600">
                <strong>Security Note:</strong> Keep these credentials secure. Never commit them to version control or share them publicly.
              </p>
            </div>
          </div>
        )}

        {/* Usage Information */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Storage Configuration Active</h3>
          <p className="text-sm text-grey-600">
            This storage configuration is available for use in your application. Configure environment-specific credentials in your deployment settings.
          </p>
        </div>
      </div>
    </div>
  );
}

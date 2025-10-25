import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HardDrive, Save, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import productServicesReal from '@/services/productServicesReal';

interface NewStorageTabContentProps {
  tabId: string;
  data?: any;
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
  gcpProjectId: string;
  gcpPrivateKey: string;
  gcpClientEmail: string;
}

export default function NewStorageTabContent({ tabId, data }: NewStorageTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();

  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || []
  } : null;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
  });

  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);
  const [showEnvs, setShowEnvs] = useState(false);

  // Fetch product data if productId is provided but productEnvs is not
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', currentWorkspaceId, data?.productId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!data?.productId && !data?.productEnvs,
  });

  // Find the specific product from the fetched data (if not already extracted from context)
  const fetchedProduct = productsData?.data?.find((p: any) => p._id === data?.productId);
  const productEnvs = data?.productEnvs || fetchedProduct?.envs || product?.envs || [];

  // Initialize env configs from product environments
  useEffect(() => {
    if (productEnvs && productEnvs.length > 0 && envConfigs.length === 0) {
      setEnvConfigs(
        productEnvs.map((env: any) => ({
          slug: env.slug,
          env_name: env.env_name,
          type: '',
          bucketName: '',
          accessKeyId: '',
          secretAccessKey: '',
          region: 'us-east-1',
          containerName: '',
          connectionString: '',
          gcpBucketName: '',
          gcpProjectId: '',
          gcpPrivateKey: '',
          gcpClientEmail: '',
        }))
      );
    }
  }, [productEnvs]);

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
        if (env.type === 'AWS' && !env.bucketName) {
          toast.error(`Please enter bucket name for ${env.env_name}`);
          return;
        }
        if (env.type === 'Azure' && !env.containerName) {
          toast.error(`Please enter container name for ${env.env_name}`);
          return;
        }
        if (env.type === 'GCP' && !env.gcpBucketName) {
          toast.error(`Please enter bucket name for ${env.env_name}`);
          return;
        }
      }
    }

    if (!data?.productId) {
      toast.error('No product selected');
      return;
    }

    try {
      const newStorage = {
        _id: `storage-${Date.now()}`,
        name: formData.name,
        tag: formData.tag,
        envs: envConfigs
          .filter(env => env.type)
          .map(env => ({
            slug: env.slug,
            type: env.type.toLowerCase(),
            config: env.type === 'AWS' ? {
              bucketName: env.bucketName,
              accessKeyId: env.accessKeyId,
              secretAccessKey: env.secretAccessKey,
              region: env.region,
            } : env.type === 'Azure' ? {
              containerName: env.containerName,
              connectionString: env.connectionString,
            } : {
              bucketName: env.gcpBucketName,
              projectId: env.gcpProjectId,
              privateKey: env.gcpPrivateKey,
              clientEmail: env.gcpClientEmail,
            }
          })),
        product_id: data.productId,
        workspace_id: currentWorkspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      closeTab(tabId);
      openTab({
        id: `storage-${newStorage._id}-${Date.now()}`,
        type: 'storage',
        title: formData.name,
        itemId: newStorage._id,
        data: { ...newStorage, componentType: 'storage', productName: data.productName },
      });

      toast.success('Storage created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create storage');
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    // Auto-generate tag from name
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData(prev => ({ ...prev, name: value, tag: sanitizedTag }));
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

  // Show loading state while fetching product
  if (loadingProducts) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading product data...</p>
        </div>
      </div>
    );
  }

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
                  <h2 className="text-xl font-bold text-grey">Creating storage for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This storage will be automatically connected to your product and configured for its environments
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <HardDrive className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Storage</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure cloud storage for file management'}
              </p>
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
              <Input
                id="tag"
                placeholder="e.g., prod_storage"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">Unique identifier (auto-generated from name)</p>
            </div>

            {!showEnvs && (
              <Button onClick={handleContinue} className="w-full gap-2">
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

              {envConfigs.map((env, index) => (
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
                        <SelectItem value="AWS">AWS S3</SelectItem>
                        <SelectItem value="Azure">Azure Blob Storage</SelectItem>
                        <SelectItem value="GCP">Google Cloud Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AWS Configuration */}
                  {env.type === 'AWS' && (
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
                          <Input
                            id={`secretAccessKey-${index}`}
                            type="password"
                            placeholder="••••••••"
                            value={env.secretAccessKey}
                            onChange={(e) => updateEnvConfig(index, 'secretAccessKey', e.target.value)}
                            className="mt-2 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Azure Configuration */}
                  {env.type === 'Azure' && (
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

                  {/* GCP Configuration */}
                  {env.type === 'GCP' && (
                    <div className="space-y-4 pt-4 border-t border-grey-300">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                      <div>
                        <Label htmlFor={`gcpPrivateKey-${index}`}>Private Key</Label>
                        <Input
                          id={`gcpPrivateKey-${index}`}
                          type="password"
                          placeholder="-----BEGIN PRIVATE KEY-----..."
                          value={env.gcpPrivateKey}
                          onChange={(e) => updateEnvConfig(index, 'gcpPrivateKey', e.target.value)}
                          className="mt-2 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {showEnvs && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Create Storage
              </Button>
            </div>
          )}
        </div>

        {/* Help Text */}
        {showEnvs && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-grey mb-2">Configuration Tips</h3>
            <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
              <li>You can configure different providers for different environments</li>
              <li>Store credentials securely using environment variables in production</li>
              <li>Enable versioning and lifecycle policies on your storage buckets</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

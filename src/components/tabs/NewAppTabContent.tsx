import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grid3x3, Save, Upload, Loader2, Package, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import workspaceServices from '@/services/workspaceServices';
import appServices from '@/services/appServices';
import AppCreatedModal from '@/components/modals/AppCreatedModal';
// Dynamic import for SDK to avoid build issues

interface NewAppTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewAppTabContent({ tabId, data }: NewAppTabContentProps) {
  const { closeTab } = useWorkbenchStore();
  const { currentWorkspaceId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAppCreatedModal, setShowAppCreatedModal] = useState(false);
  const [createdApp, setCreatedApp] = useState<any>(null);
  const [isConnectingToProduct, setIsConnectingToProduct] = useState(false);
  
  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || []
  } : null;

  const [formData, setFormData] = useState({
    app_name: '',
    tag: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
    logo: '',
  });

  // File upload mutation
  const { mutate: uploadLogo, status: uploadingLogo } = useMutation({
    mutationFn: (variables: {
      fileType: string;
      visibility: string;
      id: string;
      file: File;
    }) => workspaceServices.createUploadUrl(variables),
    onMutate: () => {
      toast.loading('Uploading logo...', { id: 'logoUpload' });
    },
    onSuccess: async (data, variables) => {
      const url = data?.data?.url;
      const key = data?.data?.key;
      if (url) {
        try {
          const file = variables.file;
          await workspaceServices.uploadFileToUrl({ url, file });
          setFormData(prev => ({ ...prev, logo: key }));
          toast.success('Logo uploaded successfully', { id: 'logoUpload' });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error('Error uploading file', { id: 'logoUpload' });
        }
      }
    },
    onError: error => {
      console.error('Error creating upload URL:', error);
      toast.error(`Error creating upload URL: ${error}`, { id: 'logoUpload' });
    },
  });

  // Environment configurations with product mapping
  const [environments, setEnvironments] = useState(() => {
    if (product && product.envs && product.envs.length > 0) {
      // Map to product environments
      return product.envs.map((env: any) => ({
        slug: env.slug,
        name: env.env_name || env.name,
        base_url: '',
        enabled: true,
        productEnvId: env._id,
        productEnvSlug: env.slug
      }));
    }
    // Default environments if no product context
    return [
      { slug: 'development', name: 'Development', base_url: '', enabled: true, productEnvId: null, productEnvSlug: null },
      { slug: 'staging', name: 'Staging', base_url: '', enabled: false, productEnvId: null, productEnvSlug: null },
      { slug: 'production', name: 'Production', base_url: '', enabled: true, productEnvId: null, productEnvSlug: null },
    ];
  });

  const handleSave = async () => {
    if (!formData.app_name.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter an app tag');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace selected');
      return;
    }

    // Check if at least one environment is enabled with a base URL
    const enabledEnvs = environments.filter((env: any) => env.enabled && env.base_url.trim());
    if (enabledEnvs.length === 0) {
      toast.error('Please configure at least one environment with a base URL');
      return;
    }

    try {
      setIsConnectingToProduct(true);
      toast.loading('Creating app, updating environments, and connecting to product...', { id: 'appCreation' });

      // Create the app first
      const appResponse = await appServices.createApp({
        workspace_id: currentWorkspaceId,
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        payload: {
          app_name: formData.app_name,
          description: formData.description,
          tag: formData.tag,
          workspace_id: currentWorkspaceId,
          user_id: user?._id || '',
          public_key: user?.public_key || '',
        }
      });

      const newApp = appResponse.data;

      // Initialize Ductape SDK dynamically (optional)
      let ductape = null;
      try {
        // Try to load SDK from CDN or external source
        const sdkModule = await import('@ductape/sdk');
        const Ductape = sdkModule.default || sdkModule;
        ductape = new Ductape({
          workspace_id: currentWorkspaceId || '',
          private_key: user?.public_key || '',
          user_id: user?._id || '',
          env_type: 'production' as any
        });
        console.log('Ductape SDK loaded successfully');
      } catch (sdkError) {
        console.warn('Ductape SDK not available:', sdkError);
        // Continue without SDK - the app will still be created
        ductape = null;
      }

      // Update environment base URLs for each enabled environment using SDK
      const enabledEnvs = environments.filter((env: any) => env.enabled);
      
      if (ductape) {
        for (const env of enabledEnvs) {
          if (env.base_url) {
            try {
              const data = {
                base_url: env.base_url,
              };
              await ductape.app.environments.update(env.slug, data);
              console.log(`Updated ${env.slug} environment base URL:`, env.base_url);
            } catch (error) {
              console.error(`Failed to update ${env.slug} environment:`, error);
              toast.error(`Failed to update ${env.slug} environment base URL`);
            }
          }
        }
      }

      // If we have a product context, connect the app to the product using SDK
      if (product && ductape) {
        try {
          // Initialize product in SDK
          await ductape.product.init(product.tag);

          // Connect app to product
          const appAccess = await ductape.product.apps.connect(newApp.tag);
          
          // Prepare environment mappings for SDK
          const envMappings = enabledEnvs.map((env: any) => ({
            app_env_slug: env.slug,
            product_env_slug: env.productEnvSlug || env.slug,
            variables: [], // Will be configured later
            auth: [] // Will be configured later
          }));

          // Add app to product with environment mappings
          await ductape.product.apps.add({
            access_tag: appAccess.access_tag,
            envs: envMappings
          });

          toast.success('App created and connected to product successfully!', { id: 'appCreation' });
          console.log('App connected to product:', {
            productId: product._id,
            productName: product.name,
            productTag: product.tag,
            appId: newApp._id,
            appTag: newApp.tag,
            environmentMappings: envMappings
          });
        } catch (error) {
          console.error('Failed to connect app to product:', error);
          toast.error('App created but failed to connect to product. You can connect it manually later.');
        }
      } else if (product && !ductape) {
        toast.success('App created successfully! Note: SDK not available, product connection will need to be done manually.', { id: 'appCreation' });
      } else {
        toast.success('App created successfully!', { id: 'appCreation' });
      }

      // Close the new app tab
      closeTab(tabId);

      // Store the created app and show the modal
      setCreatedApp(newApp);
      setShowAppCreatedModal(true);

    } catch (error: any) {
      console.error('App creation error:', error);
      toast.error(error.message || 'Failed to create app', { id: 'appCreation' });
    } finally {
      setIsConnectingToProduct(false);
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const generateTag = () => {
    if (formData.app_name) {
      const tag = formData.app_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData({ ...formData, tag });
    }
  };

  const updateEnvironment = (index: number, field: string, value: any) => {
    setEnvironments((prev: any) => prev.map((env: any, i: number) => 
      i === index ? { ...env, [field]: value } : env
    ));
  };

  const addEnvironment = () => {
    setEnvironments((prev: any) => [...prev, {
      slug: `env-${Date.now()}`,
      name: 'New Environment',
      base_url: '',
      enabled: true
    }]);
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or SVG)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    uploadLogo({
      fileType: file.type,
      visibility: 'public',
      id: currentWorkspaceId || 'app-logo',
      file,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeEnvironment = (index: number) => {
    setEnvironments((prev: any) => prev.filter((_: any, i: number) => i !== index));
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
                  <h2 className="text-xl font-bold text-grey">Creating app for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This app will be automatically connected to your product and mapped to its environments
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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
              <Grid3x3 className="h-6 w-6 text-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New App</h1>
              <p className="text-sm text-grey-600">
                {product ? 'Add a new app to your product' : 'Create a new app in your workspace'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* App Name */}
          <div>
            <Label htmlFor="app_name" className="required">
              App Name
            </Label>
            <Input
              id="app_name"
              placeholder="e.g., GitHub API"
              value={formData.app_name}
              onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
              onBlur={generateTag}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for your app</p>
          </div>

          {/* App Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              App Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., github-api"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
              <Button variant="outline" onClick={generateTag} size="sm">
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              A unique identifier (lowercase, alphanumeric, and hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this app does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Environment URLs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-grey">
                {product ? 'Environment Mapping & URLs' : 'Environment URLs'}
              </Label>
              {!product && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEnvironment}
                  className="gap-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                  Add Environment
                </Button>
              )}
            </div>
            <p className="text-xs text-grey-600 mb-4">
              {product 
                ? 'Map your app environments to product environments and configure base URLs'
                : 'Configure base URLs for different environments'
              }
            </p>
            
            <div className="space-y-3">
              {environments.map((env: any, index: number) => (
                <div key={env.slug} className="p-4 border border-grey-400 rounded-lg bg-grey-50">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={env.enabled}
                      onChange={(e) => updateEnvironment(index, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-grey-400"
                    />
                    <Input
                      placeholder="Environment name"
                      value={env.name}
                      onChange={(e) => updateEnvironment(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    {!product && environments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvironment(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  {/* Product Environment Mapping */}
                  {product && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 rounded border border-primary/20">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-xs text-grey-600">Maps to product environment:</span>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {env.productEnvSlug || env.slug}
                      </span>
                      <ArrowRight className="h-3 w-3 text-grey-400" />
                      <span className="text-xs text-grey-600">App environment:</span>
                      <span className="text-xs font-medium text-grey bg-grey-100 px-2 py-1 rounded">
                        {env.slug}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://api.example.com"
                      value={env.base_url}
                      onChange={(e) => updateEnvironment(index, 'base_url', e.target.value)}
                      className="flex-1"
                      disabled={!env.enabled}
                    />
                    <span className="text-xs text-grey-600 px-2 py-1 bg-white rounded border border-grey-400">
                      {env.slug}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status and Access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' })}
              >
                <SelectTrigger id="status" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo">Logo (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="logo"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleUploadClick}
                disabled={uploadingLogo === 'pending'}
              >
                {uploadingLogo === 'pending' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
            {formData.logo && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={formData.logo}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-lg object-cover border border-grey-400"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-grey-600">Logo preview</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel} disabled={isConnectingToProduct}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isConnectingToProduct}>
                   {isConnectingToProduct ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       {product ? 'Creating, Updating & Connecting...' : 'Creating...'}
                     </>
                   ) : (
                     <>
                       <Save className="h-4 w-4" />
                       {product ? 'Create & Connect App' : 'Create App'}
                     </>
                   )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">
            {product ? 'Product Integration' : 'Environment Configuration'}
          </h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            {product ? (
              <>
                <li>This app will be automatically connected to your product using the Ductape SDK</li>
                <li>App environments are mapped to your product environments for seamless integration</li>
                <li>Configure base URLs for each environment to enable API requests</li>
                <li>After creation, you can configure authentication and variables for each environment</li>
              </>
            ) : (
              <>
                <li>Configure base URLs for different environments (development, staging, production)</li>
                <li>Enable/disable environments as needed for your workflow</li>
                <li>Add custom environments for specific use cases</li>
                <li>Environment URLs will be used when creating API requests</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* App Created Modal */}
      {createdApp && (
        <AppCreatedModal
          open={showAppCreatedModal}
          onOpenChange={setShowAppCreatedModal}
          app={createdApp}
        />
      )}
    </div>
  );
}

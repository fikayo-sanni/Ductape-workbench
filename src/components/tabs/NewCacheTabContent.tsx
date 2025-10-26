import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Save, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface NewCacheTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewCacheTabContent({ tabId, data }: NewCacheTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract product context from data
  const product = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId
  } : null;

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product'
  }) as any;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    expiry: '3600000', // Default: 1 hour in milliseconds
  });

  // Create cache mutation
  const { mutateAsync: createCache, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; tag: string; expiry: number }) => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);
      const cache = await ductape.caches.create({
        name: values.name,
        tag: values.tag,
        expiry: values.expiry,
      });
      return cache;
    },
    onSuccess: (cache) => {
      queryClient.invalidateQueries({ queryKey: ['caches'] });
      closeTab(tabId);
      openTab({
        id: `cache-${cache._id}-${Date.now()}`,
        type: 'cache',
        title: cache.name,
        itemId: cache._id,
        data: { ...cache, componentType: 'cache', productName: product?.name },
      });
      toast.success('Cache created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create cache');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a cache name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a cache tag');
      return;
    }

    const expiryNum = parseInt(formData.expiry);
    if (isNaN(expiryNum) || expiryNum < 1) {
      toast.error('Please enter a valid expiry time (minimum 1ms)');
      return;
    }

    if (!data?.productId || !product) {
      toast.error('No product selected');
      return;
    }

    try {
      await createCache({
        name: formData.name,
        tag: formData.tag,
        expiry: expiryNum,
      });
    } catch (error: any) {
      // Error already handled in mutation
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const handleNameChange = (value: string) => {
    // Auto-generate tag from name
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({ name: value, tag: sanitizedTag, expiry: formData.expiry });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms} milliseconds`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} seconds`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)} minutes`;
    if (ms < 86400000) return `${(ms / 3600000).toFixed(1)} hours`;
    return `${(ms / 86400000).toFixed(1)} days`;
  };


  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Creating cache for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This cache will be automatically connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Cache</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Set up caching to improve application performance'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Cache Name */}
          <div>
            <Label htmlFor="name" className="required">
              Cache Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., API Response Cache"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for this cache configuration</p>
          </div>

          {/* Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., my-product:api-response-cache"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
              <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Format: product-name:cache-name (auto-generated from cache name)
            </p>
          </div>

          {/* Expiry */}
          <div>
            <Label htmlFor="expiry" className="required">
              Expiry Time (milliseconds)
            </Label>
            <Input
              id="expiry"
              type="number"
              min="1"
              placeholder="3600000"
              value={formData.expiry}
              onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
              className="mt-2"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-grey-600">How long cached items should be stored</p>
              {formData.expiry && !isNaN(parseInt(formData.expiry)) && (
                <p className="text-xs text-primary font-medium">
                  ≈ {formatDuration(parseInt(formData.expiry))}
                </p>
              )}
            </div>
          </div>

          {/* Common Presets */}
          <div className="p-4 bg-grey-100 rounded-lg">
            <Label className="text-sm font-medium text-grey mb-3 block">Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, expiry: '60000' })}
                className="text-xs"
              >
                1 minute
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, expiry: '600000' })}
                className="text-xs"
              >
                10 minutes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, expiry: '3600000' })}
                className="text-xs"
              >
                1 hour
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, expiry: '86400000' })}
                className="text-xs"
              >
                1 day
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Cache
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Cache Benefits</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Reduce database load by caching frequently accessed data</li>
            <li>Improve response times for repeated requests</li>
            <li>Lower API costs by minimizing external service calls</li>
            <li>Configure expiry based on how often your data changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

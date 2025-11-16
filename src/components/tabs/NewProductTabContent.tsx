import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Save, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewProductTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewProductTabContent({ tabId }: NewProductTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { currentWorkspaceId } = useAuth();

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      description: '',
      status: 'active' as 'active' | 'inactive',
      logo: '',
    }
  );

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-product',
    formData.name || 'New Product',
    {},
    {
      formData,
    }
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a product tag');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace selected');
      return;
    }

    try {
      // TODO: Implement actual API call to create product
      // const response = await productServices.createProduct({
      //   workspace_id: currentWorkspaceId,
      //   user_id: user?.user_id || '',
      //   public_key: user?.public_key || '',
      //   ...formData,
      // });

      // For now, simulate success
      const newProduct = {
        _id: `product-${Date.now()}`,
        ...formData,
        workspace_id: currentWorkspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Close the new product tab
      closeTab(tabId);

      // Open the newly created product
      openTab({
        id: `product-${newProduct._id}-${Date.now()}`,
        type: 'product',
        title: formData.name,
        itemId: newProduct._id,
        data: newProduct,
      });

      toast.success('Product created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const generateTag = () => {
    if (formData.name) {
      const tag = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData({ ...formData, tag });
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Product</h1>
              <p className="text-sm text-grey-600">Set up a new product in your workspace</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Product Name */}
          <div>
            <Label htmlFor="name" className="required">
              Product Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., My API Service"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData({
                  ...formData,
                  name,
                  // Auto-populate description if it's empty or was previously auto-generated
                  description: !formData.description || formData.description.endsWith(' product')
                    ? `${name} product`
                    : formData.description
                });
              }}
              onBlur={generateTag}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for your product</p>
          </div>

          {/* Product Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Product Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., my-api-service"
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
          <MarkdownEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Describe what this product does..."
            label="Description"
          />

          {/* Status */}
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
            <p className="text-xs text-grey-600 mt-1">Set the initial status of the product</p>
          </div>

          {/* Logo URL */}
          <div>
            <Label htmlFor="logo">Logo URL (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="logo"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
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
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Create Product
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">What's Next?</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>After creating the product, you can add components like storage, cache, and databases</li>
            <li>Configure environments for different deployment stages</li>
            <li>Set up authentication and authorization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

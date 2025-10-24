import { useState } from 'react';
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
import { Grid3x3, Save, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';

interface NewAppTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewAppTabContent({ tabId, data }: NewAppTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { currentWorkspaceId } = useAuth();

  const [formData, setFormData] = useState({
    app_name: '',
    tag: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
    access_tag: 'public' as 'public' | 'private',
    logo: '',
  });

  // Environment configurations
  const [environments, setEnvironments] = useState([
    { slug: 'development', name: 'Development', base_url: '', enabled: true },
    { slug: 'staging', name: 'Staging', base_url: '', enabled: false },
    { slug: 'production', name: 'Production', base_url: '', enabled: true },
  ]);

  const handleSave = async () => {
    if (!formData.app_name.trim()) {
      toast.error('Please enter an app name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter an app tag');
      return;
    }

    if (!data?.productId) {
      toast.error('No product selected');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace selected');
      return;
    }

    // Check if at least one environment is enabled with a base URL
    const enabledEnvs = environments.filter(env => env.enabled && env.base_url.trim());
    if (enabledEnvs.length === 0) {
      toast.error('Please configure at least one environment with a base URL');
      return;
    }

    try {
      // TODO: Implement actual API call to create app
      // const response = await appServices.createApp({
      //   workspace_id: currentWorkspaceId,
      //   product_id: data.productId,
      //   user_id: user?.user_id || '',
      //   public_key: user?.public_key || '',
      //   ...formData,
      // });

      // Filter enabled environments with base URLs
      const enabledEnvs = environments
        .filter(env => env.enabled && env.base_url.trim())
        .map(env => ({
          slug: env.slug,
          env_name: env.name,
          base_url: env.base_url.trim()
        }));

      // For now, simulate success
      const newApp = {
        _id: `app-${Date.now()}`,
        ...formData,
        workspace_id: currentWorkspaceId,
        product_id: data.productId,
        versions: [{
          version: '1.0.0',
          latest: true,
          envs: enabledEnvs
        }],
        actions_count: 0,
        envs_count: enabledEnvs.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Close the new app tab
      closeTab(tabId);

      // Open the newly created app
      openTab({
        id: `app-${newApp._id}-${Date.now()}`,
        type: 'app',
        title: formData.app_name,
        itemId: newApp._id,
        data: newApp,
      });

      toast.success('App created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create app');
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
    setEnvironments(prev => prev.map((env, i) => 
      i === index ? { ...env, [field]: value } : env
    ));
  };

  const addEnvironment = () => {
    setEnvironments(prev => [...prev, {
      slug: `env-${Date.now()}`,
      name: 'New Environment',
      base_url: '',
      enabled: true
    }]);
  };

  const removeEnvironment = (index: number) => {
    setEnvironments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
              <Grid3x3 className="h-6 w-6 text-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New App</h1>
              <p className="text-sm text-grey-600">Add a new app to your product</p>
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
              <Label className="text-sm font-semibold text-grey">Environment URLs</Label>
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
            </div>
            <p className="text-xs text-grey-600 mb-4">Configure base URLs for different environments</p>
            
            <div className="space-y-3">
              {environments.map((env, index) => (
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
                    {environments.length > 1 && (
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

            <div>
              <Label htmlFor="access_tag">Access Level</Label>
              <Select
                value={formData.access_tag}
                onValueChange={(value) => setFormData({ ...formData, access_tag: value as 'public' | 'private' })}
              >
                <SelectTrigger id="access_tag" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              Create App
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Environment Configuration</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Configure base URLs for different environments (development, staging, production)</li>
            <li>Enable/disable environments as needed for your workflow</li>
            <li>Add custom environments for specific use cases</li>
            <li>Environment URLs will be used when creating API requests</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

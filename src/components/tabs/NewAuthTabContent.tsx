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
import { Key, Save, Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface NewAuthTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewAuthTabContent({ tabId, data }: NewAuthTabContentProps) {
  const { closeTab } = useWorkbenchStore();

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
    type: 'api_key' as 'api_key' | 'bearer' | 'basic' | 'oauth2',
    scheme: '',
    in: 'header' as 'header' | 'query' | 'cookie',
    param_name: '',
    // OAuth2 specific fields
    authorization_url: '',
    token_url: '',
    scopes: '',
    // Basic auth fields
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter an auth name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter an auth tag');
      return;
    }

    if (!data?.appId) {
      toast.error('No app selected');
      return;
    }

    try {
      // TODO: Implement actual API call to create auth
      // For now, simulate success
      const newAuth = {
        _id: `auth-${Date.now()}`,
        ...formData,
        app_id: data.appId,
        app_name: data.appName,
        version: data.version,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Close the new auth tab
      closeTab(tabId);

      // Open the newly created auth
      const { openTab } = useWorkbenchStore();
      openTab({
        id: `auth-${newAuth._id}-${Date.now()}`,
        type: 'feature',
        title: formData.name,
        itemId: newAuth._id,
        data: { ...newAuth, componentType: 'auth' },
      });

      toast.success('Auth created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create auth');
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

  const getAuthTypeColor = (type: string) => {
    switch (type) {
      case 'api_key':
        return 'bg-yellow/10 text-yellow';
      case 'bearer':
      case 'oauth2':
        return 'bg-primary/10 text-primary';
      case 'basic':
        return 'bg-green/10 text-green';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-yellow/10 flex items-center justify-center">
              <Key className="h-6 w-6 text-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Auth</h1>
              <p className="text-sm text-grey-600">Add authentication to your app</p>
            </div>
          </div>
        </div>

        {/* App Information */}
        {data?.appId && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <Label className="text-sm font-semibold text-grey flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              App Context
            </Label>
            
            <div className="p-3 bg-grey-100 rounded-lg border border-grey-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green text-sm font-semibold flex-shrink-0">
                  {data.appName || 'App'
                    .split(' ')
                    .map((word: string) => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  }
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-grey truncate">
                    {data.appName || 'Loading App...'}
                  </h4>
                  <p className="text-xs text-grey-600 truncate">
                    {data.appTag || 'loading...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Auth Name */}
          <div>
            <Label htmlFor="name" className="required">
              Auth Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., API Key Authentication"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={generateTag}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for your authentication</p>
          </div>

          {/* Auth Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Auth Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., api-key-auth"
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
              placeholder="Describe this authentication method..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Auth Type */}
          <div>
            <Label htmlFor="type" className="required">Authentication Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as any })}
            >
              <SelectTrigger id="type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getAuthTypeColor('api_key'))}>
                      API Key
                    </span>
                    <span className="text-sm">API Key Authentication</span>
                  </div>
                </SelectItem>
                <SelectItem value="bearer">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getAuthTypeColor('bearer'))}>
                      Bearer
                    </span>
                    <span className="text-sm">Bearer Token Authentication</span>
                  </div>
                </SelectItem>
                <SelectItem value="basic">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getAuthTypeColor('basic'))}>
                      Basic
                    </span>
                    <span className="text-sm">Basic Authentication</span>
                  </div>
                </SelectItem>
                <SelectItem value="oauth2">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getAuthTypeColor('oauth2'))}>
                      OAuth2
                    </span>
                    <span className="text-sm">OAuth 2.0 Authentication</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="in">Location</Label>
            <Select
              value={formData.in}
              onValueChange={(value) => setFormData({ ...formData, in: value as any })}
            >
              <SelectTrigger id="in" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query Parameter</SelectItem>
                <SelectItem value="cookie">Cookie</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-grey-600 mt-1">Where the authentication parameter will be sent</p>
          </div>

          {/* Parameter Name */}
          <div>
            <Label htmlFor="param_name">Parameter Name</Label>
            <Input
              id="param_name"
              placeholder={formData.type === 'api_key' ? 'X-API-Key' : formData.type === 'bearer' ? 'Authorization' : 'username'}
              value={formData.param_name}
              onChange={(e) => setFormData({ ...formData, param_name: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">Name of the parameter (e.g., X-API-Key, Authorization)</p>
          </div>

          {/* OAuth2 specific fields */}
          {formData.type === 'oauth2' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-grey">OAuth 2.0 Configuration</h3>
              
              <div>
                <Label htmlFor="authorization_url">Authorization URL</Label>
                <Input
                  id="authorization_url"
                  placeholder="https://example.com/oauth/authorize"
                  value={formData.authorization_url}
                  onChange={(e) => setFormData({ ...formData, authorization_url: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="token_url">Token URL</Label>
                <Input
                  id="token_url"
                  placeholder="https://example.com/oauth/token"
                  value={formData.token_url}
                  onChange={(e) => setFormData({ ...formData, token_url: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="scopes">Scopes</Label>
                <Input
                  id="scopes"
                  placeholder="read,write,admin"
                  value={formData.scopes}
                  onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-grey-600 mt-1">Comma-separated list of scopes</p>
              </div>
            </div>
          )}

          {/* Basic auth specific fields */}
          {formData.type === 'basic' && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-grey">Basic Authentication</h3>
              
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-grey-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-grey-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Create Auth
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Authentication Types</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li><strong>API Key:</strong> Simple key-value authentication</li>
            <li><strong>Bearer:</strong> Token-based authentication (JWT, etc.)</li>
            <li><strong>Basic:</strong> Username and password authentication</li>
            <li><strong>OAuth 2.0:</strong> Industry-standard authorization protocol</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

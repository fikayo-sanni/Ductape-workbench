import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Key, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { AuthTypes } from '@ductape/sdk/dist/types';

interface NewAuthTabContentProps {
  tabId: string;
  data?: any;
}

interface TokenField {
  id: string;
  key: string;
  sampleValue: string;
  addTo: 'headers' | 'body' | 'params' | 'query';
}

interface AuthBuilderState {
  // Step 1: Basic Info
  authorizationType: 'credential_access' | 'token_access';
  name: string;
  description: string;
  tag: string;

  // Step 2: Credential-specific fields
  action: string;
  expiry: number;
  period: string;

  // Step 3: Token-specific fields
  tokenFields: TokenField[];
}

export default function NewAuthTabContent({ tabId, data }: NewAuthTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [state, setState] = useState<AuthBuilderState>({
    authorizationType: 'credential_access',
    name: '',
    description: '',
    tag: '',
    action: '',
    expiry: 1,
    period: 'hours',
    tokenFields: [{ id: `field_${Date.now()}`, key: '', sampleValue: '', addTo: 'headers' }],
  });

  // Progressive disclosure - show sections as user progresses
  const showStep2 = state.name.trim().length > 0 && state.tag.trim().length > 0;

  // Auto-populate tag when name changes
  useEffect(() => {
    if (state.name) {
      const sanitizedTag = state.name.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
      setState(prev => ({ ...prev, tag: sanitizedTag }));
    }
  }, [state.name]);

  // Auto-populate description when name changes
  useEffect(() => {
    if (state.name && !state.description) {
      const autoDescription = `Authorization using ${state.name}`;
      setState(prev => ({ ...prev, description: autoDescription }));
    }
  }, [state.name, state.description]);

  // Initialize appBuilder
  const appBuilder = useDuctape({
    workspace_id: data?.workspaceId || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app'
  }) as any;

  const handleNameChange = (value: string) => {
    setState(prev => ({ ...prev, name: value }));
  };

  const handleAddTokenField = () => {
    const newField: TokenField = {
      id: `field_${Date.now()}`,
      key: '',
      sampleValue: '',
      addTo: 'headers',
    };
    setState(prev => ({ ...prev, tokenFields: [...prev.tokenFields, newField] }));
  };

  const handleRemoveTokenField = (id: string) => {
    setState(prev => ({
      ...prev,
      tokenFields: prev.tokenFields.filter(f => f.id !== id),
    }));
  };

  const handleUpdateTokenField = (id: string, updates: Partial<TokenField>) => {
    setState(prev => ({
      ...prev,
      tokenFields: prev.tokenFields.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  };

  const { mutateAsync: createAuth, isPending: isCreating } = useMutation({
    mutationFn: async (authSetup: any) => {
      await appBuilder.init(data?.appTag || data?.app?.tag || '');
      return appBuilder.auths.create(authSetup);
    },
    onSuccess: (auth) => {
      closeTab(tabId);
      queryClient.invalidateQueries({ queryKey: ['app', data?.appId] });
      toast.success('Authorization created successfully');
      
      // Open the created auth tab
      openTab({
        id: `auth-${auth._id}-${Date.now()}`,
        type: 'auth',
        title: auth.name,
        itemId: auth._id,
        data: { ...auth, componentType: 'auth', appName: data?.appName },
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create authorization');
    },
  });

  const handleSave = async () => {
    if (!state.name.trim() || !state.tag.trim()) {
      toast.error('Please enter name and tag');
      return;
    }

    if (state.authorizationType === 'credential_access' && !state.action.trim()) {
      toast.error('Please select an action for credential access');
      return;
    }

    if (state.authorizationType === 'token_access') {
      if (!state.tokenFields.some(f => f.key.trim() && f.sampleValue.trim())) {
        toast.error('Please configure at least one token field');
        return;
      }

      // Build tokenConfig object from tokenFields (like authorizations.tsx)
      const tokenConfigObj: Record<string, Record<string, string>> = {
        headers: {},
        body: {},
        params: {},
        query: {},
      };

      state.tokenFields.forEach(item => {
        if (item.key && item.addTo) {
          tokenConfigObj[item.addTo][item.key] = item.sampleValue;
        }
      });

      const tokenSetup = {
        name: state.name,
        tag: state.tag || state.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        setup_type: AuthTypes.TOKEN,
        description: state.description,
        tokens: tokenConfigObj,
      };

      await createAuth(tokenSetup);
    } else {
      const credentialSetup = {
        name: state.name,
        tag: state.tag || state.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        setup_type: AuthTypes.CREDENTIALS,
        description: state.description,
        action_tag: state.action,
        expiry: state.expiry,
        period: state.period,
      };

      await createAuth(credentialSetup);
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* App Context */}
        {data?.appName && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-grey">
                  Create Authorization for {data.appName}
                </h2>
                <p className="text-sm text-grey-600">Add authentication to your app</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Authorization</h1>
              <p className="text-sm text-grey-600">
                {data?.appName ? `Adding to ${data.appName}` : 'Add authentication to your app'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle>Authorization Details</CardTitle>
                <CardDescription>Basic information about your authorization flow</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Authorization Type */}
            <div>
              <Label htmlFor="auth-type" className="required">
                Authorization Type
              </Label>
              <Select
                value={state.authorizationType}
                onValueChange={(value) => {
                  setState(prev => ({
                    ...prev,
                    authorizationType: value as 'credential_access' | 'token_access',
                    action: value === 'token_access' ? '' : prev.action,
                  }));
                }}
              >
                <SelectTrigger className="mt-2" id="auth-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential_access">
                    Credential Access
                  </SelectItem>
                  <SelectItem value="token_access">
                    Token Access
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">
                {state.authorizationType === 'credential_access' 
                  ? 'Uses credentials to access an action and generate tokens'
                  : 'Uses pre-generated tokens for direct access'
                }
              </p>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name" className="required">
                Name of Authorization flow
              </Label>
              <Input
                id="name"
                placeholder="e.g., API Key Authentication"
                value={state.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </div>

            {/* Tag */}
            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  value={state.tag}
                  onChange={(e) =>
                    setState(prev => ({ ...prev, tag: e.target.value }))
                  }
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleNameChange(state.name)}
                  size="sm"
                >
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Auto-generated from name (lowercase, underscores only)
              </p>
            </div>

            {/* Description */}
            <div>
              <MarkdownEditor
                value={state.description}
                onChange={(value) => setState(prev => ({ ...prev, description: value }))}
                placeholder="Describe this authorization method..."
                label="Description"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Configuration based on type */}
        {showStep2 && state.authorizationType === 'credential_access' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Credential Configuration</CardTitle>
                  <CardDescription>Configure credential access settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action */}
              <div>
                <Label htmlFor="action" className="required">
                  Select Action
                </Label>
                <Select
                  value={state.action}
                  onValueChange={(value) =>
                    setState(prev => ({ ...prev, action: value }))
                  }
                >
                  <SelectTrigger className="mt-2" id="action">
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.actions?.map((action: any) => (
                      <SelectItem key={action._id} value={action.tag}>
                        {action.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry and Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    type="number"
                    min={0}
                    placeholder="1"
                    value={state.expiry}
                    onChange={(e) =>
                      setState(prev => ({ ...prev, expiry: parseInt(e.target.value) || 0 }))
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={state.period}
                    onValueChange={(value) =>
                      setState(prev => ({ ...prev, period: value }))
                    }
                  >
                    <SelectTrigger className="mt-2" id="period">
                      <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Token Configuration */}
        {showStep2 && state.authorizationType === 'token_access' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Token Configuration</CardTitle>
                  <CardDescription>Configure token access settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Token Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTokenField}
                  className="gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Token Field
                </Button>
              </div>

              {state.tokenFields.map((field) => (
                <div key={field.id} className="flex gap-2 items-end p-3 bg-grey-50 rounded-lg border border-grey-400">
                  <div className="flex-1">
                    <Label>Key</Label>
                    <Input
                      placeholder="e.g., Authorization"
                      value={field.key}
                      onChange={(e) =>
                        handleUpdateTokenField(field.id, { key: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="flex-1">
                    <Label>Sample Value</Label>
                    <Input
                      placeholder="e.g., Bearer <token>"
                      value={field.sampleValue}
                      onChange={(e) =>
                        handleUpdateTokenField(field.id, { sampleValue: e.target.value })
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="flex-1">
                    <Label>Add To</Label>
                    <Select
                      value={field.addTo}
                      onValueChange={(value) =>
                        handleUpdateTokenField(field.id, { addTo: value as 'headers' | 'body' | 'params' | 'query' })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="headers">Headers</SelectItem>
                        <SelectItem value="body">Body</SelectItem>
                        <SelectItem value="params">Params</SelectItem>
                        <SelectItem value="query">Query</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveTokenField(field.id)}
                    disabled={state.tokenFields.length === 1}
                    className="mb-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <p className="text-xs text-grey-600 mt-2">
                The query, body, params and header fields allow ductape to know what part of requests to append the authorization tokens to.{' '}
                <a
                  href="https://docs.ductape.app/apps/authentication#token-based-authentication"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-bold hover:underline"
                >
                  Learn more
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
          <Button
            type="button"
            variant="outline"
            onClick={() => closeTab(tabId)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isCreating || !showStep2}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Authorization
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

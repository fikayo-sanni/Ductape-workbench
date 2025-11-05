import { useState, useEffect, useMemo } from 'react';
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
import { Heart, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productServices from '@/services/productServices';

interface NewHealthcheckTabContentProps {
  data?: any;
  tabId?: string;
}

export default function NewHealthcheckTabContent({ data, tabId }: NewHealthcheckTabContentProps) {
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
    workspace_id: data.workspaceId || currentWorkspaceId,
    apps: data.productApps || [],
  } : null;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
    interval: '60', // Default: 60 seconds
    retries: 1,
    type: 'app', // Only App for now
    selectedApp: '',
  });
  const [selectedAction, setSelectedAction] = useState('');
  const [actionInputs, setActionInputs] = useState<any>({});

  // Fetch connected apps
  const { data: productAppsRes } = useQuery({
    queryKey: ['product-apps', product?._id],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: product?._id || '',
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId && !!product?._id,
  });

  const connectedApps = productAppsRes?.data || [];

  // Initialize Ductape SDK for product
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  // Fetch app details when app is selected
  /*const selectedAppData = useMemo(() => {
    return connectedApps.find((app: any) => app.tag === formData.selectedApp);
  }, [formData.selectedApp, connectedApps]);*/

  // Initialize SDK for the selected app
  const appDuctape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  // Fetch app actions when app is selected
  const { data: appActions } = useQuery({
    queryKey: ['app-actions', formData.selectedApp],
    queryFn: async () => {
      if (!formData.selectedApp || !appDuctape) return null;
      await appDuctape.init(formData.selectedApp);
      const apps = await appDuctape.apps.fetch();
      const app = apps.find((a: any) => a.tag === formData.selectedApp);
      return app?.versions?.[0]?.actions || [];
    },
    enabled: !!formData.selectedApp && !!appDuctape,
  });

  const actions = appActions || [];

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const sanitized = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, tag: sanitized }));
    }
  }, [formData.name]);

  const handleAutoGenerateTag = () => {
    if (!formData.name) {
      toast.error('Please enter a name first');
      return;
    }
    const sanitized = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, tag: sanitized }));
  };

  const handleIntervalPreset = (seconds: number) => {
    setFormData(prev => ({ ...prev, interval: seconds.toString() }));
  };

  const selectedActionData = useMemo(() => {
    return actions.find((action: any) => action.tag === selectedAction);
  }, [selectedAction, actions]);

  // When an action is selected, extract its input fields
  useEffect(() => {
    if (selectedActionData) {
      const inputs: any = {};
      
      // Extract fields from params, body, query, headers
      ['params', 'body', 'query', 'headers'].forEach((type) => {
        if (selectedActionData[type] && Array.isArray(selectedActionData[type])) {
          inputs[type] = {};
          selectedActionData[type].forEach((field: any) => {
            if (field.key) {
              inputs[type][field.key] = '';
            }
          });
        }
      });

      setActionInputs(inputs);
    }
  }, [selectedActionData]);

  const { mutateAsync: createHealthcheck, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');
      if (!formData.selectedApp) throw new Error('Please select a connected app');
      if (!selectedAction) throw new Error('Please select an action');

      await ductape.init(product.tag);

      // Build the inputs object from actionInputs
      const inputs: any = {};
      Object.keys(actionInputs).forEach(type => {
        if (Object.keys(actionInputs[type]).length > 0) {
          inputs[type] = actionInputs[type];
        }
      });

      const payload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        app: formData.selectedApp,
        event: selectedAction,
        interval: parseInt(formData.interval) * 1000, // Convert seconds to milliseconds
        retries: formData.retries,
        envs: product.envs.map((env: any) => ({
          slug: env.slug,
          inputs,
        })),
      };

      const healthcheck = await ductape.apps.health.create(payload);
      return healthcheck;
    },
    onSuccess: (healthcheck) => {
      queryClient.invalidateQueries({ queryKey: ['product-apps', product?._id] });
      closeTab(tabId || '');
      openTab({
        id: `healthcheck-${healthcheck._id}-${Date.now()}`,
        type: 'healthcheck',
        title: healthcheck.name,
        itemId: healthcheck._id,
        data: { ...healthcheck, componentType: 'healthcheck', productName: product?.name },
      });
      toast.success('Health check created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create health check');
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!formData.tag.trim()) {
      toast.error('Please enter a tag');
      return;
    }
    if (!formData.interval || parseInt(formData.interval) < 1) {
      toast.error('Please enter a valid interval (minimum 1 second)');
      return;
    }
    if (!formData.selectedApp) {
      toast.error('Please select a connected app');
      return;
    }
    if (!selectedAction) {
      toast.error('Please select an action');
      return;
    }
    
    createHealthcheck();
  };

  const isFormComplete = formData.name.trim() !== '' && formData.tag.trim() !== '' && 
                         formData.interval && parseInt(formData.interval) >= 1 &&
                         formData.selectedApp !== '' && selectedAction !== '';

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Product Context */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-grey">
                  Create Health Check for {product.name}
                </h2>
                <p className="text-sm text-grey-600">Monitor the health of your endpoints</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Health Check</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Monitoring ${product.name}` : 'Set up health monitoring for your endpoints'}
              </p>
            </div>
          </div>
        </div>

        {/* Form - Single Page Progressive Disclosure */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green" />
              <h2 className="text-lg font-semibold text-grey">1. Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="required">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., API Health Check"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      // Auto-populate description if it's empty or was previously auto-generated
                      description: !formData.description || formData.description.endsWith(' healthcheck')
                        ? `${name} healthcheck`
                        : formData.description
                    });
                  }}
                  className="mt-2"
                  autoFocus
                />
                <p className="text-xs text-grey-600 mt-1">
                  A descriptive name for this health check
                </p>
              </div>

              <div>
                <Label htmlFor="tag" className="required">
                  Tag
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="tag"
                    placeholder="e.g., api-health-check"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoGenerateTag}
                    size="sm"
                  >
                    Auto-generate
                  </Button>
                </div>
                <p className="text-xs text-grey-600 mt-1">
                  A unique identifier for this health check
                </p>
              </div>

              <div>
                <MarkdownEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Describe this health check..."
                  label="Description"
                />
              </div>

              <div>
                <Label htmlFor="interval" className="required">
                  Check Interval (seconds)
                </Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  placeholder="60"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-grey-600 mt-1">
                  How often to perform the health check (in seconds)
                </p>
              </div>

              {/* Quick Presets */}
              <div className="p-4 bg-grey-100 rounded-lg">
                <Label className="text-sm font-medium text-grey mb-3 block">Quick Presets</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(30)}
                    className="text-xs"
                  >
                    30 seconds
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(60)}
                    className="text-xs"
                  >
                    1 minute
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(300)}
                    className="text-xs"
                  >
                    5 minutes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(600)}
                    className="text-xs"
                  >
                    10 minutes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(1800)}
                    className="text-xs"
                  >
                    30 minutes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleIntervalPreset(3600)}
                    className="text-xs"
                  >
                    1 hour
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="retries">
                  Retries
                </Label>
                <Input
                  id="retries"
                  type="number"
                  min={0}
                  max={10}
                  placeholder="Number of retries"
                  value={formData.retries}
                  onChange={(e) => setFormData({ ...formData, retries: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
                <p className="text-xs text-grey-600 mt-1">
                  Number of times to retry before marking as unhealthy
                </p>
              </div>

              <div>
                <Label htmlFor="type">
                  Health Check Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">App</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-600 mt-1">
                  Type of health check to perform
                </p>
              </div>
            </div>
          </div>

          {/* App Selection Section */}
          <div className="border-t border-grey-400 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green" />
              <h2 className="text-lg font-semibold text-grey">2. App and Action Selection</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="app" className="required">
                  Connected App
                </Label>
                <Select
                  value={formData.selectedApp}
                  onValueChange={(value) => {
                    setFormData({ ...formData, selectedApp: value });
                    setSelectedAction(''); // Reset action when app changes
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a connected app" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedApps.map((app: any) => (
                      <SelectItem key={app._id} value={app.tag}>
                        {app.app_name} ({app.tag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-600 mt-1">
                  Select the app to monitor with this health check
                </p>
              </div>

              {formData.selectedApp && (
                <div>
                  <Label htmlFor="action" className="required">
                    Action
                  </Label>
                  <Select
                    value={selectedAction}
                    onValueChange={setSelectedAction}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action: any) => (
                        <SelectItem key={action.tag} value={action.tag}>
                          {action.name || action.tag} ({action.method})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-600 mt-1">
                    Select the action to run for health checks
                  </p>
                </div>
              )}

              {selectedAction && selectedActionData && (
                <div className="space-y-4 border-t border-grey-400 pt-4">
                  <Label className="text-sm font-semibold text-grey mb-3 block">
                    3. Action Input Fields
                  </Label>
                  
                  {/* Render fields from params, body, query, headers */}
                  {['params', 'body', 'query', 'headers'].map((type) => {
                    const fields = selectedActionData[type] || [];
                    if (!fields.length) return null;

                    return (
                      <div key={type} className="space-y-3">
                        <Label className="text-xs font-medium text-grey-600 uppercase">
                          {type}
                        </Label>
                        {fields.map((field: any, idx: number) => (
                          <div key={idx}>
                            <Label htmlFor={`${type}-${field.key}`}>
                              {field.key} {field.required && <span className="text-red">*</span>}
                            </Label>
                            <Input
                              id={`${type}-${field.key}`}
                              placeholder={field.description || `Enter ${field.key}`}
                              value={actionInputs[type]?.[field.key] || ''}
                              onChange={(e) => {
                                setActionInputs((prev: any) => ({
                                  ...prev,
                                  [type]: {
                                    ...prev[type],
                                    [field.key]: e.target.value,
                                  },
                                }));
                              }}
                              className="mt-1"
                            />
                            {field.description && (
                              <p className="text-xs text-grey-600 mt-1">{field.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeTab(tabId || '')}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!isFormComplete || isCreating}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Health Check
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

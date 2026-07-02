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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productServices from '@/services/productServices';
import appServices from '@/services/appServices';
import { reconstructActionPayload } from '@/utils/payloadReconstruction';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';
import { SearchableActionPicker } from '@/components/workflow-builder';

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

  // Restore saved state
  const savedTabState = getInitialTabState(tabId || '', null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      description: '',
      interval: '60', // Default: 60 seconds
      retries: 1,
      type: 'app', // Default type
      selectedApp: '',
      selectedDatabase: '',
      selectedMessageBroker: '',
      selectedWorkflow: '',
    }
  );
  const [selectedAction, setSelectedAction] = useState(savedTabState?.selectedAction || '');
  const [actionInputsByEnv, setActionInputsByEnv] = useState<Record<string, any>>(
    savedTabState?.actionInputsByEnv || {}
  );
  const [actionSearchTerm, setActionSearchTerm] = useState(savedTabState?.actionSearchTerm || '');
  const [selectedEnv, setSelectedEnv] = useState<string>(savedTabState?.selectedEnv || ''); // Track which env is being configured

  // Persist tab state automatically
  useTabState(
    tabId || '',
    'new-healthcheck',
    formData.name || 'New Health Check',
    {},
    { formData, selectedAction, actionInputsByEnv, actionSearchTerm, selectedEnv }
  );

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

  // Fetch full product details for databases, message_brokers
  const { data: productDetailsRes } = useQuery({
    queryKey: ['product-details', product?._id],
    queryFn: () =>
      productServices.fetchProduct({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: product?._id || '',
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId && !!product?._id,
  });

  const connectedApps = productAppsRes?.data || [];
  const productDetails = productDetailsRes?.data;
  const databases = productDetails?.databases || [];
  const messageBrokers = productDetails?.messageBrokers || [];
  const workflows = productDetails?.workflows || [];

  // Initialize Ductape SDK for product
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  // Get the selected app details from connected apps
  const selectedAppData = useMemo(() => {
    return connectedApps.find((app: any) => app.tag === formData.selectedApp);
  }, [formData.selectedApp, connectedApps]);

  // Fetch app actions when app is selected
  const { data: appActionsRes } = useQuery({
    queryKey: ['app-actions', selectedAppData?.app_id],
    queryFn: () => {
      if (!selectedAppData?.app_id) {
        throw new Error('App ID is required');
      }
      return appServices.fetchAppComponents({
        app_id: selectedAppData.app_id,
        component_type: 'action',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      });
    },
    enabled: !!selectedAppData?.app_id && !!user?._id && !!user?.public_key,
  });

  const actions = appActionsRes?.data || [];

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const sanitized = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
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
    setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
  };

  const handleIntervalPreset = (seconds: number) => {
    setFormData((prev: typeof formData) => ({ ...prev, interval: seconds.toString() }));
  };

  const selectedActionData = useMemo(() => {
    return actions.find((action: any) => action.tag === selectedAction);
  }, [selectedAction, actions]);

  // Reset search term when app changes
  useEffect(() => {
    setActionSearchTerm('');
  }, [formData.selectedApp]);

  // When an action is selected, extract its input fields for all environments
  useEffect(() => {
    if (selectedActionData && product?.envs) {
      const inputsByEnv: Record<string, any> = {};

      // Initialize inputs for each environment
      product.envs.forEach((env: any) => {
        const inputs: any = {};

        // Extract fields from params, body, query, headers
        // Handle both direct array and { data: [] } structure
        ['params', 'body', 'query', 'headers'].forEach((type) => {
          const fieldData = selectedActionData[type];
          const allFields = Array.isArray(fieldData) ? fieldData : fieldData?.data || [];

          // Filter out array and object type fields
          const fields = allFields.filter((field: any) => {
            const fieldType = field.type?.toLowerCase() || '';
            return fieldType !== 'array' &&
                   !fieldType.startsWith('array') &&
                   fieldType !== 'object';
          });

          if (fields.length > 0) {
            inputs[type] = {};
            fields.forEach((field: any) => {
              if (field.key) {
                inputs[type][field.key] = field.default || '';
              }
            });
          }
        });

        inputsByEnv[env.slug] = inputs;
      });

      setActionInputsByEnv(inputsByEnv);

      // Set first environment as selected by default
      if (product.envs.length > 0 && !selectedEnv) {
        setSelectedEnv(product.envs[0].slug);
      }
    }
  }, [selectedActionData, product?.envs]);

  const { mutateAsync: createHealthcheck, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);

      const basePayload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        interval: parseInt(formData.interval) * 1000, // Convert seconds to milliseconds
        retries: formData.retries,
        type: formData.type,
      };

      let payload: any = { ...basePayload };

      // Build type-specific payload
      if (formData.type === 'app') {
        if (!formData.selectedApp) throw new Error('Please select a connected app');
        if (!selectedAction) throw new Error('Please select an action');

        // Build envs array with per-environment inputs
        const envs = product.envs.map((env: any) => {
          const envInputs = actionInputsByEnv[env.slug] || {};

          // Reconstruct the full payload using sample data from selectedActionData
          // This merges simple user inputs with complex structures (arrays/objects) from samples
          const reconstructedInputs = reconstructActionPayload(
            {
              params: selectedActionData?.params,
              body: selectedActionData?.body,
              query: selectedActionData?.query,
              headers: selectedActionData?.headers,
            },
            envInputs
          );

          return {
            slug: env.slug,
            inputs: reconstructedInputs,
          };
        });

        payload = {
          ...basePayload,
          app: formData.selectedApp,
          event: selectedAction,
          envs,
        };
      } else if (formData.type === 'database') {
        if (!formData.selectedDatabase) throw new Error('Please select a database');
        payload.database = formData.selectedDatabase;
      } else if (formData.type === 'message_broker') {
        if (!formData.selectedMessageBroker) throw new Error('Please select a message broker');
        payload.message_broker = formData.selectedMessageBroker;
      } else if (formData.type === 'workflow') {
        if (!formData.selectedWorkflow) throw new Error('Please select a workflow');
        payload.workflow = formData.selectedWorkflow;
      }

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

    // Type-specific validation
    if (formData.type === 'app') {
      if (!formData.selectedApp) {
        toast.error('Please select a connected app');
        return;
      }
      if (!selectedAction) {
        toast.error('Please select an action');
        return;
      }
    } else if (formData.type === 'database') {
      if (!formData.selectedDatabase) {
        toast.error('Please select a database');
        return;
      }
    } else if (formData.type === 'message_broker') {
      if (!formData.selectedMessageBroker) {
        toast.error('Please select a message broker');
        return;
      }
    } else if (formData.type === 'workflow') {
      if (!formData.selectedWorkflow) {
        toast.error('Please select a workflow');
        return;
      }
    }

    createHealthcheck();
  };

  const isFormComplete = useMemo(() => {
    const baseComplete = formData.name.trim() !== '' &&
                        formData.tag.trim() !== '' &&
                        formData.interval &&
                        parseInt(formData.interval) >= 1;

    if (!baseComplete) return false;

    // Check type-specific requirements
    if (formData.type === 'app') {
      return formData.selectedApp !== '' && selectedAction !== '';
    } else if (formData.type === 'database') {
      return formData.selectedDatabase !== '';
    } else if (formData.type === 'message_broker') {
      return formData.selectedMessageBroker !== '';
    } else if (formData.type === 'workflow') {
      return formData.selectedWorkflow !== '';
    }

    return false;
  }, [formData, selectedAction]);

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
                     <SelectItem value="database">Database</SelectItem>
                     <SelectItem value="message_broker">Messaging</SelectItem>
                     <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-600 mt-1">
                  Type of health check to perform
                </p>
              </div>
            </div>
          </div>

          {/* Resource Selection Section */}
          <div className="border-t border-grey-400 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green" />
              <h2 className="text-lg font-semibold text-grey">2. Resource Selection</h2>
            </div>

            <div className="space-y-4">
              {/* App Selection (for type: app) */}
              {formData.type === 'app' && (
                <>
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
                          <SelectItem key={app.app_id} value={app.tag}>
                            {app.app_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-grey-600 mt-1">
                      Select the app to monitor with this health check
                    </p>
                  </div>

                  {formData.selectedApp && (
                    <SearchableActionPicker
                      actions={actions}
                      selectedTag={selectedAction}
                      onSelect={(action) => setSelectedAction(action.tag)}
                    />
                  )}

              {selectedAction && selectedActionData && (
                <div className="space-y-6 border-t border-grey-400 pt-6 mt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green" />
                    <h3 className="text-base font-semibold text-grey">3. Configure Action Inputs</h3>
                  </div>

                  {/* Show action details */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-grey mb-1">
                          {selectedActionData.name || selectedActionData.tag}
                        </h4>
                        {selectedActionData.description && (
                          <p className="text-xs text-grey-600">{selectedActionData.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {selectedActionData.method && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
                              {selectedActionData.method}
                            </span>
                          )}
                          {selectedActionData.resource && (
                            <code className="text-xs bg-grey-100 px-2 py-0.5 rounded text-grey-600">
                              {selectedActionData.resource}
                            </code>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Environment Tabs */}
                  {product?.envs && product.envs.length > 0 && (
                    <div className="bg-grey-50 border border-grey-400 rounded-lg p-4">
                      <p className="text-xs text-grey-600 mb-3">
                        Configure inputs for each environment. Different environments can have different values.
                      </p>
                      <Tabs value={selectedEnv} onValueChange={setSelectedEnv}>
                        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${product.envs.length}, 1fr)` }}>
                          {product.envs.map((env: any) => (
                            <TabsTrigger key={env.slug} value={env.slug}>
                              {env.env_name || env.slug}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {product.envs.map((env: any) => (
                          <TabsContent key={env.slug} value={env.slug} className="mt-4 space-y-4">
                            {/* Render fields from params, query, headers, body for this environment */}
                            {['params', 'query', 'headers', 'body'].map((type) => {
                              const fieldData = selectedActionData[type];
                              const allFields = Array.isArray(fieldData) ? fieldData : fieldData?.data || [];

                              // Filter out array and object type fields
                              const fields = allFields.filter((field: any) => {
                                const fieldType = field.type?.toLowerCase() || '';
                                return fieldType !== 'array' &&
                                       !fieldType.startsWith('array') &&
                                       fieldType !== 'object';
                              });

                              if (!fields.length) return null;

                              return (
                                <div key={type} className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                                  <div className="bg-grey-100 px-4 py-3 border-b border-grey-400">
                                    <Label className="text-sm font-semibold text-grey uppercase">
                                      {type === 'params' ? 'Path Parameters' :
                                       type === 'query' ? 'Query Parameters' :
                                       type === 'headers' ? 'Headers' :
                                       'Request Body'}
                                    </Label>
                                  </div>
                                  <div className="p-4 space-y-4">
                                    {fields.map((field: any, idx: number) => (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor={`${env.slug}-${type}-${field.key}`} className="text-sm font-medium text-grey">
                                            {field.key}
                                            {field.required && <span className="text-red ml-1">*</span>}
                                          </Label>
                                          {field.type && (
                                            <span className="text-xs px-2 py-0.5 bg-blue/10 text-blue rounded">
                                              {field.type}
                                            </span>
                                          )}
                                        </div>

                                        <Input
                                          id={`${env.slug}-${type}-${field.key}`}
                                          placeholder={field.default || field.description || `Enter ${field.key}`}
                                          value={actionInputsByEnv[env.slug]?.[type]?.[field.key] || ''}
                                          onChange={(e) => {
                                            setActionInputsByEnv((prev: any) => ({
                                              ...prev,
                                              [env.slug]: {
                                                ...prev[env.slug],
                                                [type]: {
                                                  ...prev[env.slug]?.[type],
                                                  [field.key]: e.target.value,
                                                },
                                              },
                                            }));
                                          }}
                                          className="h-9"
                                        />

                                        {field.description && (
                                          <p className="text-xs text-grey-600">{field.description}</p>
                                        )}
                                        
                                          <p className="text-xs text-grey-500">
                                            {`Min: ${field.minLength}`}
                                            {' • '}
                                            {`Max: ${field.maxLength}`}
                                          </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Show note if no inputs required */}
                            {!['params', 'query', 'headers', 'body'].some(type => {
                              const fieldData = selectedActionData[type];
                              const allFields = Array.isArray(fieldData) ? fieldData : fieldData?.data || [];

                              // Filter out array and object type fields
                              const fields = allFields.filter((field: any) => {
                                const fieldType = field.type?.toLowerCase() || '';
                                return fieldType !== 'array' &&
                                       !fieldType.startsWith('array') &&
                                       fieldType !== 'object';
                              });

                              return fields.length > 0;
                            }) && (
                              <div className="text-center py-6 bg-grey-100 rounded-lg border border-grey-400">
                                <p className="text-sm text-grey-600">This action doesn't require any simple input parameters (arrays and objects not supported)</p>
                              </div>
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  )}
                </div>
              )}
                </>
              )}

              {/* Database Selection (for type: database) */}
              {formData.type === 'database' && (
                <div>
                  <Label htmlFor="database" className="required">
                    Database
                  </Label>
                  <Select
                    value={formData.selectedDatabase}
                    onValueChange={(value) => setFormData({ ...formData, selectedDatabase: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a database" />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db: any) => (
                        <SelectItem key={db._id || db.tag} value={db.tag}>
                          {db.name || db.tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-600 mt-1">
                    Select the database to monitor with this health check
                  </p>
                </div>
              )}

              {/* Messaging Selection (for type: message_broker) */}
              {formData.type === 'message_broker' && (
                <div>
                  <Label htmlFor="messageBroker" className="required">
                    Messaging
                  </Label>
                  <Select
                    value={formData.selectedMessageBroker}
                    onValueChange={(value) => setFormData({ ...formData, selectedMessageBroker: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select messaging" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageBrokers.map((broker: any) => (
                        <SelectItem key={broker._id || broker.tag} value={broker.tag}>
                          {broker.name || broker.tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-600 mt-1">
                    Select the messaging to monitor with this health check
                  </p>
                </div>
              )}

              {formData.type === 'workflow' && (
                <div>
                  <Label htmlFor="workflow" className="required">
                    Workflow probe
                  </Label>
                  <Select
                    value={formData.selectedWorkflow}
                    onValueChange={(value) => setFormData({ ...formData, selectedWorkflow: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No workflows on this product
                        </SelectItem>
                      ) : (
                        workflows.map((wf: any) => (
                          <SelectItem key={wf.tag} value={wf.tag}>
                            {wf.name || wf.tag}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-grey-600 mt-1">
                    Executes the workflow on each interval and checks completion status
                  </p>
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

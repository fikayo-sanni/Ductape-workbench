/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timer, Save, CheckCircle, Plus, Trash2, Edit2, Database, Zap, Bell, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { StepEventTypes, IStepInput } from '@/components/feature-builder/types';
import appServicesReal from '@/services/appServicesReal';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewQuotaTabContentProps {
  tabId: string;
  data?: any;
}

interface QuotaOption {
  id: string;
  type: StepEventTypes;
  app?: string;
  event: string;
  quota: number;
  input: Record<string, any>;
  output: Record<string, any>;
  retries: number;
  healthcheck?: string;
  name: string;
  tag: string;
  category?: string;
  action?: any;
  database?: string;
}

interface QuotaBuilderState {
  // Step 1: Basic Info
  name: string;
  description: string;
  tag: string;

  // Step 2: Quota Inputs
  quotaInputs: Record<string, IStepInput>;

  // Step 3: Shared Output Schema (same for all options)
  sharedOutputSchema: Record<string, string>;

  // Step 4: Selected Options
  selectedOptions: QuotaOption[];

  // Step 5: Option Inputs Mapping
  optionInputs: Record<string, Record<string, any>>;

  // Step 6: Option Outputs Mapping (must match shared schema)
  optionOutputs: Record<string, Record<string, any>>;
}

const INITIAL_STATE: QuotaBuilderState = {
  name: '',
  description: '',
  tag: '',
  quotaInputs: {},
  sharedOutputSchema: {},
  selectedOptions: [],
  optionInputs: {},
  optionOutputs: {},
};

export default function NewQuotaTabContent({ tabId, data }: NewQuotaTabContentProps) {
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
    databases: data.productDatabases || [],
    caches: data.productCaches || [],
    storages: data.productStorages || [],
    notifications: data.productNotifications || [],
  } : null;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [state, setState] = useState<QuotaBuilderState>(savedTabState?.state || INITIAL_STATE);
  const [editingInputKey, setEditingInputKey] = useState<string | null>(savedTabState?.editingInputKey || null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(savedTabState?.editingOptionId || null);
  const [selectedComponentType, setSelectedComponentType] = useState<string>(savedTabState?.selectedComponentType || '');

  // For action/database selection
  const [selectedApp, setSelectedApp] = useState<any>(savedTabState?.selectedApp || null);
  const [selectedDatabase, setSelectedDatabase] = useState<any>(savedTabState?.selectedDatabase || null);
  const [actionSearchTerm, setActionSearchTerm] = useState(savedTabState?.actionSearchTerm || '');
  const [databaseActionType, setDatabaseActionType] = useState<string>(savedTabState?.databaseActionType || '');

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-quota',
    state.name || 'New Quota',
    {},
    { state, editingInputKey, editingOptionId, selectedComponentType, selectedApp, selectedDatabase, actionSearchTerm, databaseActionType }
  );

  const proxy = useResilienceProxy();

  // Progressive disclosure - defined early to be available for useQuery hooks
  const showStep2 = state.name.trim().length > 0 && state.description.trim().length > 0;
  const showStep3 = Object.keys(state.quotaInputs).length > 0;
  const showStep4 = Object.keys(state.sharedOutputSchema).length > 0;
  const showStep5 = state.selectedOptions.length > 0;
  const showStep6 = state.selectedOptions.length > 0 && editingOptionId;

  // Fetch available apps with their actions
  const { data: availableApps = [] } = useQuery({
    queryKey: ['apps', currentWorkspaceId],
    queryFn: async () => {
      const response = await appServicesReal.fetchWorkspaceApps({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      });
      return response.data || [];
    },
    enabled: !!currentWorkspaceId && showStep4,
  });

  // Fetch app details when an app is selected
  const { data: selectedAppData } = useQuery({
    queryKey: ['app', selectedApp?.app_id],
    queryFn: async () => {
      if (!selectedApp?.app_id) return null;
      const response = await appServicesReal.fetchApp({
        app_id: selectedApp.app_id,
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      });
      return response.data;
    },
    enabled: !!selectedApp?.app_id,
  });

  const handleNameChange = (value: string) => {
    const tag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);

    setState(prev => ({
      ...prev,
      name: value,
      tag: tag,
      description: prev.description || `${value} quota`,
    }));
  };

  // Add/Edit Quota Input
  const [newInputName, setNewInputName] = useState('');
  const [newInputType, setNewInputType] = useState<string>('string');
  const [newInputMinLength, setNewInputMinLength] = useState<number>(0);
  const [newInputMaxLength, setNewInputMaxLength] = useState<number>(100);

  const handleAddInput = () => {
    if (!newInputName.trim()) {
      toast.error('Input name is required');
      return;
    }

    if (state.quotaInputs[newInputName] && !editingInputKey) {
      toast.error('Input with this name already exists');
      return;
    }

    const newInput: IStepInput = {
      type: newInputType as any,
      minlength: newInputMinLength,
      maxlength: newInputMaxLength,
    };

    setState(prev => ({
      ...prev,
      quotaInputs: {
        ...prev.quotaInputs,
        [newInputName]: newInput,
      },
    }));

    // Reset form
    setNewInputName('');
    setNewInputType('string');
    setNewInputMinLength(0);
    setNewInputMaxLength(100);
    setEditingInputKey(null);

    toast.success(editingInputKey ? 'Input updated' : 'Input added');
  };

  const handleRemoveInput = (key: string) => {
    setState(prev => ({
      ...prev,
      quotaInputs: Object.fromEntries(
        Object.entries(prev.quotaInputs).filter(([k]) => k !== key)
      ),
    }));
    toast.success('Input removed');
  };

  // Shared Output Schema handlers
  const [newOutputFieldName, setNewOutputFieldName] = useState('');
  const [newOutputFieldDescription, setNewOutputFieldDescription] = useState('');

  const handleAddOutputField = () => {
    if (!newOutputFieldName.trim()) {
      toast.error('Output field name is required');
      return;
    }

    if (state.sharedOutputSchema[newOutputFieldName]) {
      toast.error('Output field with this name already exists');
      return;
    }

    setState(prev => ({
      ...prev,
      sharedOutputSchema: {
        ...prev.sharedOutputSchema,
        [newOutputFieldName]: newOutputFieldDescription || 'Field description',
      },
    }));

    setNewOutputFieldName('');
    setNewOutputFieldDescription('');
    toast.success('Output field added');
  };

  const handleRemoveOutputField = (key: string) => {
    setState(prev => ({
      ...prev,
      sharedOutputSchema: Object.fromEntries(
        Object.entries(prev.sharedOutputSchema).filter(([k]) => k !== key)
      ),
    }));
    toast.success('Output field removed');
  };

  // Add Option
  const handleAddOption = (type: StepEventTypes, selectedItem?: any) => {
    const newOption: QuotaOption = {
      id: `option_${Date.now()}`,
      type,
      name: selectedItem?.name || 'New Option',
      tag: selectedItem?.tag || '',
      event: selectedItem?.tag || '',
      quota: 1,
      input: {},
      output: {},
      retries: 1,
      category: selectedComponentType,
    };

    if (type === StepEventTypes.ACTION && selectedItem) {
      newOption.app = selectedItem.app;
      newOption.action = selectedItem;
    } else if (type === StepEventTypes.DB_ACTION && selectedItem) {
      newOption.database = selectedItem._id;
    }

    setState(prev => ({
      ...prev,
      selectedOptions: [...prev.selectedOptions, newOption],
      optionInputs: { ...prev.optionInputs, [newOption.id]: {} },
      optionOutputs: { ...prev.optionOutputs, [newOption.id]: {} },
    }));

    setEditingOptionId(newOption.id);
    toast.success('Option added');
  };

  const handleRemoveOption = (optionId: string) => {
    setState(prev => ({
      ...prev,
      selectedOptions: prev.selectedOptions.filter(o => o.id !== optionId),
      optionInputs: Object.fromEntries(
        Object.entries(prev.optionInputs).filter(([key]) => key !== optionId)
      ),
      optionOutputs: Object.fromEntries(
        Object.entries(prev.optionOutputs).filter(([key]) => key !== optionId)
      ),
    }));
    toast.success('Option removed');
  };

  const handleUpdateOption = (optionId: string, updates: Partial<QuotaOption>) => {
    setState(prev => ({
      ...prev,
      selectedOptions: prev.selectedOptions.map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    }));
  };

  // Input/Output Mapping helpers
  const [newMappingKey, setNewMappingKey] = useState('');
  const [newMappingValue, setNewMappingValue] = useState('');

  const handleAddInputMapping = (optionId: string) => {
    if (!newMappingKey.trim() || !newMappingValue.trim()) {
      toast.error('Both key and value are required');
      return;
    }

    setState(prev => ({
      ...prev,
      optionInputs: {
        ...prev.optionInputs,
        [optionId]: {
          ...prev.optionInputs[optionId],
          [newMappingKey]: newMappingValue,
        },
      },
    }));

    setNewMappingKey('');
    setNewMappingValue('');
    toast.success('Input mapping added');
  };

  const handleAddOutputMapping = (optionId: string) => {
    if (!newMappingKey.trim() || !newMappingValue.trim()) {
      toast.error('Both key and value are required');
      return;
    }

    setState(prev => ({
      ...prev,
      optionOutputs: {
        ...prev.optionOutputs,
        [optionId]: {
          ...prev.optionOutputs[optionId],
          [newMappingKey]: newMappingValue,
        },
      },
    }));

    setNewMappingKey('');
    setNewMappingValue('');
    toast.success('Output mapping added');
  };

  const handleRemoveMapping = (optionId: string, key: string, type: 'input' | 'output') => {
    if (type === 'input') {
      setState(prev => ({
        ...prev,
        optionInputs: {
          ...prev.optionInputs,
          [optionId]: Object.fromEntries(
            Object.entries(prev.optionInputs[optionId] || {}).filter(([k]) => k !== key)
          ),
        },
      }));
    } else {
      setState(prev => ({
        ...prev,
        optionOutputs: {
          ...prev.optionOutputs,
          [optionId]: Object.fromEntries(
            Object.entries(prev.optionOutputs[optionId] || {}).filter(([k]) => k !== key)
          ),
        },
      }));
    }
    toast.success('Mapping removed');
  };

  const { mutateAsync: createQuota, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!proxy) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await proxy.product.init(product.tag);

      const payload = {
        name: state.name,
        tag: state.tag,
        description: state.description,
        input: state.quotaInputs,
        options: state.selectedOptions.map(opt => ({
          type: opt.type,
          app: opt.app || undefined,
          event: opt.event,
          database: opt.database || undefined,
          quota: opt.quota,
          input: state.optionInputs[opt.id] || {},
          output: state.optionOutputs[opt.id] || {},
          retries: opt.retries,
          healthcheck: opt.healthcheck || undefined,
        })),
      };

      const quota = await proxy.quotas.create(product.tag, payload);
      return quota;
    },
    onSuccess: (quota) => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      closeTab(tabId);
      openTab({
        id: `quota-${quota._id}-${Date.now()}`,
        type: 'quota',
        title: quota.name,
        itemId: quota._id,
        data: { ...quota, componentType: 'quota', productName: product?.name },
      });
      toast.success('Quota created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quota');
    },
  });

  const handleSave = async () => {
    if (!state.name.trim() || !state.tag.trim()) {
      toast.error('Please fill in name and tag');
      return;
    }

    if (!state.description.trim()) {
      toast.error('Please fill in description');
      return;
    }

    if (Object.keys(state.quotaInputs).length === 0) {
      toast.error('At least one input must be defined');
      return;
    }

    if (Object.keys(state.sharedOutputSchema).length === 0) {
      toast.error('Output schema must be defined');
      return;
    }

    if (state.selectedOptions.length === 0) {
      toast.error('At least one option must be selected');
      return;
    }

    // Validate all options have required fields
    const invalidOptions = state.selectedOptions.filter(opt => !opt.event.trim() || opt.quota <= 0);
    if (invalidOptions.length > 0) {
      toast.error('All options must have an event and a positive quota value');
      return;
    }

    // Validate that all options have complete output mappings matching the schema
    const requiredOutputFields = Object.keys(state.sharedOutputSchema);
    const incompleteOptions = state.selectedOptions.filter(opt => {
      const mappedFields = Object.keys(state.optionOutputs[opt.id] || {});
      return requiredOutputFields.some(field => !mappedFields.includes(field));
    });

    if (incompleteOptions.length > 0) {
      toast.error(`All options must map all output fields. Incomplete: ${incompleteOptions.map(o => o.name).join(', ')}`);
      return;
    }

    await createQuota();
  };

  // Get icon for component type
  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'action': return <Zap className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'storage': return <Box className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Creating quota for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  Set up load balancing and failover between multiple providers
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
            <div className="w-12 h-12 rounded-lg bg-orange/10 flex items-center justify-center">
              <Timer className="h-6 w-6 text-orange" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Quota</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure load balancing and provider failover'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle>Quota Details</CardTitle>
                <CardDescription>Define the basic information for your quota</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Quota Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Payments"
                value={state.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A descriptive name for this quota</p>
            </div>

            <div>
              <Label htmlFor="tag">Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  value={state.tag}
                  readOnly
                  className="bg-grey-100"
                  placeholder="Auto-generated from name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tag = state.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_+|_+$/g, '')
                      .slice(0, 50);
                    setState(prev => ({ ...prev, tag: tag }));
                  }}
                  disabled={!state.name}
                >
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Auto-generated from quota name (max 50 characters)
              </p>
            </div>

            <div>
              <MarkdownEditor
                value={state.description}
                onChange={(value) => setState(prev => ({ ...prev, description: value }))}
                placeholder="e.g., Paystack and Flutterwave Load Sharing"
                label="Description"
              />
              <p className="text-xs text-grey-600 mt-1">
                Fill in the description to unlock the next steps
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Define Quota Inputs */}
        {showStep2 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Define Quota Inputs</CardTitle>
                  <CardDescription>Configure the input parameters that will be distributed across options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Input Form */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <Label className="text-sm font-semibold">Add Input Parameter</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs required">Input Name</Label>
                    <Input
                      value={newInputName}
                      onChange={(e) => setNewInputName(e.target.value)}
                      placeholder="e.g., amount"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs required">Data Type</Label>
                    <Select value={newInputType} onValueChange={setNewInputType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="uuid">UUID</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="nospaces_string">No Spaces String</SelectItem>
                        <SelectItem value="number_string">Number String</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Min Length</Label>
                    <Input
                      type="number"
                      value={newInputMinLength}
                      onChange={(e) => setNewInputMinLength(parseInt(e.target.value) || 0)}
                      className="mt-1"
                      min={0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Length</Label>
                    <Input
                      type="number"
                      value={newInputMaxLength}
                      onChange={(e) => setNewInputMaxLength(parseInt(e.target.value) || 100)}
                      className="mt-1"
                      min={1}
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddInput} className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Input
                </Button>
              </div>

              {/* Existing Inputs */}
              {Object.keys(state.quotaInputs).length > 0 && (
                <div className="space-y-2">
                  <Label>Defined Inputs ({Object.keys(state.quotaInputs).length})</Label>
                  <div className="space-y-2">
                    {Object.entries(state.quotaInputs).map(([key, input]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-grey-100 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">{key}</code>
                            <span className="text-xs text-grey-600">({input.type})</span>
                          </div>
                          {(input.minlength || input.maxlength) && (
                            <p className="text-xs text-grey-600 mt-1">
                              Length: {input.minlength || 0} - {input.maxlength || '∞'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInput(key)}
                        >
                          <Trash2 className="h-4 w-4 text-red" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(state.quotaInputs).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✓ Inputs configured. You can now define the output schema below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Define Shared Output Schema */}
        {showStep3 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle>Define Output Schema</CardTitle>
                  <CardDescription>Define the output structure that ALL options must return</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Output Field Form */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                <Label className="text-sm font-semibold">Add Output Field</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs required">Field Name</Label>
                    <Input
                      value={newOutputFieldName}
                      onChange={(e) => setNewOutputFieldName(e.target.value)}
                      placeholder="e.g., transactionId"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description (optional)</Label>
                    <Input
                      value={newOutputFieldDescription}
                      onChange={(e) => setNewOutputFieldDescription(e.target.value)}
                      placeholder="e.g., Unique transaction identifier"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddOutputField} className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Output Field
                </Button>
              </div>

              {/* Existing Output Fields */}
              {Object.keys(state.sharedOutputSchema).length > 0 && (
                <div className="space-y-2">
                  <Label>Output Schema Fields ({Object.keys(state.sharedOutputSchema).length})</Label>
                  <div className="space-y-2">
                    {Object.entries(state.sharedOutputSchema).map(([key, description]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-grey-100 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">{key}</code>
                          </div>
                          {description && (
                            <p className="text-xs text-grey-600 mt-1">{description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOutputField(key)}
                        >
                          <Trash2 className="h-4 w-4 text-red" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(state.sharedOutputSchema).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✓ Output schema defined. All options will return these fields. You can now add options below.
                  </p>
                </div>
              )}

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-grey-600">
                  <strong>Important:</strong> All quota options must return data matching this schema.
                  Each option will map its response to these exact fields.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Select Options */}
        {showStep4 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle>Select Quota Options</CardTitle>
                  <CardDescription>Add provider options for load balancing and failover</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Component Type Selector */}
              <div className="grid grid-cols-5 gap-2">
                {availableApps.length > 0 && (
                  <Button
                    variant={selectedComponentType === 'action' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedComponentType('action');
                      setSelectedApp(null);
                      setActionSearchTerm('');
                    }}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Zap className="h-5 w-5" />
                    <span className="text-xs">Actions</span>
                  </Button>
                )}
                {product?.databases && product.databases.length > 0 && (
                  <Button
                    variant={selectedComponentType === 'database' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedComponentType('database');
                      setSelectedDatabase(null);
                      setDatabaseActionType('');
                    }}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Database className="h-5 w-5" />
                    <span className="text-xs">Database</span>
                  </Button>
                )}
                {product?.notifications && product.notifications.length > 0 && (
                  <Button
                    variant={selectedComponentType === 'notification' ? 'default' : 'outline'}
                    onClick={() => setSelectedComponentType('notification')}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="text-xs">Notifications</span>
                  </Button>
                )}
                {product?.storages && product.storages.length > 0 && (
                  <Button
                    variant={selectedComponentType === 'storage' ? 'default' : 'outline'}
                    onClick={() => setSelectedComponentType('storage')}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Box className="h-5 w-5" />
                    <span className="text-xs">Storage</span>
                  </Button>
                )}
              </div>

              {/* Action Selection (App -> Action) */}
              {selectedComponentType === 'action' && (
                <div className="space-y-3">
                  <div>
                    <Label>Select App</Label>
                    <Select
                      value={selectedApp?._id}
                      onValueChange={(value) => {
                        const app = availableApps.find((a: any) => a._id === value);
                        setSelectedApp(app || null);
                        setActionSearchTerm('');
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose an app..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableApps.map((app: any) => (
                          <SelectItem key={app._id} value={app._id}>
                            {app.app_name || app.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedApp && selectedAppData && (() => {
                    const latestVersion = selectedAppData.versions?.find((v: any) => v.latest) || selectedAppData.versions?.[0];
                    const actions = latestVersion?.actions || [];

                    if (actions.length === 0) return null;

                    return (
                      <div>
                        <Label>Select Action</Label>
                        <div className="mt-2 border rounded-lg">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search actions..."
                              value={actionSearchTerm}
                              onChange={(e) => setActionSearchTerm(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {actions
                              .filter((action: any) =>
                                !actionSearchTerm ||
                                action.name.toLowerCase().includes(actionSearchTerm.toLowerCase()) ||
                                action.tag?.toLowerCase().includes(actionSearchTerm.toLowerCase())
                              )
                              .map((action: any) => (
                                <div
                                  key={action._id}
                                  className="p-3 hover:bg-grey-100 cursor-pointer border-b last:border-b-0"
                                  onClick={() => {
                                    handleAddOption(StepEventTypes.ACTION, {
                                      name: action.name,
                                      tag: action.tag,
                                      app: selectedApp.app_tag || selectedApp.tag,
                                      _id: action._id,
                                      ...action
                                    });
                                    setSelectedApp(null);
                                    setActionSearchTerm('');
                                  }}
                                >
                                  <div className="font-medium text-sm">{action.name}</div>
                                  {action.tag && (
                                    <div className="text-xs text-grey-600">{action.tag}</div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Database Selection (Database -> Action Type) */}
              {selectedComponentType === 'database' && product?.databases && (
                <div className="space-y-3">
                  <div>
                    <Label>Select Database</Label>
                    <Select
                      value={selectedDatabase?._id}
                      onValueChange={(value) => {
                        const db = product.databases.find((d: any) => d._id === value);
                        setSelectedDatabase(db || null);
                        setDatabaseActionType('');
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a database..." />
                      </SelectTrigger>
                      <SelectContent>
                        {product.databases.map((db: any) => (
                          <SelectItem key={db._id} value={db._id}>
                            {db.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDatabase && (
                    <div>
                      <Label>Select Action</Label>
                      <Select
                        value={databaseActionType}
                        onValueChange={(value) => {
                          setDatabaseActionType(value);
                          handleAddOption(StepEventTypes.DB_ACTION, {
                            name: `${selectedDatabase.name} - ${value}`,
                            tag: `${selectedDatabase.tag}:${value}`,
                            _id: selectedDatabase._id,
                            database: selectedDatabase._id,
                            actionType: value,
                          });
                          setSelectedDatabase(null);
                          setDatabaseActionType('');
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose an action..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                          <SelectItem value="list">List</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Notification, Storage options - simplified for now */}
              {selectedComponentType === 'notification' && product?.notifications && (
                <div className="space-y-2">
                  <Label>Select Notification</Label>
                  <Select onValueChange={(value) => {
                    const notification = product.notifications.find((n: any) => n._id === value);
                    if (notification) {
                      handleAddOption(StepEventTypes.NOTIFICATION, notification);
                    }
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a notification..." />
                    </SelectTrigger>
                    <SelectContent>
                      {product.notifications.map((notif: any) => (
                        <SelectItem key={notif._id} value={notif._id}>
                          {notif.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedComponentType === 'storage' && product?.storages && (
                <div className="space-y-2">
                  <Label>Select Storage</Label>
                  <Select onValueChange={(value) => {
                    const storage = product.storages.find((s: any) => s._id === value);
                    if (storage) {
                      handleAddOption(StepEventTypes.STORAGE, storage);
                    }
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a storage..." />
                    </SelectTrigger>
                    <SelectContent>
                      {product.storages.map((storage: any) => (
                        <SelectItem key={storage._id} value={storage._id}>
                          {storage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected Options */}
              {state.selectedOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Options ({state.selectedOptions.length})</Label>
                  <div className="space-y-3">
                    {state.selectedOptions.map((option) => (
                      <div key={option.id} className="p-4 bg-grey-100 rounded-lg border border-grey-300 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getComponentIcon(option.category || '')}
                            <div>
                              <p className="text-sm font-medium text-grey">{option.name}</p>
                              <p className="text-xs text-grey-600 capitalize">{option.type}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(option.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs required">Quota Value</Label>
                            <Input
                              type="number"
                              placeholder="1"
                              value={option.quota}
                              onChange={(e) => handleUpdateOption(option.id, { quota: parseInt(e.target.value) || 1 })}
                              className="mt-1"
                              min="1"
                            />
                            <p className="text-xs text-grey-600 mt-0.5">Weight for load distribution</p>
                          </div>

                          <div>
                            <Label className="text-xs required">Max Retries</Label>
                            <Input
                              type="number"
                              placeholder="1"
                              value={option.retries}
                              onChange={(e) => handleUpdateOption(option.id, { retries: parseInt(e.target.value) || 1 })}
                              className="mt-1"
                              min="0"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Healthcheck URL</Label>
                            <Input
                              placeholder="Optional"
                              value={option.healthcheck || ''}
                              onChange={(e) => handleUpdateOption(option.id, { healthcheck: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOptionId(option.id)}
                          className="w-full"
                        >
                          <Edit2 className="h-3 w-3 mr-2" />
                          Configure Input/Output Mapping
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Input Mapping */}
        {showStep5 && editingOptionId && (
          <Card className="animate-in slide-in-from-top-2 duration-300 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div className="flex-1">
                  <CardTitle>Input Mapping</CardTitle>
                  <CardDescription>
                    Map quota inputs to {state.selectedOptions.find(o => o.id === editingOptionId)?.name}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingOptionId(null)}>
                  Done
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Mapping Form */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <Label className="text-sm font-semibold">Add Input Mapping</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs required">Parameter Name</Label>
                    <Input
                      value={newMappingKey}
                      onChange={(e) => setNewMappingKey(e.target.value)}
                      placeholder="e.g., amount"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs required">Value (Ductape notation)</Label>
                    <Input
                      value={newMappingValue}
                      onChange={(e) => setNewMappingValue(e.target.value)}
                      placeholder="e.g., $Input{amount}"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddInputMapping(editingOptionId)} className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Mapping
                </Button>
              </div>

              {/* Available Quota Inputs Reference */}
              <div className="p-3 bg-grey-50 rounded-lg border border-grey-300">
                <Label className="text-xs font-semibold mb-2 block">Available Quota Inputs:</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(state.quotaInputs).map((key) => (
                    <code
                      key={key}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded cursor-pointer hover:bg-primary/20"
                      onClick={() => setNewMappingValue(`$Input{${key}}`)}
                    >
                      $Input{`{${key}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Existing Mappings */}
              {state.optionInputs[editingOptionId] && Object.keys(state.optionInputs[editingOptionId]).length > 0 && (
                <div className="space-y-2">
                  <Label>Configured Mappings ({Object.keys(state.optionInputs[editingOptionId]).length})</Label>
                  <div className="space-y-2">
                    {Object.entries(state.optionInputs[editingOptionId]).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-grey-100 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{key}</span>
                            <span className="text-xs text-grey-600">=</span>
                            <code className="text-sm font-mono text-primary">{value as string}</code>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(editingOptionId, key, 'input')}
                        >
                          <Trash2 className="h-4 w-4 text-red" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 6: Output Mapping */}
        {showStep6 && (
          <Card className="animate-in slide-in-from-top-2 duration-300 border-green">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div className="flex-1">
                  <CardTitle>Output Mapping</CardTitle>
                  <CardDescription>
                    Map {state.selectedOptions.find(o => o.id === editingOptionId)?.name} response to output schema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Output Fields (from shared schema) */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Label className="text-xs font-semibold mb-2 block">Required Output Fields (must map all):</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(state.sharedOutputSchema).map((key) => (
                    <code
                      key={key}
                      className="text-xs bg-purple/10 text-purple px-2 py-1 rounded"
                    >
                      {key}
                    </code>
                  ))}
                </div>
              </div>

              {/* Add Output Mapping Form */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                <Label className="text-sm font-semibold">Map Output Field</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs required">Field Name (from schema)</Label>
                    <Select
                      value={newMappingKey}
                      onValueChange={setNewMappingKey}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(state.sharedOutputSchema).map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs required">Value (Ductape notation)</Label>
                    <Input
                      value={newMappingValue}
                      onChange={(e) => setNewMappingValue(e.target.value)}
                      placeholder="e.g., $Response{transfer_code}"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddOutputMapping(editingOptionId)} className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Output Field
                </Button>
              </div>

              {/* Existing Output Mappings */}
              {state.optionOutputs[editingOptionId] && Object.keys(state.optionOutputs[editingOptionId]).length > 0 && (
                <div className="space-y-2">
                  <Label>Configured Output Fields ({Object.keys(state.optionOutputs[editingOptionId]).length} / {Object.keys(state.sharedOutputSchema).length})</Label>
                  <div className="space-y-2">
                    {Object.entries(state.optionOutputs[editingOptionId]).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-grey-100 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{key}</span>
                            <span className="text-xs text-grey-600">=</span>
                            <code className="text-sm font-mono text-primary">{value as string}</code>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(editingOptionId, key, 'output')}
                        >
                          <Trash2 className="h-4 w-4 text-red" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation: Show missing fields */}
              {editingOptionId && (() => {
                const mappedFields = Object.keys(state.optionOutputs[editingOptionId] || {});
                const requiredFields = Object.keys(state.sharedOutputSchema);
                const missingFields = requiredFields.filter(f => !mappedFields.includes(f));

                if (missingFields.length > 0) {
                  return (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <Label className="text-xs font-semibold text-orange-800 mb-2 block">Missing Fields:</Label>
                      <div className="flex flex-wrap gap-2">
                        {missingFields.map((field) => (
                          <code key={field} className="text-xs bg-orange/20 text-orange-800 px-2 py-1 rounded">
                            {field}
                          </code>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ All output fields are mapped for this option
                      </p>
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 bg-white rounded-lg border border-grey-400 p-4 shadow-sm sticky bottom-0">
          <Button variant="outline" onClick={() => closeTab(tabId)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isCreating ||
              !state.name.trim() ||
              !state.description.trim() ||
              Object.keys(state.quotaInputs).length === 0 ||
              Object.keys(state.sharedOutputSchema).length === 0 ||
              state.selectedOptions.length === 0
            }
            className="gap-2"
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Quota
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">How Quotas Work</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Quotas distribute requests across multiple providers based on weight values</li>
            <li>Higher quota values receive more requests - use this for load balancing (e.g., quota: 2 for Paystack, quota: 1 for Flutterwave = 2:1 ratio)</li>
            <li>If an option fails, Ductape automatically retries with the next available option</li>
            <li>Use $Input{`{key}`} to reference quota inputs in mappings</li>
            <li>Use $Response{`{field}`} to extract data from provider responses</li>
            <li>Healthcheck URLs help determine provider availability before routing requests</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

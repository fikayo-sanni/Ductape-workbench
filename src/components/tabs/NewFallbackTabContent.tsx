import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Shield, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { FeatureEventTypes, DataTypes } from '@ductape/sdk/dist/types';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewFallbackTabContentProps {
  tabId: string;
  data?: any;
}

interface FallbackOption {
  id: string;
  type: FeatureEventTypes.FEATURE | FeatureEventTypes.ACTION;
  app?: string;
  event: string;
  input: Record<string, any>;
  output: Record<string, any>;
  retries: number;
  healthcheck?: string;
  name: string;
  tag: string;
}

interface FallbackInput {
  key: string;
  type: DataTypes;
  minlength?: number;
  maxlength?: number;
}

interface FallbackBuilderState {
  // Step 1: Basic Info
  name: string;
  description: string;
  tag: string;
  
  // Step 2: Fallback Inputs
  fallbackInputs: Record<string, FallbackInput>;
  
  // Step 3: Selected Components
  selectedComponents: FallbackOption[];
  
  // Step 4: Component Inputs Mapping
  componentInputs: Record<string, Record<string, any>>;
  
  // Step 5: Component Outputs Mapping
  componentOutputs: Record<string, Record<string, any>>;
}

export default function NewFallbackTabContent({ tabId, data }: NewFallbackTabContentProps) {
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
    features: data.productFeatures || [],
  } : null;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [state, setState] = useState<FallbackBuilderState>(
    savedTabState?.state || {
      name: '',
      description: '',
      tag: '',
      fallbackInputs: {},
      selectedComponents: [],
      componentInputs: {},
      componentOutputs: {},
    }
  );

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-fallback',
    state.name || 'New Fallback',
    {},
    { state }
  );


  // Progressive disclosure steps
  const showStep2 = state.description.trim().length > 0;
  const showStep3 = state.selectedComponents.length > 0;
  const showStep4 = Object.keys(state.componentInputs).length > 0;

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  const handleNameChange = (value: string) => {
    const tag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);

    setState(prev => ({
      ...prev,
      name: value,
      tag: product?.tag ? `${product.tag}:${tag}` : tag,
    }));
  };


  // Add a new component (placeholder for now)
  const handleAddComponent = () => {
    const newComponent: FallbackOption = {
      id: `component_${Date.now()}`,
      type: FeatureEventTypes.ACTION,
      name: 'New Component',
      tag: 'new_component',
      event: '',
      input: {},
      output: {},
      retries: 3,
      healthcheck: '',
    };

    setState(prev => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, newComponent],
    }));

    toast.success('Component added');
  };

  // Remove component
  const handleRemoveComponent = (componentId: string) => {
    setState(prev => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter((c) => c.id !== componentId),
      componentInputs: Object.fromEntries(
        Object.entries(prev.componentInputs).filter(([key]) => key !== componentId)
      ),
      componentOutputs: Object.fromEntries(
        Object.entries(prev.componentOutputs).filter(([key]) => key !== componentId)
      ),
    }));
  };

  // Update component
  const handleUpdateComponent = (componentId: string, updates: Partial<FallbackOption>) => {
    setState(prev => ({
      ...prev,
      selectedComponents: prev.selectedComponents.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      ),
    }));
  };

  const { mutateAsync: createFallback, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);

      const payload = {
        name: state.name,
        tag: state.tag,
        description: state.description,
        input: Object.fromEntries(
          Object.entries(state.fallbackInputs).map(([key, input]) => [
            key,
            {
              type: input.type,
              minlength: input.minlength,
              maxlength: input.maxlength,
            },
          ])
        ),
        options: state.selectedComponents.map(opt => ({
          type: opt.type,
          app: opt.app || undefined,
          event: opt.event,
          input: state.componentInputs[opt.id] || {},
          output: state.componentOutputs[opt.id] || {},
          retries: opt.retries,
          healthcheck: opt.healthcheck || undefined,
        })),
      };

      const fallback = await ductape.fallbacks.create(payload);
      return fallback;
    },
    onSuccess: (fallback) => {
      queryClient.invalidateQueries({ queryKey: ['fallbacks'] });
      closeTab(tabId);
      openTab({
        id: `fallback-${fallback._id}-${Date.now()}`,
        type: 'fallback',
        title: fallback.name,
        itemId: fallback._id,
        data: { ...fallback, componentType: 'fallback', productName: product?.name },
      });
      toast.success('Fallback created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create fallback');
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

    if (state.selectedComponents.length === 0) {
      toast.error('At least one component must be selected');
      return;
    }

    // Validate all components have required fields
    const invalidComponents = state.selectedComponents.filter(opt => !opt.event.trim());
    if (invalidComponents.length > 0) {
      toast.error('All components must have an event selected');
      return;
    }

    await createFallback();
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
                  <h2 className="text-xl font-bold text-grey">Creating fallback for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  Define fallback providers for redundancy and reliability
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
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Fallback</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure fallback behavior for failed requests'}
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
                <CardTitle>Fallback Details</CardTitle>
                <CardDescription>Define the basic information for your fallback</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Fallback Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., API Fallback"
                value={state.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A descriptive name for this fallback configuration</p>
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
                    setState(prev => ({ ...prev, tag: product?.tag ? `${product.tag}:${tag}` : tag }));
                  }}
                  disabled={!state.name}
                >
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Auto-generated from fallback name (max 50 characters)
              </p>
            </div>

            <div>
              <MarkdownEditor
                value={state.description}
                onChange={(value) => setState(prev => ({ ...prev, description: value }))}
                placeholder="Describe this fallback configuration..."
                label="Description"
              />
              <p className="text-xs text-grey-600 mt-1">
                Fill in the description to unlock the next steps
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Options */}
        {showStep2 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Select Options</CardTitle>
                  <CardDescription>Add provider options for fallback management</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Component Button */}
              <Button
                onClick={handleAddComponent}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>

              {/* Selected Components */}
              {state.selectedComponents.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Options ({state.selectedComponents.length})</Label>
                  <div className="space-y-2">
                    {state.selectedComponents.map((component) => (
                      <div key={component.id} className="p-3 bg-grey-100 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-grey">{component.name}</p>
                            <p className="text-xs text-grey-600 capitalize">{component.type}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComponent(component.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`event-${component.id}`} className="required">
                              Event
                            </Label>
                            <Input
                              id={`event-${component.id}`}
                              placeholder="Event tag or name"
                              value={component.event}
                              onChange={(e) => handleUpdateComponent(component.id, { event: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`retries-${component.id}`} className="required">
                              Max Retries
                            </Label>
                            <Input
                              id={`retries-${component.id}`}
                              type="number"
                              placeholder="3"
                              value={component.retries}
                              onChange={(e) => handleUpdateComponent(component.id, { retries: parseInt(e.target.value) || 0 })}
                              className="mt-1"
                              min="0"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`healthcheck-${component.id}`}>
                            Healthcheck URL
                          </Label>
                          <Input
                            id={`healthcheck-${component.id}`}
                            placeholder="https://api.example.com/health"
                            value={component.healthcheck || ''}
                            onChange={(e) => handleUpdateComponent(component.id, { healthcheck: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Component Inputs Mapping */}
        {showStep3 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle>Component Inputs Mapping</CardTitle>
                  <CardDescription>Map fallback inputs to component parameters</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-grey-600">
                Component input mapping will be auto-populated based on fallback inputs and component requirements.
                Each component's required parameters will be listed with their assigned values.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Component Outputs Mapping */}
        {showStep4 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle>Component Outputs Mapping</CardTitle>
                  <CardDescription>Define output fields for each component</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-grey-600">
                Component output mapping will allow you to define what data each component returns.
                This data can be used in subsequent components or as the final fallback result.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 bg-white rounded-lg border border-grey-400 p-4 shadow-sm sticky bottom-0">
          <Button variant="outline" onClick={() => closeTab(tabId)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isCreating || !state.description.trim() || state.selectedComponents.length === 0} className="gap-2">
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Fallback
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Fallback Configuration Tips</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Components are tried in order - add your primary component first</li>
            <li>Set appropriate retry counts for each component</li>
            <li>Healthcheck URLs help determine component availability</li>
            <li>Configure input/output mappings to ensure compatibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

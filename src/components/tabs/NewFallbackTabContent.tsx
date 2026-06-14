/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Save, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { FeatureEventTypes, DataTypes } from '@ductape/sdk/dist/types';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';
import productServices from '@/services/productServices';
import {
  ComponentResourcePicker,
  StepInputMapper,
  StepOutputPreview,
} from '@/components/workflow-builder';
import type { ProductContext, ResilienceOptionDraft } from '@/components/workflow-builder/types';

interface NewFallbackTabContentProps {
  tabId: string;
  data?: any;
}

interface FallbackInput {
  key: string;
  type: DataTypes;
  minlength?: number;
  maxlength?: number;
}

interface FallbackBuilderState {
  name: string;
  description: string;
  tag: string;
  fallbackInputs: Record<string, FallbackInput>;
  selectedComponents: ResilienceOptionDraft[];
  componentInputs: Record<string, Record<string, any>>;
  componentOutputs: Record<string, Record<string, any>>;
}

export default function NewFallbackTabContent({ tabId, data }: NewFallbackTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const productMeta = data?.productId ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId,
  } : null;

  const { data: productDetailsRes } = useQuery({
    queryKey: ['fallback-product-details', productMeta?._id, productMeta?.tag],
    queryFn: async () => {
      if (!user?._id || !currentWorkspaceId) return null;
      if (productMeta?._id && productMeta._id !== productMeta?.tag) {
        return productServices.fetchProduct({
          user_id: user._id,
          public_key: user.public_key || '',
          workspace_id: currentWorkspaceId,
          product_id: productMeta._id,
        });
      }
      return null;
    },
    enabled: !!user?._id && !!currentWorkspaceId && !!productMeta,
  });

  const { data: productAppsRes } = useQuery({
    queryKey: ['fallback-product-apps', productMeta?._id, productMeta?.tag],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: productMeta?._id || productMeta?.tag || '',
      }),
    enabled: !!user?._id && !!currentWorkspaceId && !!productMeta,
  });

  const product: ProductContext | null = useMemo(() => {
    if (!productMeta) return null;
    const details = productDetailsRes?.data;
    return {
      ...productMeta,
      apps: productAppsRes?.data || [],
      features: details?.features || data?.productFeatures || [],
      databases: details?.databases || data?.productDatabases || [],
      storages: details?.storage || details?.storages || data?.productStorages || [],
      notifications: details?.notifications || data?.productNotifications || [],
      graphs: details?.graphs || [],
      vectors: details?.vectors || [],
      messageBrokers: details?.messageBrokers || [],
      healthchecks: details?.healthchecks || [],
    };
  }, [productMeta, productDetailsRes, productAppsRes, data]);

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
    },
  );

  const [editingComponentId, setEditingComponentId] = useState<string | null>(
    savedTabState?.editingComponentId || null,
  );

  useTabState(
    tabId,
    'new-fallback',
    state.name || 'New Fallback',
    {},
    { state, editingComponentId },
  );

  const showStep2 = state.description.trim().length > 0;
  const showStep3 = state.selectedComponents.length > 0;

  const proxy = useResilienceProxy();
  const connectedApps = productAppsRes?.data || [];

  const fallbackInputSources = useMemo(
    () =>
      Object.keys(state.fallbackInputs).map((key) => ({
        id: 'fallback-input',
        label: 'Fallback input',
        prefix: '$Input',
        fields: [{ key }],
      })),
    [state.fallbackInputs],
  );

  const handleNameChange = (value: string) => {
    const tag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);

    setState((prev) => ({
      ...prev,
      name: value,
      tag: product?.tag ? `${product.tag}:${tag}` : tag,
    }));
  };

  const handleAddComponent = (partial: Partial<ResilienceOptionDraft>) => {
    const newComponent: ResilienceOptionDraft = {
      id: `component_${Date.now()}`,
      type: partial.type || FeatureEventTypes.ACTION,
      name: partial.name || 'New option',
      tag: partial.tag || '',
      event: partial.event || partial.tag || '',
      app: partial.app,
      database: partial.database,
      action: partial.action,
      retries: partial.retries ?? 3,
      healthcheck: partial.healthcheck,
    };

    setState((prev) => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, newComponent],
      componentInputs: { ...prev.componentInputs, [newComponent.id]: {} },
      componentOutputs: { ...prev.componentOutputs, [newComponent.id]: {} },
    }));

    setEditingComponentId(newComponent.id);
    toast.success('Option added');
  };

  const handleRemoveComponent = (componentId: string) => {
    setState((prev) => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter((c) => c.id !== componentId),
      componentInputs: Object.fromEntries(
        Object.entries(prev.componentInputs).filter(([key]) => key !== componentId),
      ),
      componentOutputs: Object.fromEntries(
        Object.entries(prev.componentOutputs).filter(([key]) => key !== componentId),
      ),
    }));
    if (editingComponentId === componentId) setEditingComponentId(null);
  };

  const handleUpdateComponent = (componentId: string, updates: Partial<ResilienceOptionDraft>) => {
    setState((prev) => ({
      ...prev,
      selectedComponents: prev.selectedComponents.map((comp) =>
        comp.id === componentId ? { ...comp, ...updates } : comp,
      ),
    }));
  };

  const { mutateAsync: createFallback, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!proxy) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await proxy.product.init(product.tag);

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
          ]),
        ),
        options: state.selectedComponents.map((opt) => ({
          type: opt.type,
          app: opt.app || undefined,
          event: opt.event,
          database: opt.database || undefined,
          input: state.componentInputs[opt.id] || {},
          output: state.componentOutputs[opt.id] || {},
          retries: opt.retries,
          healthcheck: opt.healthcheck || undefined,
        })),
      };

      return proxy.fallback.create(product.tag, payload);
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
      toast.error('At least one option must be selected');
      return;
    }
    const invalid = state.selectedComponents.filter((opt) => !opt.event.trim());
    if (invalid.length > 0) {
      toast.error('All options must have an event selected');
      return;
    }
    await createFallback();
  };

  const healthcheckOptions = product?.healthchecks || [];

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img src={product.logo} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-grey">Creating fallback for {product.name}</h2>
                <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">{product.tag}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                <CheckCircle className="h-4 w-4 text-green" />
                <span>Auto-connect enabled</span>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create New Fallback</CardTitle>
            <CardDescription>Define fallback providers for redundancy and reliability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Fallback Name</Label>
              <Input id="name" placeholder="e.g., API Fallback" value={state.name} onChange={(e) => handleNameChange(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" value={state.tag} readOnly className="mt-2 bg-grey-100" />
            </div>
            <MarkdownEditor
              value={state.description}
              onChange={(value) => setState((prev) => ({ ...prev, description: value }))}
              placeholder="Describe this fallback configuration..."
              label="Description"
            />
          </CardContent>
        </Card>

        {showStep2 && product && (
          <Card>
            <CardHeader>
              <CardTitle>Select Options</CardTitle>
              <CardDescription>Pick app actions, databases, and other providers — tried in order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComponentResourcePicker product={product} connectedApps={connectedApps} onAdd={handleAddComponent} />

              {state.selectedComponents.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected options ({state.selectedComponents.length})</Label>
                  {state.selectedComponents.map((component, index) => (
                    <div key={component.id} className="p-3 bg-grey-100 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-grey">
                            {index + 1}. {component.name}
                          </p>
                          <p className="text-xs text-grey-600 capitalize">{component.type} · {component.event}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant={editingComponentId === component.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditingComponentId(component.id)}
                          >
                            Map
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveComponent(component.id)}>
                            <Trash2 className="h-4 w-4 text-red" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Max retries</Label>
                          <Input
                            type="number"
                            min={0}
                            value={component.retries}
                            onChange={(e) =>
                              handleUpdateComponent(component.id, { retries: parseInt(e.target.value, 10) || 0 })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Healthcheck</Label>
                          {healthcheckOptions.length > 0 ? (
                            <Select
                              value={component.healthcheck || '__none__'}
                              onValueChange={(val) =>
                                handleUpdateComponent(component.id, {
                                  healthcheck: val === '__none__' ? '' : val,
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Optional probe" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {healthcheckOptions.map((hc: any) => (
                                  <SelectItem key={hc.tag || hc._id} value={hc.tag}>
                                    {hc.name || hc.tag}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="healthcheck tag (optional)"
                              value={component.healthcheck || ''}
                              onChange={(e) => handleUpdateComponent(component.id, { healthcheck: e.target.value })}
                              className="mt-1"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showStep3 && editingComponentId && (
          <Card>
            <CardHeader>
              <CardTitle>Input &amp; output mapping</CardTitle>
              <CardDescription>Map fallback inputs to each provider&apos;s parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const comp = state.selectedComponents.find((c) => c.id === editingComponentId);
                if (!comp) return null;
                return (
                  <>
                    <StepInputMapper
                      title={`Inputs for ${comp.name}`}
                      action={comp.action}
                      mappings={state.componentInputs[comp.id] || {}}
                      onChange={(mappings) =>
                        setState((prev) => ({
                          ...prev,
                          componentInputs: { ...prev.componentInputs, [comp.id]: mappings },
                        }))
                      }
                      sources={fallbackInputSources}
                    />
                    <StepInputMapper
                      title="Output mapping"
                      targetFields={Object.keys(state.fallbackInputs).map((key) => ({
                        key,
                        label: key,
                      }))}
                      mappings={state.componentOutputs[comp.id] || {}}
                      onChange={(mappings) =>
                        setState((prev) => ({
                          ...prev,
                          componentOutputs: { ...prev.componentOutputs, [comp.id]: mappings },
                        }))
                      }
                      sources={[
                        ...fallbackInputSources,
                        {
                          id: comp.id,
                          label: comp.name,
                          prefix: `$Step{${comp.tag || comp.event}}`,
                          fields: Object.keys(state.componentInputs[comp.id] || {}).map((k) => ({ key: k })),
                        },
                      ]}
                    />
                    <StepOutputPreview category={comp.type} mappings={state.componentOutputs[comp.id]} />
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3 bg-white rounded-lg border border-grey-400 p-4 shadow-sm sticky bottom-0">
          <Button variant="outline" onClick={() => closeTab(tabId)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isCreating || !state.description.trim() || state.selectedComponents.length === 0} className="gap-2">
            {isCreating ? 'Creating...' : (<><Save className="h-4 w-4" />Create Fallback</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

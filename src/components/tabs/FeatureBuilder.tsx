import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useAuth } from '@/store/useAuth';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Save,
  ArrowDown,
  GripVertical,
  Copy,
  Edit2,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import productServicesReal from '@/services/productServicesReal';

interface FeatureBuilderProps {
  tabId: string;
  data?: any;
}

interface FeatureComponent {
  id: string;
  type: FeatureEventType;
  tag: string;
  name: string;
  app?: string;
  database?: string;
  category: string;
  action?: any;
}

interface FeatureSequence {
  id: string;
  name: string;
  components: string[];
}

interface FeatureInput {
  key: string;
  dataType: string;
  minLength?: number;
  maxLength?: number;
}

type FeatureEventType =
  | 'app'
  | 'database'
  | 'notification'
  | 'storage'
  | 'message-broker'
  | 'job'
  | 'quota'
  | 'fallback';

interface FeatureBuilderState {
  // Step 1: Feature Details
  featureName: string;
  featureDescription: string;
  featureTag: string;
  storeEventResults: boolean;

  // Step 2: Selected Components/Events
  selectedComponents: FeatureComponent[];

  // Step 3: Sequences
  sequences: FeatureSequence[];

  // Step 4: Feature Inputs
  featureInputs: Record<string, FeatureInput>;

  // Step 4: Component Inputs Mapping
  componentInputs: Record<string, Record<string, any>>;

  // Step 6: Feature Output
  featureOutput: Record<string, string | Record<string, string | object>>;

  // Cache Configuration
  componentCache: Record<string, string>;
}

export default function FeatureBuilder({ tabId, data }: FeatureBuilderProps) {
  const { closeTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();

  // Fetch product data to get all available components
  const { data: productsData } = useQuery({
    queryKey: ['products', currentWorkspaceId, data?.productId],
    queryFn: () =>
      productServicesReal.fetchProducts({
        workspace_id: currentWorkspaceId || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        status: 'all',
      }),
    enabled: !!data?.productId,
  });

  const product = productsData?.data?.find((p: any) => p._id === data?.productId);

  const [state, setState] = useState<FeatureBuilderState>({
    featureName: '',
    featureDescription: '',
    featureTag: '',
    storeEventResults: false,
    selectedComponents: [],
    sequences: [],
    featureInputs: {},
    componentInputs: {},
    featureOutput: {},
    componentCache: {},
  });

  // const [searchQuery, setSearchQuery] = useState(''); // TODO: Will be used for component search
  // const [selectedSequenceForAdding, setSelectedSequenceForAdding] = useState<string | null>(null); // TODO: Will be used for drag-and-drop
  const [showComponentPicker, setShowComponentPicker] = useState(false);
  const [componentPickerType, setComponentPickerType] = useState<FeatureEventType | ''>('');

  // Auto-generate tag from name
  const handleNameChange = (name: string) => {
    const tag = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);

    setState((prev) => ({
      ...prev,
      featureName: name,
      featureTag: tag,
    }));
  };

  // Step tracking - progressive disclosure
  const showStep2 = state.featureDescription.trim().length > 0;
  const showStep3 = state.selectedComponents.length > 0;
  const showStep4 = state.selectedComponents.length > 0;
  const showStep5 = Object.keys(state.featureInputs).length > 0;
  const showStep6 = Object.keys(state.componentInputs).length > 0;
  const showStep7 = Object.keys(state.featureOutput).length > 0;

  // Get available components by type from product
  const getComponentsByType = (type: FeatureEventType) => {
    if (!product) return [];

    switch (type) {
      case 'database':
        return (product.databases || []).map((db: any) => ({
          id: db._id,
          type: 'database' as FeatureEventType,
          tag: db.tag,
          name: db.name || db.tag,
          category: 'database',
          database: db._id,
        }));
      case 'storage':
        return (product.storage || []).map((storage: any) => ({
          id: storage._id,
          type: 'storage' as FeatureEventType,
          tag: storage.tag,
          name: storage.name || storage.tag,
          category: 'storage',
        }));
      case 'notification':
        return []; // TODO: Implement when notifications are available
      case 'message-broker':
        return (product.messageBroker || []).map((broker: any) => ({
          id: broker._id,
          type: 'message-broker' as FeatureEventType,
          tag: broker.tag,
          name: broker.name || broker.tag,
          category: 'message-broker',
        }));
      case 'job':
        return (product.jobs || []).map((job: any) => ({
          id: job._id,
          type: 'job' as FeatureEventType,
          tag: job.tag,
          name: job.name || job.tag,
          category: 'job',
        }));
      case 'app':
        return (product.apps || []).map((app: any) => ({
          id: app._id,
          type: 'app' as FeatureEventType,
          tag: app.tag || app.app_name,
          name: app.app_name,
          category: 'app',
          app: app._id,
        }));
      default:
        return [];
    }
  };

  // Add component to selected list
  const handleAddComponent = (component: FeatureComponent) => {
    if (state.selectedComponents.find((c) => c.id === component.id)) {
      toast.error('Component already added');
      return;
    }

    setState((prev) => ({
      ...prev,
      selectedComponents: [...prev.selectedComponents, component],
    }));

    toast.success(`${component.name} added`);
    setShowComponentPicker(false);
    setComponentPickerType('');
  };

  // Open component picker for a specific type
  const handleOpenComponentPicker = (type: FeatureEventType) => {
    setComponentPickerType(type);
    setShowComponentPicker(true);
  };

  // Remove component
  const handleRemoveComponent = (componentId: string) => {
    setState((prev) => ({
      ...prev,
      selectedComponents: prev.selectedComponents.filter((c) => c.id !== componentId),
      sequences: prev.sequences.map((seq) => ({
        ...seq,
        components: seq.components.filter((id) => id !== componentId),
      })),
    }));
  };

  // Add new sequence
  const handleAddSequence = () => {
    const ordinalNames = [
      'First',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
      'Sixth',
      'Seventh',
      'Eighth',
      'Ninth',
      'Tenth',
    ];

    const sequenceNum = state.sequences.length;
    const sequenceName =
      sequenceNum < ordinalNames.length
        ? `${ordinalNames[sequenceNum]} sequence`
        : `Sequence ${sequenceNum + 1}`;

    const newSequence: FeatureSequence = {
      id: `seq-${Date.now()}`,
      name: sequenceName,
      components: [],
    };

    setState((prev) => ({
      ...prev,
      sequences: [...prev.sequences, newSequence],
    }));
  };

  // Add component to sequence - TODO: Will be used for drag-and-drop functionality
  // const handleAddToSequence = (sequenceId: string, componentId: string) => {
  //   setState((prev) => ({
  //     ...prev,
  //     sequences: prev.sequences.map((seq) =>
  //       seq.id === sequenceId
  //         ? { ...seq, components: [...seq.components, componentId] }
  //         : seq
  //     ),
  //   }));
  // };

  // Remove sequence
  const handleRemoveSequence = (sequenceId: string) => {
    setState((prev) => ({
      ...prev,
      sequences: prev.sequences.filter((seq) => seq.id !== sequenceId),
    }));
  };

  // Rename sequence - TODO: Will be used for inline sequence editing
  // const handleRenameSequence = (sequenceId: string, newName: string) => {
  //   setState((prev) => ({
  //     ...prev,
  //     sequences: prev.sequences.map((seq) =>
  //       seq.id === sequenceId ? { ...seq, name: newName } : seq
  //     ),
  //   }));
  // };

  // Add feature input
  const handleAddFeatureInput = () => {
    const key = `input_${Object.keys(state.featureInputs).length + 1}`;
    setState((prev) => ({
      ...prev,
      featureInputs: {
        ...prev.featureInputs,
        [key]: {
          key,
          dataType: 'STRING',
        },
      },
    }));
  };

  // Remove feature input
  const handleRemoveFeatureInput = (key: string) => {
    const { [key]: removed, ...rest } = state.featureInputs;
    setState((prev) => ({
      ...prev,
      featureInputs: rest,
    }));
  };

  // Update feature input
  const handleUpdateFeatureInput = (key: string, updates: Partial<FeatureInput>) => {
    setState((prev) => ({
      ...prev,
      featureInputs: {
        ...prev.featureInputs,
        [key]: {
          ...prev.featureInputs[key],
          ...updates,
        },
      },
    }));
  };

  // Add feature output field
  const handleAddOutputField = () => {
    const key = `output_${Object.keys(state.featureOutput).length + 1}`;
    setState((prev) => ({
      ...prev,
      featureOutput: {
        ...prev.featureOutput,
        [key]: '',
      },
    }));
  };

  // Get unassigned components (not in any sequence)
  const getUnassignedComponents = () => {
    const assignedIds = state.sequences.flatMap((seq) => seq.components);
    return state.selectedComponents.filter((comp) => !assignedIds.includes(comp.id));
  };

  // Save feature
  const handleSave = () => {
    if (!state.featureName.trim()) {
      toast.error('Feature name is required');
      return;
    }

    if (!state.featureDescription.trim()) {
      toast.error('Feature description is required');
      return;
    }

    if (state.selectedComponents.length === 0) {
      toast.error('At least one component must be selected');
      return;
    }

    // TODO: Implement actual API call
    console.log('Saving feature:', state);
    toast.success('Feature saved successfully');
    closeTab(tabId);
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Feature</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Building feature for ${product.name}` : 'Build a custom workflow by chaining components together'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Feature Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle>Feature Details</CardTitle>
                <CardDescription>Define the basic information for your feature</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="featureName" className="required">
                Feature Name
              </Label>
              <Input
                id="featureName"
                placeholder="e.g., User Registration Workflow"
                value={state.featureName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="featureTag">Feature Tag</Label>
              <Input
                id="featureTag"
                value={state.featureTag}
                readOnly
                className="mt-2 bg-grey-100"
                placeholder="Auto-generated from name"
              />
              <p className="text-xs text-grey-600 mt-1">
                Auto-generated from feature name (max 50 characters)
              </p>
            </div>

            <div>
              <Label htmlFor="featureDescription" className="required">
                Description
              </Label>
              <Textarea
                id="featureDescription"
                placeholder="Describe what this feature does..."
                value={state.featureDescription}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, featureDescription: e.target.value }))
                }
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">
                Fill in the description to unlock the next steps
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="storeEventResults"
                checked={state.storeEventResults}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setState((prev) => ({ ...prev, storeEventResults: checked === true }))
                }
              />
              <Label htmlFor="storeEventResults" className="font-normal cursor-pointer">
                Store event results (for debugging)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Events */}
        {showStep2 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Select Events</CardTitle>
                  <CardDescription>
                    Add components and actions to your feature workflow
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Component Type Selector */}
              <div>
                <Label>Add Component</Label>
                <p className="text-xs text-grey-600 mb-3">
                  Select a component type to add to your feature workflow
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('app')}
                  >
                    <div className="text-lg">📱</div>
                    <span className="text-xs">Applications</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('database')}
                  >
                    <div className="text-lg">🗄️</div>
                    <span className="text-xs">Databases</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('storage')}
                  >
                    <div className="text-lg">💾</div>
                    <span className="text-xs">Storage</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('notification')}
                  >
                    <div className="text-lg">🔔</div>
                    <span className="text-xs">Notifications</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('message-broker')}
                  >
                    <div className="text-lg">📨</div>
                    <span className="text-xs">Message Brokers</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('job')}
                  >
                    <div className="text-lg">⚙️</div>
                    <span className="text-xs">Jobs</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('quota')}
                  >
                    <div className="text-lg">⏱️</div>
                    <span className="text-xs">Quotas</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleOpenComponentPicker('fallback')}
                  >
                    <div className="text-lg">🛡️</div>
                    <span className="text-xs">Fallbacks</span>
                  </Button>
                </div>
              </div>

              {/* Component Picker Modal/Dropdown */}
              {showComponentPicker && componentPickerType && (
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-grey">
                      Select {componentPickerType.charAt(0).toUpperCase() + componentPickerType.slice(1)}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowComponentPicker(false);
                        setComponentPickerType('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {getComponentsByType(componentPickerType).length === 0 ? (
                      <p className="text-sm text-grey-600 text-center py-4">
                        No {componentPickerType}s available in this product
                      </p>
                    ) : (
                      getComponentsByType(componentPickerType).map((component) => (
                        <button
                          key={component.id}
                          onClick={() => handleAddComponent(component)}
                          className="w-full p-3 bg-white rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-grey">{component.name}</p>
                              <p className="text-xs text-grey-600">{component.tag}</p>
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Selected Components */}
              {state.selectedComponents.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Components ({state.selectedComponents.length})</Label>
                  <div className="space-y-2">
                    {state.selectedComponents.map((component) => (
                      <div
                        key={component.id}
                        className="flex items-center justify-between p-3 bg-grey-100 rounded-lg"
                      >
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
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600">
                  Note: Full component selection UI with apps, databases, storage, notifications, etc.
                  will be implemented based on the product's available integrations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Order Events */}
        {showStep3 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle>Order Events</CardTitle>
                  <CardDescription>
                    Organize components into sequences and define execution order
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unassigned Components */}
              {getUnassignedComponents().length > 0 && (
                <div className="p-4 border-2 border-dashed border-grey-400 rounded-lg">
                  <p className="text-sm font-medium text-grey mb-2">Unassigned Events</p>
                  <div className="space-y-2">
                    {getUnassignedComponents().map((component) => (
                      <div
                        key={component.id}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-grey-400"
                      >
                        <GripVertical className="h-4 w-4 text-grey-600" />
                        <span className="text-sm text-grey flex-1">{component.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sequences */}
              <div className="space-y-6">
                {state.sequences.map((sequence, index) => (
                  <div key={sequence.id}>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-grey">{sequence.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSequence(sequence.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red" />
                          </Button>
                        </div>
                      </div>

                      {/* Components in sequence */}
                      <div className="space-y-2">
                        {sequence.components.map((componentId) => {
                          const component = state.selectedComponents.find(
                            (c) => c.id === componentId
                          );
                          return component ? (
                            <div
                              key={componentId}
                              className="flex items-center gap-2 p-2 bg-white rounded border border-grey-400"
                            >
                              <GripVertical className="h-4 w-4 text-grey-600" />
                              <span className="text-sm text-grey flex-1">{component.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Arrow between sequences */}
                    {index < state.sequences.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="h-5 w-5 text-grey-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={handleAddSequence} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add New Sequence
              </Button>

              <div className="pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600">
                  Note: Drag-and-drop functionality will allow reordering components between sequences.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Map Data Between Events */}
        {showStep4 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle>Map Data Between Events</CardTitle>
                  <CardDescription>
                    Define feature inputs and map data flow between components
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feature Inputs Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Feature Inputs</Label>
                  <Button onClick={handleAddFeatureInput} size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Input
                  </Button>
                </div>

                <div className="space-y-3">
                  {Object.entries(state.featureInputs).map(([key, input]) => (
                    <div
                      key={key}
                      className="p-3 bg-grey-100 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder="Field name"
                          value={input.key}
                          onChange={(e) =>
                            handleUpdateFeatureInput(key, { key: e.target.value })
                          }
                          className="flex-1 mr-2"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFeatureInput(key)}
                        >
                          <Trash2 className="h-4 w-4 text-red" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={input.dataType}
                          onValueChange={(value) =>
                            handleUpdateFeatureInput(key, { dataType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STRING">String</SelectItem>
                            <SelectItem value="INTEGER">Integer</SelectItem>
                            <SelectItem value="FLOAT">Float</SelectItem>
                            <SelectItem value="BOOLEAN">Boolean</SelectItem>
                            <SelectItem value="ARRAY">Array</SelectItem>
                            <SelectItem value="OBJECT">Object</SelectItem>
                            <SelectItem value="DATE">Date</SelectItem>
                            <SelectItem value="UUID">UUID</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          placeholder="Min length"
                          value={input.minLength || ''}
                          onChange={(e) =>
                            handleUpdateFeatureInput(key, {
                              minLength: parseInt(e.target.value) || undefined,
                            })
                          }
                        />

                        <Input
                          type="number"
                          placeholder="Max length"
                          value={input.maxLength || ''}
                          onChange={(e) =>
                            handleUpdateFeatureInput(key, {
                              maxLength: parseInt(e.target.value) || undefined,
                            })
                          }
                        />
                      </div>

                      <div className="text-xs text-grey-600 font-mono bg-white p-2 rounded">
                        $Input{'{'}{input.key}{'}'}
                      </div>
                    </div>
                  ))}

                  {Object.keys(state.featureInputs).length === 0 && (
                    <p className="text-sm text-grey-600 text-center py-4">
                      No feature inputs defined. Click "Add Input" to create external input fields.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-grey-400">
                <p className="text-xs text-grey-600">
                  Note: Event input mapping UI will show all component parameters and allow mapping to
                  feature inputs, previous events, session data, auth data, or hard-coded values.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Define Component Inputs */}
        {showStep5 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <CardTitle>Define Component Inputs</CardTitle>
                  <CardDescription>Map feature inputs to component parameters</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-grey-600">
                Component input mapping will be auto-populated based on data mapping in Step 4.
                Each component's required parameters will be listed with their assigned values.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Define Feature Output */}
        {showStep6 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div>
                  <CardTitle>Define Feature Output</CardTitle>
                  <CardDescription>
                    Specify what data this feature returns to the caller
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Output Fields</Label>
                <Button onClick={handleAddOutputField} size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Output Field
                </Button>
              </div>

              <div className="space-y-2">
                {Object.entries(state.featureOutput).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <Input placeholder="Field name" value={key} className="w-1/3" />
                    <Input
                      placeholder="Value (use data piping syntax)"
                      value={value as string}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          featureOutput: {
                            ...prev.featureOutput,
                            [key]: e.target.value,
                          },
                        }))
                      }
                      className="flex-1"
                    />
                  </div>
                ))}

                {Object.keys(state.featureOutput).length === 0 && (
                  <p className="text-sm text-grey-600 text-center py-4">
                    No output fields defined. Click "Add Output Field" to specify return values.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <p className="text-xs text-grey-600">
                  Use syntax: $Sequence{'{'}sequence_name{'}{'}event{'}{'}field{'}'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Generated Code */}
        {showStep7 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  7
                </div>
                <div>
                  <CardTitle>Generated Code</CardTitle>
                  <CardDescription>
                    TypeScript code ready for integration into your application
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Ductape Setup
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Feature Definition
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Sample Usage
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Full Code
                  </Button>
                </div>

                <div className="bg-grey-900 text-grey-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>
                    {`// Generated TypeScript code will appear here
// Including:
// - Ductape SDK initialization
// - Feature configuration with all mappings
// - Type-safe interface definitions
// - Sample usage examples`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 bg-white rounded-lg border border-grey-400 p-4 shadow-sm sticky bottom-0">
          <Button variant="outline" onClick={() => closeTab(tabId)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Feature
          </Button>
        </div>
      </div>
    </div>
  );
}

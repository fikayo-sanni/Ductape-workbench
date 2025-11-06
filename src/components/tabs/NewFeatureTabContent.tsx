/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConditionalModal from '@/components/modals/ConditionalModal';
import { Copy, Plus, Trash2, GripVertical, ArrowDown, Edit2, Zap, Save } from 'lucide-react';
import { DataTypes, FeatureEventTypes } from '@ductape/sdk/dist/types';
import { IFeatureInput } from '@ductape/sdk/dist/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import appServicesReal from '@/services/appServicesReal';

interface NewFeatureTabContentProps {
  tabId: string;
  type: string;
  data?: any;
}

interface Component {
  id: string;
  type: FeatureEventTypes;
  tag: string;
      name: string;
  app?: string;
  database?: string;
  category: string;
  action?: any; // IAppAction from the SDK
}

interface FeatureBuilderState {
  // Feature Details
  featureName: string;
  featureDescription: string;
  featureTag: string;
  storeEventResults: boolean;

  // Session
  selectedSession: string;
  includeSession: boolean;

  // Components
  selectedComponents: Component[];

  // Feature Inputs
  featureInputs: Record<string, IFeatureInput>;

  // Sequences
  sequences: Array<{
    id: string;
    name: string;
    components: string[];
  }>;

  // Component Inputs
  componentInputs: Record<string, Record<string, any>>;

  // Feature Output
  featureOutput: Record<string, string | Record<string, string | object>>;

  // Cache Configuration
  componentCache: Record<string, string>;

  // Event Conditions
  eventConditions: Record<string, {
    type: 'loop' | 'check' | '';
    valueSource: 'index' | 'input' | 'sequence' | '';  // Where the value comes from
    inputKey?: string;  // For input source
    sequenceId?: string;  // For sequence source
    eventId?: string;  // For sequence source - which event in the sequence
    valueKey?: string;  // For sequence source - the actual value key
    operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';  // Comparison operator
    compareValue?: string;  // Value to compare against (for check type)
    iter?: number;  // Iteration step
    init?: number;  // Initial value
  }>;
}

const INITIAL_STATE: FeatureBuilderState = {
  featureName: '',
  featureDescription: '',
  featureTag: '',
  storeEventResults: false,
  selectedSession: '',
  includeSession: false,
  selectedComponents: [],
  featureInputs: {},
  sequences: [{ id: 'main', name: 'First sequence', components: [] }],
  componentInputs: {},
  featureOutput: {},
  componentCache: {},
  eventConditions: {},
};

const DATA_TYPES = [
  { value: DataTypes.STRING, label: 'String' },
  { value: DataTypes.NOSPACES_STRING, label: 'No Spaces String' },
  { value: DataTypes.EMAIL_STRING, label: 'Email String' },
  { value: DataTypes.NUMBER_STRING, label: 'Number String' },
  { value: DataTypes.DATE_STRING, label: 'Date String' },
  { value: DataTypes.INTEGER, label: 'Integer' },
  { value: DataTypes.FLOAT, label: 'Float' },
  { value: DataTypes.DOUBLE, label: 'Double' },
  { value: DataTypes.UUID, label: 'UUID' },
  { value: DataTypes.DATE, label: 'Date' },
  { value: DataTypes.ARRAY, label: 'Array' },
  { value: DataTypes.OBJECT, label: 'Object' },
  { value: DataTypes.BOOLEAN, label: 'Boolean' },
  { value: DataTypes.STRING_ARRAY, label: 'String Array' },
  { value: DataTypes.INTEGER_ARRAY, label: 'Integer Array' },
  { value: DataTypes.FLOAT_ARRAY, label: 'Float Array' },
  { value: DataTypes.DOUBLE_ARRAY, label: 'Double Array' },
  { value: DataTypes.UUID_ARRAY, label: 'UUID Array' },
  { value: DataTypes.BOOLEAN_ARRAY, label: 'Boolean Array' },
];

// Ductape Operators with adaptive argument configuration
// const DUCTAPE_OPERATORS = [
//   { 
//     value: 'Add', 
//     label: 'Add - Sum multiple numeric values', 
//     minArgs: 1, 
//     maxArgs: 10, 
//     argTypes: ['value', 'value', 'value', 'value', 'value', 'value', 'value', 'value', 'value', 'value'],
//     canAddArgs: true
//   },
//   // ... other operators
// ];

// Animated Arrow Component
const AnimatedArrow = () => (
  <div className="flex justify-center items-center py-6">
    <div className="animate-bounce text-grey-400">
      <ArrowDown className="w-5 h-5" />
    </div>
  </div>
);

export default function NewFeatureTabContent({ tabId, data }: NewFeatureTabContentProps) {
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
    databases: data.productDatabases || [],
    storage: data.productStorage || [],
    notifications: data.productNotifications || [],
    messageBroker: data.productMessageBroker || [],
    jobs: data.productJobs || [],
    quota: data.productQuota || [],
    fallback: data.productFallback || [],
    caches: data.productCaches || [],
  } : null;

  const [state, setState] = useState<FeatureBuilderState>(INITIAL_STATE);

  // Helper function to build check expression from condition properties
  const buildCheckExpression = (cond: FeatureBuilderState['eventConditions'][string] | undefined) => {
    if (!cond || !cond.type) return '';

    let valueExpr = '';
    if (cond.valueSource === 'index') {
      valueExpr = '$Index';
    } else if (cond.valueSource === 'input' && cond.inputKey) {
      const input = state.featureInputs[cond.inputKey];
      if (input && input.type?.toString().startsWith('array')) {
        valueExpr = `$Length{$Input{${cond.inputKey}}}`;
      } else {
        valueExpr = `$Input{${cond.inputKey}}`;
      }
    } else if (cond.valueSource === 'sequence' && cond.sequenceId && cond.eventId && cond.valueKey) {
      const valueRef = `$Sequence{${cond.sequenceId}:${cond.eventId}:${cond.valueKey}}`;
      const isArray = cond.valueKey === 'data';
      valueExpr = isArray ? `$Length{${valueRef}}` : valueRef;
    }

    if (cond.type === 'loop') {
      if (cond.valueSource === 'index') {
        return `i = ${cond.init || 0}; i < ${cond.iter || 10}; i++`;
      } else {
        return `i = 0; ${valueExpr} ${cond.operator || '<'} ${cond.compareValue || ''}; i++`;
      }
    } else {
      return `${valueExpr} ${cond.operator || '=='} ${cond.compareValue || ''}`;
    }
  };

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState({
    type: '',
    parentId: '',
    childId: ''
  });
  const [, setDraggedComponent] = useState<string | null>(null);
  const [, setDraggedFromSequence] = useState<string | null>(null);
  const [newInputName, setNewInputName] = useState<string>('');
  const [showAddInput, setShowAddInput] = useState<boolean>(false);
  const [actionSearchTerm, setActionSearchTerm] = useState<string>('');
  const [editingActionSearch, setEditingActionSearch] = useState<string>('');
  const [addInputFromMapping, setAddInputFromMapping] = useState<boolean>(false);
  const [mappingVariableKey, setMappingVariableKey] = useState<string>('');
  const [conditionalModalOpen, setConditionalModalOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [mappingComponentId, setMappingComponentId] = useState<string>('');
  const [newInputType, setNewInputType] = useState<DataTypes>(DataTypes.STRING);
  const [newInputMinLength, setNewInputMinLength] = useState<number>(0);
  const [newInputMaxLength, setNewInputMaxLength] = useState<number>(0);
  const [sourceVariable, setSourceVariable] = useState<any>(null);
  const addInputFormRef = useRef<HTMLDivElement>(null);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editingComponentName, setEditingComponentName] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Update form values when sourceVariable changes
  useEffect(() => {
    if (sourceVariable && addInputFromMapping) {
      setNewInputType(sourceVariable.dataType || DataTypes.STRING);
      setNewInputMinLength(sourceVariable.minLength || 0);
      setNewInputMaxLength(sourceVariable.maxLength || 0);
    }
  }, [sourceVariable, addInputFromMapping]);

  const [dataMappings, setDataMappings] = useState<Record<string, Record<string, {
    source: 'input' | 'sequence' | 'session' | 'auth' | 'variables' | 'constants' | 'data' | 'filterData' | 'hardcode' | 'default' | 'operator';
    inputField?: string;
    sequenceId?: string;
    eventId?: string;
    responseField?: string;
    selectedValue?: string;
    authField?: string;
    operatorType?: string;
    operatorArgs?: Array<{
      source: string;
      code: string;
      argType?: string;
      inputField?: string;
      sequenceId?: string;
      eventId?: string;
      responseField?: string;
      selectedValue?: string;
      operatorType?: string;
      operatorArgs?: Array<{
        source: string;
        code: string;
        argType?: string;
      }>;
    }>;
    code: string;
  }>>>({});
  const [currentSequenceId, setCurrentSequenceId] = useState<string>('main');
  const [editingFieldNames, setEditingFieldNames] = useState<Record<string, string>>({});

  // Fetch selected app data when an app is selected
  const { data: selectedAppData } = useQuery({
    queryKey: ['app', selectedAppId],
    queryFn: () => appServicesReal.fetchApp({
      app_id: selectedAppId,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!selectedAppId && !!user?._id && !!user?.public_key,
  });

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  // Auto-generate tag from name
  useEffect(() => {
    if (state.featureName) {
      const tag = state.featureName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      setState(prev => ({ ...prev, featureTag: tag }));
    }
  }, [state.featureName]);

  // Cache options
  const cacheOptions = useMemo(() =>
    product?.caches?.map((cache: any) => ({
      value: cache._id,
      label: cache.name || cache.tag,
      tag: cache.tag
    })) || [],
    [product?.caches]
  );

  // Available events organized hierarchically
  const availableComponents = useMemo(() => {
    const components: Record<string, Record<string, Component[]>> = {};

    // Add database actions
    product?.databases?.forEach((db: any) => {
      if (db.actions?.length > 0) {
        if (!components['Databases']) components['Databases'] = {};
        components['Databases'][db.name || db.tag] = db.actions.map((action: any) => ({
          id: `db-${db._id}-${action._id}`,
          type: FeatureEventTypes.DB_ACTION,
          tag: `${db.tag}:${action.tag}`,
          name: action.name,
          database: db.tag,
          category: 'Databases',
          action: action
        }));
      }
    });

    // Add actions from product apps
    if (product?.apps && product.apps.length > 0) {
      product.apps.forEach((app: any) => {
        if (!components['Applications']) components['Applications'] = {};
        components['Applications'][app.app_name] = [{
          id: `app-${app.app_id}`,
          type: FeatureEventTypes.ACTION,
          tag: app.access_tag,
          name: app.app_name,
          app: app.access_tag,
          category: 'Applications'
        }];
      });
    }

    // Add notifications
    if (product?.notifications?.length && product.notifications.length > 0) {
      components['Notifications'] = {
        'Notifications': product.notifications.map((notification: any) => ({
          id: `notification-${notification._id}`,
          type: FeatureEventTypes.NOTIFICATION,
          tag: notification.tag,
          name: notification.name,
          category: 'Notifications'
        }))
      };
    }

    // Add storage
    if (product?.storage?.length && product.storage.length > 0) {
      components['Storage'] = {
        'Storage': product.storage.map((storage: any) => ({
          id: `storage-${storage._id}`,
          type: FeatureEventTypes.STORAGE,
          tag: storage.tag,
          name: storage.name,
          category: 'Storage'
        }))
      };
    }

    // Add message brokers
    product?.messageBroker?.forEach((broker: any) => {
      if (broker.messages?.length > 0) {
        if (!components['Message Brokers']) components['Message Brokers'] = {};
        components['Message Brokers'][broker.name || broker.tag] = broker.messages.map((message: any) => ({
          id: `broker-${broker._id}-${message._id}`,
          type: FeatureEventTypes.PUBLISH,
          tag: `${broker.tag}:${message.tag}`,
          name: message.name,
          category: 'Message Brokers'
        }));
      }
    });

    // Add jobs
    if (product?.jobs?.length && product.jobs.length > 0) {
      components['Jobs'] = {
        'Jobs': product.jobs.map((job: any) => ({
          id: `job-${job._id}`,
          type: FeatureEventTypes.JOB,
          tag: job.tag,
          name: job.name,
          category: 'Jobs'
        }))
      };
    }

    // Add quotas
    if (product?.quota?.length && product.quota.length > 0) {
      components['Quotas'] = {
        'Quotas': product.quota.map((quota: any) => ({
          id: `quota-${quota._id}`,
          type: FeatureEventTypes.QUOTA,
          tag: quota.tag,
          name: quota.name,
          category: 'Quotas'
        }))
      };
    }

    // Add fallbacks
    if (product?.fallback?.length && product.fallback.length > 0) {
      components['Fallbacks'] = {
        'Fallbacks': product.fallback.map((fallback: any) => ({
          id: `fallback-${fallback._id}`,
          type: FeatureEventTypes.FALLBACK,
          tag: fallback.tag,
          name: fallback.name,
          category: 'Fallbacks'
        }))
      };
    }

    // Ensure Applications is always available
    if (!components['Applications']) {
      components['Applications'] = {};
    }

    return components;
  }, [product]);

  const extractActionVariables = (action: any) => {
    const variables: any[] = [];

    // Extract from params
    if (action.params?.data && Array.isArray(action.params.data)) {
      action.params.data.forEach((param: any) => {
        variables.push({
          ...param,
          category: 'params',
          source: 'params'
        });
      });
    }

    // Extract from query
    if (action.query?.data && Array.isArray(action.query.data)) {
      action.query.data.forEach((query: any) => {
        variables.push({
          ...query,
          category: 'query',
          source: 'query'
        });
      });
    }

    // Extract from headers
    if (action.headers?.data && Array.isArray(action.headers.data)) {
      action.headers.data.forEach((header: any) => {
        variables.push({
          ...header,
          category: 'headers',
          source: 'headers'
        });
      });
    }

    // Extract from body
    if (action.body?.data && Array.isArray(action.body.data)) {
      action.body.data.forEach((body: any) => {
        variables.push({
          ...body,
          category: 'body',
          source: 'body'
        });
      });
    }

    // Extract from database action data array
    if (action.data && Array.isArray(action.data)) {
      action.data.forEach((dataItem: any) => {
        variables.push({
          ...dataItem,
          key: dataItem.key,
          name: dataItem.key,
          category: 'data',
          source: 'data'
        });
      });
    }

    // Extract from database action filterData array
    if (action.filterData && Array.isArray(action.filterData)) {
      action.filterData.forEach((filterItem: any) => {
        variables.push({
          ...filterItem,
          key: filterItem.key,
          name: filterItem.key,
          category: 'filterData',
          source: 'filterData'
        });
      });
    }

    return variables;
  };

  const addComponentFromForm = () => {
    if (!newComponent.type || !newComponent.parentId) return;
    if (newComponent.type !== 'Storage' && !newComponent.childId) return;

    let component;

    if (newComponent.type === 'Notifications' || newComponent.type === 'Applications' ||
      newComponent.type === 'Databases' || newComponent.type === 'Storage') {
      component = getChildOptions().find((c: any) => c.id === newComponent.childId);
    } else {
      const categoryComponents = availableComponents[newComponent.type];
      if (!categoryComponents) return;

      const parentComponents = categoryComponents[newComponent.parentId];
      if (!parentComponents) return;

      component = parentComponents.find((c: any) => c.id === newComponent.childId);
    }

    if (!component) return;

    // If it's an action-based component, extract variables and set up component inputs
    let componentInputs: Record<string, string> = {};
    if ((newComponent.type === 'Applications' || newComponent.type === 'Databases' || newComponent.type === 'Storage') && component.action) {
      const actionVariables = extractActionVariables(component.action);
      actionVariables.forEach((variable: any) => {
        const key = variable.key || variable.name;
        if (key) {
          componentInputs[key] = '';
        }
      });
    }

    // Special handling for Storage actions
    if (newComponent.type === 'Storage' && component.action) {
      componentInputs['buffer'] = '';
      componentInputs['fileName'] = '';
      componentInputs['mimeType'] = '';
    }

    setState({
      ...state,
      selectedComponents: [...state.selectedComponents, component],
      sequences: state.sequences.map(seq =>
        seq.id === currentSequenceId
          ? { ...seq, components: [...seq.components, component.id] }
          : seq
      ),
      componentInputs: {
        ...state.componentInputs,
        [component.id]: componentInputs
      }
    });

    setNewComponent({ type: '', parentId: '', childId: '' });
    setShowAddComponent(false);
  };

  const getParentOptions = () => {
    if (!newComponent.type) return [];

    if (newComponent.type === 'Notifications') {
      return product?.notifications?.filter((notification: any) => notification.messages && notification.messages.length > 0).map((notification: any) => notification.name || notification.tag) || [];
    }

    if (newComponent.type === 'Applications') {
      const appNames = product?.apps?.map((app: any) => app.app_name) || [];
      return appNames;
    }

    if (newComponent.type === 'Storage') {
      return product?.storage?.map((storage: any) => storage.name || storage.tag) || [];
    }

    if (newComponent.type === 'Databases') {
      return product?.databases?.filter((db: any) => db.actions && db.actions.length > 0).map((db: any) => db.name || db.tag) || [];
    }

    const categoryComponents = availableComponents[newComponent.type];
    return categoryComponents ? Object.keys(categoryComponents) : [];
  };

  const getFilteredChildOptions = () => {
    const allOptions = getChildOptions();
    if (!actionSearchTerm.trim()) return allOptions;

    return allOptions.filter((option: any) =>
      option.name.toLowerCase().includes(actionSearchTerm.toLowerCase()) ||
      option.tag.toLowerCase().includes(actionSearchTerm.toLowerCase())
    );
  };

  const getChildOptions = () => {
    if (!newComponent.type || !newComponent.parentId) return [];

    if (newComponent.type === 'Notifications') {
      const notification = product?.notifications?.find((n: any) => (n.name || n.tag) === newComponent.parentId);
      return notification?.messages?.map((message: any) => ({
        id: `${notification._id}-${message._id}`,
        type: FeatureEventTypes.NOTIFICATION,
        tag: `${notification.tag}:${message.tag}`,
        name: message.name,
        category: 'Notifications'
      })) || [];
    }

    if (newComponent.type === 'Applications') {
      // For applications, use the selected app data to get actions from the latest version
      if (selectedAppData?.data) {
        const app = selectedAppData.data;
        
        // Get the latest version of the app
        const latestVersion = app.versions?.find((v: any) => v.latest) || app.versions?.[0];
        
        if (latestVersion?.actions?.length > 0) {
          return latestVersion.actions.map((action: any) => ({
            id: `app-${app._id}-${action._id}`,
            type: FeatureEventTypes.ACTION,
            tag: action.tag,
            name: action.name,
            method: action.method,
            endpoint: action.resource,
            app: app.tag,
            category: 'Applications',
            action: action // Include the full action object with params, body, query, headers
          }));
        }
      }
      return [];
    }

    if (newComponent.type === 'Databases') {
      const database = product?.databases?.find((db: any) =>
        (db.name || db.tag) === newComponent.parentId
      );
      if (database?.actions?.length > 0) {
        return database.actions.map((action: any) => ({
          id: `db-${database._id}-${action._id}`,
          type: FeatureEventTypes.DB_ACTION,
          tag: `${database.tag}:${action.tag}`,
          name: action.name,
          database: database.tag,
          category: 'Database',
          action: action
        }));
      }
      return [];
    }

    if (newComponent.type === 'Storage') {
      const storage = product?.storage?.find((storage: any) =>
        (storage.name || storage.tag) === newComponent.parentId
      );
      if (storage) {
        return [{
          id: `storage-${storage._id}`,
          type: FeatureEventTypes.STORAGE,
          tag: storage.tag,
          name: storage.name || storage.tag,
          storage: storage.tag,
          category: 'Storage',
          action: storage
        }];
      }
      return [];
    }

    const categoryComponents = availableComponents[newComponent.type];
    if (!categoryComponents) return [];
    const parentComponents = categoryComponents[newComponent.parentId];
    return parentComponents || [];
  };

  const addInputField = () => {
    if (newInputName.trim()) {
      setState({
        ...state,
        featureInputs: {
          ...state.featureInputs,
          [newInputName.trim()]: {
            type: newInputType,
            minlength: newInputMinLength || undefined,
            maxlength: newInputMaxLength || undefined
          }
        }
      });

      // If adding from data mapping, automatically assign the new input
      if (addInputFromMapping) {
        setDataMappings(prev => ({
          ...prev,
          [mappingComponentId]: {
            ...prev[mappingComponentId],
            [mappingVariableKey]: {
              ...prev[mappingComponentId]?.[mappingVariableKey],
              inputField: newInputName.trim(),
              code: `$Input{${newInputName.trim()}}`
            }
          }
        }));
        setAddInputFromMapping(false);
        setMappingVariableKey('');
        setMappingComponentId('');
      }

      setNewInputName('');
      setNewInputType(DataTypes.STRING);
      setNewInputMinLength(0);
      setNewInputMaxLength(0);
      setShowAddInput(false);
    }
  };

  const removeInputField = (fieldName: string) => {
    const newInputs = { ...state.featureInputs };
    delete newInputs[fieldName];
    setState({ ...state, featureInputs: newInputs });
  };

  const removeComponent = (componentId: string) => {
    setState({
      ...state,
      selectedComponents: state.selectedComponents.filter(c => c.id !== componentId),
      sequences: state.sequences.map(seq => ({
        ...seq,
        components: seq.components.filter(id => id !== componentId)
      })),
      componentInputs: Object.fromEntries(
        Object.entries(state.componentInputs).filter(([key]) => key !== componentId)
      ),
      componentCache: Object.fromEntries(
        Object.entries(state.componentCache).filter(([key]) => key !== componentId)
      )
    });
  };

  const getOrdinalSequenceName = (index: number) => {
    const ordinals = [
      'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
      'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
      'Twenty-first', 'Twenty-second', 'Twenty-third', 'Twenty-fourth', 'Twenty-fifth', 'Twenty-sixth', 'Twenty-seventh', 'Twenty-eighth', 'Twenty-ninth', 'Thirtieth'
    ];

    if (index < ordinals.length) {
      return `${ordinals[index]} sequence`;
    }

    const suffixes = ['th', 'st', 'nd', 'rd'];
    const lastDigit = index % 10;
    const suffix = (index % 100 >= 11 && index % 100 <= 13) ? 'th' : suffixes[lastDigit] || 'th';
    return `${index + 1}${suffix} sequence`;
  };

  const addSequence = () => {
    const newSequence = {
      id: `sequence_${Date.now()}`,
      name: getOrdinalSequenceName(state.sequences.length),
      components: []
    };
    setState({
      ...state,
      sequences: [...state.sequences, newSequence]
    });
    setCurrentSequenceId(newSequence.id);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Code copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy code');
    }
  };

  // Helper function to extract sequence references from a string
  const extractSequenceReferences = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [];
    const matches = text.match(/\$Sequence\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(match => {
      const seqMatch = match.match(/\$Sequence\{([^}]+)\}/);
      return seqMatch ? seqMatch[1] : '';
    }).filter(Boolean);
  };

  // Helper function to detect parent sequences for a given sequence
  const detectParentSequences = (sequenceIndex: number): string[] => {
    const sequence = state.sequences[sequenceIndex];
    if (!sequence) return [];

    const parentTags = new Set<string>();

    // Check all component inputs in this sequence
    sequence.components.forEach(componentId => {
      const inputs = state.componentInputs[componentId] || {};
      Object.values(inputs).forEach((value: any) => {
        if (typeof value === 'string') {
          const refs = extractSequenceReferences(value);
          refs.forEach(ref => {
            // Only add as parent if it's from a previous sequence
            const parentSeq = state.sequences.find((s, idx) => 
              idx < sequenceIndex && s.name.toLowerCase().replace(/\s+/g, '_') === ref
            );
            if (parentSeq) {
              parentTags.add(ref);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          // Recursively check nested objects
          const checkNested = (obj: any) => {
            Object.values(obj).forEach((val: any) => {
              if (typeof val === 'string') {
                const refs = extractSequenceReferences(val);
                refs.forEach(ref => {
                  const parentSeq = state.sequences.find((s, idx) => 
                    idx < sequenceIndex && s.name.toLowerCase().replace(/\s+/g, '_') === ref
                  );
                  if (parentSeq) {
                    parentTags.add(ref);
                  }
                });
              } else if (typeof val === 'object' && val !== null) {
                checkNested(val);
              }
            });
          };
          checkNested(value);
        }
      });
    });

    return Array.from(parentTags);
  };

  const generateCode = () => {
    const ductapeCode = `// Do this once in a ductape.ts file and reuse in other components

import Ductape from '@ductape/sdk';
import { config } from 'dotenv';
import { InputTypes, IProductFeature, IFeatureInput, IFeatureSequence, FeatureEventTypes, Conditions } from '@ductape/sdk/types';

config();

const credentials = {
  user_id: process.env.DUCTAPE_USER_ID,
  workspace_id: process.env.DUCTAPE_WORKSPACE_ID,
  private_key: process.env.DUCTAPE_PRIVATE_KEY,
  redis_url: 'redis://localhost:6379'
};

const ductape = new Ductape(credentials);`;

    const inputObject = Object.entries(state.featureInputs).map(([key, input]) =>
      `  ${key}: { type: '${input.type}', ${input.minlength ? `minlength: ${input.minlength}, ` : ''}${input.maxlength ? `maxlength: ${input.maxlength}` : ''} }`
    ).join(',\n');

    const sequencesArray = state.sequences.map((sequence, seqIndex) => {
      const events = sequence.components.map(componentId => {
        const component = state.selectedComponents.find(c => c.id === componentId);
        if (!component) return '';

        const inputs = state.componentInputs[componentId] || {};
        const inputEntries = Object.entries(inputs).map(([key, value]) => {
          // Handle nested objects and arrays
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedEntries = Object.entries(value).map(([nestedKey, nestedValue]) =>
              `            ${nestedKey}: ${typeof nestedValue === 'string' ? `'${nestedValue}'` : JSON.stringify(nestedValue)}`
            ).join(',\n');
            return `          ${key}: {\n${nestedEntries}\n          }`;
          } else if (Array.isArray(value)) {
            return `          ${key}: ${JSON.stringify(value)}`;
          } else {
            return `          ${key}: ${typeof value === 'string' ? `'${value}'` : JSON.stringify(value)}`;
          }
        }).join(',\n');

        const cacheConfig = state.componentCache[componentId] ?
          `,\n        cache: '${state.componentCache[componentId]}'` : '';

        const condition = state.eventConditions[componentId];
        const checkExpression = buildCheckExpression(condition);
        const conditionConfig = condition && condition.type && checkExpression ? `,\n        condition: {\n          type: Conditions.${condition.type.toUpperCase()},\n          check: '${checkExpression}'${condition.iter !== undefined ? `,\n          iter: ${condition.iter}` : ''}${condition.init !== undefined ? `,\n          init: ${condition.init}` : ''}\n        }` : '';

        const eventTag = component.app ? `${component.app}:${component.tag}` : component.tag;

        return `      {
        type: FeatureEventTypes.${component.type},
        event: '${eventTag}',
        input: {
${inputEntries}
        },
        retries: 2,
        allow_fail: false${cacheConfig}${conditionConfig}
      }`;
      }).filter(Boolean);

      // Auto-detect parent sequences
      const parents = detectParentSequences(seqIndex);
      const parentsConfig = parents.length > 0 ? 
        `,\n    parents: [${parents.map(p => `'${p}'`).join(', ')}]` : '';

      return `  {
    tag: '${sequence.name.toLowerCase().replace(/\s+/g, '_')}',${parentsConfig}
    events: [
${events.join(',\n')}
    ]
  }`;
    });

    const outputObject = Object.entries(state.featureOutput).map(([key, value]) => {
      if (typeof value === 'string') {
        return `  ${key}: '${value}'`;
      } else {
        const nestedEntries = Object.entries(value).map(([nestedKey, nestedValue]) =>
          `    ${nestedKey}: '${nestedValue}'`
        ).join(',\n');
        return `  ${key}: {\n${nestedEntries}\n  }`;
      }
    }).join(',\n');

    const featureCode = `// Feature Definition

const input_object: Record<string, IFeatureInput> = {
${inputObject}
};

const sequence_array: IFeatureSequence[] = [
${sequencesArray.join(',\n')}
];

const output_object: Record<string, string | Record<string, string | object>> = {
${outputObject}
};

const details: IProductFeature = {
  name: '${state.featureName}',
  description: '${state.featureDescription}',
  tag: '${state.featureTag}',
  input_type: InputTypes.JSON,
  input: input_object,
  sequence: sequence_array,
  output: output_object,
  store_event_results: ${state.storeEventResults}
};

await ductape.product.features.create(details);`;

    const sampleCode = `// Sample Usage

const input = {
${Object.keys(state.featureInputs).map(key => `  ${key}: "sample_value"`).join(',\n')}
};

const result = await ductape.product.features.run({
  product: '${product?.tag}',
  feature: '${state.featureTag}',
  input${state.includeSession ? ',\n  session: {\n    tag: \'session_tag\',\n    token: \'your_token_here\'\n  }' : ''}
});

console.log('Feature result:', result);`;

    return {
      ductape: ductapeCode,
      feature: featureCode,
      sample: sampleCode,
      full: `${ductapeCode}\n\n${featureCode}\n\n${sampleCode}`
    };
  };

  const codeSnippets = useMemo(() => generateCode(), [state, product]);

  const { mutateAsync: createFeature, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);

      const payload = {
        name: state.featureName,
        description: state.featureDescription,
        tag: state.featureTag,
        input_type: 'JSON',
        input: state.featureInputs,
        sequence: state.sequences.map((seq, seqIndex) => {
          const parents = detectParentSequences(seqIndex);
          return {
            tag: seq.name.toLowerCase().replace(/\s+/g, '_'),
            ...(parents.length > 0 && { parents }),
            events: seq.components.map(componentId => {
              const component = state.selectedComponents.find(c => c.id === componentId);
              if (!component) return null;

              const inputs = state.componentInputs[componentId] || {};
              const eventTag = component.app ? `${component.app}:${component.tag}` : component.tag;
              const condition = state.eventConditions[componentId];
              const checkExpression = buildCheckExpression(condition);

              return {
                type: component.type,
                event: eventTag,
                input: inputs,
                retries: 2,
                allow_fail: false,
                cache: state.componentCache[componentId] || undefined,
                ...(condition && condition.type && checkExpression && {
                  condition: {
                    type: condition.type,
                    check: checkExpression,
                    ...(condition.iter !== undefined && { iter: condition.iter }),
                    ...(condition.init !== undefined && { init: condition.init }),
                  }
                })
              };
            }).filter(Boolean)
          };
        }),
        output: state.featureOutput,
        store_event_results: state.storeEventResults
      };

      const feature = await ductape.features.create(payload);
      return feature;
    },
    onSuccess: (feature) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      closeTab(tabId);
      openTab({
        id: `feature-${feature._id}-${Date.now()}`,
        type: 'feature',
        title: feature.name,
        itemId: feature._id,
        data: { ...feature, componentType: 'feature', productName: product?.name },
      });
      toast.success('Feature created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create feature');
    },
  });

  const handleSave = async () => {
    if (!state.featureName.trim() || !state.featureDescription.trim()) {
      toast.error('Please fill in feature name and description');
      return;
    }

    if (state.selectedComponents.length === 0) {
      toast.error('At least one component must be selected');
      return;
    }

    await createFeature();
  };

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    // Check basic fields
    if (!state.featureName || !state.featureDescription) {
      return false;
    }

    // Check if at least one component is selected
    if (state.selectedComponents.length === 0) {
      return false;
    }

    // Check all feature inputs have types
    for (const inputKey in state.featureInputs) {
      const input = state.featureInputs[inputKey];
      if (!inputKey || !input.type) {
        return false;
      }
    }

    // Check all selected components have required configurations
    for (const component of state.selectedComponents) {
      const inputs = state.componentInputs[component.id];
      if (inputs) {
        // Check all input fields have values
        for (const inputKey in inputs) {
          const inputValue = inputs[inputKey];
          if (inputValue === '' || inputValue === null || inputValue === undefined) {
            return false;
          }
        }
      }

      // Check conditionals are properly configured if they exist
      const condition = state.eventConditions[component.id];
      if (condition && condition.type) {
        // If condition exists, check it's properly configured
        if (!condition.valueSource) {
          return false;
        }

        if (condition.type === 'loop') {
          // Loop validation
          if (condition.valueSource === 'index') {
            // Index mode: check init and iter
            if (condition.init === undefined || condition.iter === undefined) {
              return false;
            }
          } else if (condition.valueSource === 'input') {
            // Input mode: check inputKey and operator and compareValue
            if (!condition.inputKey || !condition.operator || !condition.compareValue) {
              return false;
            }
          } else if (condition.valueSource === 'sequence') {
            // Sequence mode: check sequenceId, eventId, valueKey, operator, compareValue
            if (!condition.sequenceId || !condition.eventId || !condition.valueKey || !condition.operator || !condition.compareValue) {
              return false;
            }
          }
        } else if (condition.type === 'check') {
          // Check validation: must have value source, operator, and compare value
          if (condition.valueSource === 'input') {
            if (!condition.inputKey || !condition.operator || !condition.compareValue) {
              return false;
            }
          } else if (condition.valueSource === 'sequence') {
            if (!condition.sequenceId || !condition.eventId || !condition.valueKey || !condition.operator || !condition.compareValue) {
              return false;
            }
          }
        }
      }
    }

    // Check feature outputs are properly configured
    for (const outputKey in state.featureOutput) {
      const outputValue = state.featureOutput[outputKey];
      if (!outputValue || outputValue === '') {
        return false;
      }
    }

    return true;
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
                  <h2 className="text-xl font-bold text-grey">Creating feature for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  Build a feature by adding events and defining their flow
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Feature</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Build a feature by adding events and defining their flow'}
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

              <label className="block text-sm font-medium text-grey mb-2">Feature Name</label>
              <Input
                value={state.featureName}
                onChange={(e) => {
                  const name = e.target.value;
                  setState({
                    ...state,
                    featureName: name,
                    // Auto-populate description if it's empty or was previously auto-generated
                    featureDescription: !state.featureDescription || state.featureDescription.endsWith(' feature')
                      ? `${name} feature`
                      : state.featureDescription
                  });
                }}
                placeholder="Enter feature name"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grey mb-2">Feature Tag</label>
              <div className="flex gap-2">
                <Input
                  value={state.featureTag}
                  readOnly
                  className="w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tag = state.featureName
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_+|_+$/g, '')
                      .slice(0, 50);
                    setState({ ...state, featureTag: product?.tag ? `${product.tag}:${tag}` : tag });
                  }}
                  disabled={!state.featureName}
                >
                  Auto-generate
                </Button>
              </div>
            </div>
            <div>
              <MarkdownEditor
                value={state.featureDescription}
                onChange={(value) => setState({ ...state, featureDescription: value })}
                placeholder="Describe what this feature does"
                label="Description"
              />
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="storeEventResults"
                checked={state.storeEventResults}
                onChange={(e) => setState({ ...state, storeEventResults: e.target.checked })}
                className="w-4 h-4 text-primary"
              />
              <label htmlFor="storeEventResults" className="text-grey-700 text-sm">
                Store event results for debugging
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Events */}
        {state.featureDescription && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle>Select Events</CardTitle>
                  <CardDescription>Choose the actions that will make up your feature from available integrations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Add Component Form */}
              {showAddComponent && (
                <div className="p-4 border border-grey-300 rounded-lg bg-grey-50 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-grey font-medium mb-3">Add New Event</h4>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs text-grey font-medium">Target Sequence</label>
                <Select
                        value={currentSequenceId}
                        onValueChange={(value) => setCurrentSequenceId(value)}
                >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select sequence" />
                  </SelectTrigger>
                  <SelectContent>
                          {state.sequences.map(seq => (
                            <SelectItem key={seq.id} value={seq.id}>{seq.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-sm font-medium text-grey mb-1">Type</label>
                      <Select
                        value={newComponent.type}
                        onValueChange={(value) => {
                          setActionSearchTerm('');
                          setNewComponent({ type: value, parentId: '', childId: '' });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(availableComponents).map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {newComponent.type && (
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-grey mb-1">
                          {newComponent.type === 'Databases' ? 'Database' :
                            newComponent.type === 'Applications' ? 'App' :
                              newComponent.type === 'Notifications' ? 'Notification' :
                                newComponent.type === 'Storage' ? 'Storage' :
                                  newComponent.type === 'Message Brokers' ? 'Message Broker' :
                                    newComponent.type === 'Jobs' ? 'Job' :
                                      newComponent.type === 'Quotas' ? 'Quota' :
                                        newComponent.type === 'Fallbacks' ? 'Fallback' : 'Parent'}
                        </label>
                        <Select
                          value={newComponent.parentId}
                          onValueChange={(value) => {
                            setActionSearchTerm('');
                            let childId = '';
                            if (newComponent.type === 'Storage') {
                              const storage = product?.storage?.find((storage: any) =>
                                (storage.name || storage.tag) === value
                              );
                              childId = storage ? `storage-${storage._id}` : '';
                            }
                            // For Applications, also set the selectedAppId to fetch app data
                            if (newComponent.type === 'Applications') {
                              const app = product?.apps?.find((app: any) => app.app_name === value);
                              if (app?.app_id) {
                                setSelectedAppId(app.app_id);
                              }
                            }
                            setNewComponent({ ...newComponent, parentId: value, childId });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={`Select ${newComponent.type === 'Databases' ? 'database' :
                              newComponent.type === 'Applications' ? 'app' :
                                newComponent.type === 'Notifications' ? 'notification' :
                                  newComponent.type === 'Storage' ? 'storage' :
                                    newComponent.type === 'Message Brokers' ? 'message broker' :
                                      newComponent.type === 'Jobs' ? 'job' :
                                        newComponent.type === 'Quotas' ? 'quota' :
                                          newComponent.type === 'Fallbacks' ? 'fallback' : 'parent'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {getParentOptions().map((parent: any) => (
                              <SelectItem key={parent} value={parent}>{parent}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {newComponent.parentId && newComponent.type !== 'Storage' && (
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-grey mb-1">
                          {newComponent.type === 'Databases' ? 'Action' :
                            newComponent.type === 'Applications' ? 'Action' :
                              newComponent.type === 'Notifications' ? 'Message' :
                                newComponent.type === 'Message Brokers' ? 'Message' :
                                  newComponent.type === 'Jobs' ? 'Action' :
                                    newComponent.type === 'Quotas' ? 'Action' :
                                      newComponent.type === 'Fallbacks' ? 'Action' : 'Action'}
                        </label>
                        <Select
                          value={newComponent.childId}
                          onValueChange={(value) => setNewComponent({ ...newComponent, childId: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={`Select ${newComponent.type === 'Notifications' ? 'message' :
                              newComponent.type === 'Message Brokers' ? 'message' : 'action'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder={`Search ${newComponent.type === 'Notifications' ? 'messages' : 'actions'}...`}
                                value={editingActionSearch !== undefined ? editingActionSearch : actionSearchTerm}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setEditingActionSearch(newValue);
                                  setActionSearchTerm(newValue);
                                }}
                                onFocus={() => {
                                  setEditingActionSearch(actionSearchTerm);
                                }}
                                onBlur={() => {
                                  setEditingActionSearch('');
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {getFilteredChildOptions().map((component: any) => (
                                <SelectItem key={component.id} value={component.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{component.name}</span>
                                    {component.tag && component.tag !== component.name && (
                                      <span className="text-xs text-grey-500">{component.tag}</span>
                                    )}
                                  </div>
                      </SelectItem>
                    ))}
                              {getFilteredChildOptions().length === 0 && actionSearchTerm && (
                                <div className="p-2 text-sm text-grey-500 text-center">
                                  No {newComponent.type === 'Notifications' ? 'messages' : 'actions'} found
                                </div>
                              )}
                            </div>
                  </SelectContent>
                </Select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={addComponentFromForm}
                        disabled={!newComponent.type || !newComponent.parentId || (newComponent.type !== 'Storage' && !newComponent.childId)}
                        size="sm"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddComponent(false);
                          setNewComponent({ type: '', parentId: '', childId: '' });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Component Button */}
              {!showAddComponent && (
                <Button
                  onClick={() => setShowAddComponent(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Component
                </Button>
              )}

              {/* Selected Events */}
              {state.selectedComponents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-grey font-medium">Selected Events</h4>
                  {state.selectedComponents.map((component) => (
                    <div key={component.id} className="space-y-2">
                      <div
                        className="flex items-center justify-between p-3 bg-grey-50 rounded-lg cursor-move hover:bg-grey-100 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        setDraggedComponent(component.id);
                        setDraggedFromSequence(null);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', component.id);
                      }}
                      onDragEnd={() => {
                        setDraggedComponent(null);
                        setDraggedFromSequence(null);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-4 h-4 text-grey-400" />
                        {editingComponent === component.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editingComponentName}
                              onChange={(e) => setEditingComponentName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              onClick={() => {
                                if (editingComponentName.trim()) {
                                  setState({
                                    ...state,
                                    selectedComponents: state.selectedComponents.map(c =>
                                      c.id === component.id
                                        ? { ...c, name: editingComponentName.trim() }
                                        : c
                                    )
                                  });
                                  setEditingComponent(null);
                                  setEditingComponentName('');
                                }
                              }}
                              size="sm"
                              disabled={!editingComponentName.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingComponent(null);
                                setEditingComponentName('');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-grey">{component.name}</span>
                            <Button
                              onClick={() => {
                                setEditingComponent(component.id);
                                setEditingComponentName(component.name);
                              }}
                              size="sm"
                              variant="ghost"
                              className="p-1 h-6 w-6"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded">
                          {component.tag}
                        </span>
                        {state.componentCache[component.id] && state.componentCache[component.id] !== '' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Cached
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Select
                          value={state.componentCache[component.id] || 'no-cache'}
                          onValueChange={(value) => setState({
                            ...state,
                            componentCache: {
                              ...state.componentCache,
                              [component.id]: value === 'no-cache' ? '' : value
                            }
                          })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="No cache" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-cache">No cache</SelectItem>
                            {cacheOptions.map((cache: any) => (
                              <SelectItem key={cache.value} value={cache.value}>
                                {cache.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => removeComponent(component.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Order Events */}
        {state.selectedComponents.length > 0 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle>Order Events</CardTitle>
                  <CardDescription>Organize your events into sequences that flow into each other</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-4">
                {/* Unassigned Events Drop Zone */}
                <div
                  className="border-2 border-dashed border-grey-300 rounded-lg p-4 bg-grey-50 min-h-[60px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const componentId = e.dataTransfer.getData('text/plain');
                    if (componentId) {
                      const newSequences = state.sequences.map(seq => ({
                        ...seq,
                        components: seq.components.filter(id => id !== componentId)
                      }));
                      setState({ ...state, sequences: newSequences });
                    }
                  }}
                >
                  <p className="text-grey-500 text-sm italic text-center">
                    {state.selectedComponents.filter(comp =>
                      !state.sequences.some(seq => seq.components.includes(comp.id))
                    ).length > 0
                      ? 'Unassigned events - drag to sequences below'
                      : 'Drop events here to unassign them from sequences'
                    }
                  </p>
                </div>

                {state.sequences.map((sequence, index) => (
                  <div key={sequence.id}>
                    {index > 0 && <AnimatedArrow />}
                    <div className="border border-grey-300 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-grey text-base">{sequence.name}</h4>
                          {(() => {
                            const parents = detectParentSequences(index);
                            return parents.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-grey-500">depends on:</span>
                                {parents.map((parent, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {parent}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          {currentSequenceId === sequence.id && (
                            <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                              Adding to this sequence
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setCurrentSequenceId(sequence.id)}
                            size="sm"
                            variant={currentSequenceId === sequence.id ? "default" : "outline"}
                            className={currentSequenceId === sequence.id ? "bg-primary text-white" : ""}
                          >
                            {currentSequenceId === sequence.id ? "Selected" : "Select for Adding"}
                          </Button>
                          <Button
                            onClick={() => {
                              const newName = prompt('Enter new sequence name:', sequence.name);
                              if (newName) {
                                setState({
                                  ...state,
                                  sequences: state.sequences.map(s =>
                                    s.id === sequence.id ? { ...s, name: newName } : s
                                  )
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Rename
                          </Button>
                          {state.sequences.length > 1 && (
                            <Button
                              onClick={() => {
                                setState({
                                  ...state,
                                  sequences: state.sequences.filter(s => s.id !== sequence.id)
                                });
                              }}
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      <div
                        className="space-y-2 min-h-[50px] p-2 border-2 border-dashed border-grey-200 rounded-lg"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const componentId = e.dataTransfer.getData('text/plain');
                          if (componentId) {
                            let newSequences = state.sequences.map(seq => ({
                              ...seq,
                              components: seq.components.filter(id => id !== componentId)
                            }));

                            if (!newSequences.find(seq => seq.id === sequence.id)?.components.includes(componentId)) {
                              newSequences = newSequences.map(seq => {
                                if (seq.id === sequence.id) {
                                  return { ...seq, components: [...seq.components, componentId] };
                                }
                                return seq;
                              });
                            }

                            setState({ ...state, sequences: newSequences });
                          }
                        }}
                      >
                        {sequence.components.map((componentId) => {
                          const component = state.selectedComponents.find(c => c.id === componentId);
                          if (!component) return null;

                          return (
                            <div key={componentId} className="space-y-2">
                              <div
                                className="flex items-center justify-between p-2 bg-grey-50 rounded-lg cursor-move hover:bg-grey-100 transition-colors"
                                draggable
                                onDragStart={(e) => {
                                  setDraggedComponent(componentId);
                                  setDraggedFromSequence(sequence.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData('text/plain', componentId);
                                }}
                                onDragEnd={() => {
                                  setDraggedComponent(null);
                                  setDraggedFromSequence(null);
                                }}
                              >
                                <div className="flex items-center space-x-3">
                                  <GripVertical className="w-4 h-4 text-grey-400" />
                                  <span className="text-sm font-medium text-grey">{component.name}</span>
                                  <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded">
                                    {component.tag}
                                  </span>
                                </div>
                                <Button
                                  onClick={() => removeComponent(componentId)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              {/* Condition Configuration */}
                              <div className="mt-2 pt-2 border-t border-grey-300 ml-4">
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs font-semibold text-grey">Condition (Optional)</Label>
                                  <div className="flex gap-2">
                                    {state.eventConditions[component.id]?.type && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setState({
                                            ...state,
                                            eventConditions: {
                                              ...state.eventConditions,
                                              [component.id]: {
                                                type: '',
                                                valueSource: '',
                                              }
                                            }
                                          });
                                        }}
                                        className="h-6 text-xs text-red-600 hover:text-red-700"
                                      >
                                        Remove
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingComponentId(component.id);
                                        setConditionalModalOpen(true);
                                      }}
                                      className="h-6 text-xs"
                                    >
                                      {state.eventConditions[component.id]?.type ? 'Edit Condition' : 'Add Condition'}
                                    </Button>
                                  </div>
                                </div>
                                {state.eventConditions[component.id]?.type && (
                                  <div className="space-y-2 p-3 bg-grey-50 rounded-lg border border-grey-200">
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1">
                                        <div className="text-xs font-semibold text-grey-700 mb-1">
                                          {state.eventConditions[component.id].type === 'loop' ? 'Loop Condition' : 'Check Condition'}
                                        </div>
                                        <div className="text-xs text-grey-600 font-mono bg-white px-2 py-1 rounded border border-grey-200">
                                          {(() => {
                                            const cond = state.eventConditions[component.id];
                                            if (!cond.type) return 'No condition';

                                            let valueExpr = '';
                                            if (cond.valueSource === 'index') {
                                              valueExpr = '$Index';
                                            } else if (cond.valueSource === 'input' && cond.inputKey) {
                                              const input = state.featureInputs[cond.inputKey];
                                              if (input && input.type?.toString().startsWith('array')) {
                                                valueExpr = `$Length{$Input{${cond.inputKey}}}`;
                                              } else {
                                                valueExpr = `$Input{${cond.inputKey}}`;
                                              }
                                            } else if (cond.valueSource === 'sequence' && cond.sequenceId && cond.eventId && cond.valueKey) {
                                              const valueRef = `$Sequence{${cond.sequenceId}:${cond.eventId}:${cond.valueKey}}`;
                                              const isArray = cond.valueKey === 'data';
                                              valueExpr = isArray ? `$Length{${valueRef}}` : valueRef;
                                            }

                                            if (cond.type === 'loop') {
                                              if (cond.valueSource === 'index') {
                                                return `for (i = ${cond.init || 0}; i < ${cond.iter || 10}; i++)`;
                                              } else {
                                                return `for (i = 0; ${valueExpr} ${cond.operator || '<'} ${cond.compareValue || ''}; i++)`;
                                              }
                                            } else {
                                              return `${valueExpr} ${cond.operator || '=='} ${cond.compareValue || ''}`;
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {sequence.components.length === 0 && (
                          <p className="text-grey-500 text-sm italic text-center py-4">Drop events here</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={addSequence}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Sequence
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Map Data Between Events */}
        {state.selectedComponents.length > 0 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle>Map Data Between Events</CardTitle>
                  <CardDescription>Define how data flows between events in your sequences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-4">
                {/* Feature Inputs Section */}
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-grey font-medium">Feature Inputs</h4>
                      <p className="text-xs text-grey-600 mt-1">External data that will be passed to your feature when it's called</p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowAddInput(true);
                        setAddInputFromMapping(false);
                        setSourceVariable(null);
                        setNewInputName('');
                        setNewInputType(DataTypes.STRING);
                        setNewInputMinLength(0);
                        setNewInputMaxLength(0);
                      }}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Input Field</span>
                    </Button>
                  </div>

                  {/* Add Input Form */}
                  {showAddInput && (
                    <div ref={addInputFormRef} className="mb-4 p-3 border border-grey-300 rounded-lg bg-grey-50">
                      <h5 className="text-grey font-medium mb-3">Add New Input Field</h5>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Field Name</label>
                  <Input
                            value={newInputName}
                            onChange={(e) => setNewInputName(e.target.value)}
                            placeholder="Enter field name"
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Data Type</label>
                          <Select
                            value={newInputType}
                            onValueChange={(value) => setNewInputType(value as DataTypes)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {DATA_TYPES.map((dataType) => (
                                <SelectItem key={dataType.value} value={dataType.value}>
                                  {dataType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Min Length</label>
                          <Input
                            type="number"
                            value={newInputMinLength}
                            onChange={(e) => setNewInputMinLength(parseInt(e.target.value) || 0)}
                            placeholder="Min length"
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Max Length</label>
                          <Input
                            type="number"
                            value={newInputMaxLength}
                            onChange={(e) => setNewInputMaxLength(parseInt(e.target.value) || 0)}
                            placeholder="Max length"
                            className="h-8"
                          />
                        </div>
                        <Button
                          onClick={addInputField}
                          disabled={!newInputName || !newInputType}
                          size="sm"
                        >
                          Add
                    </Button>
                        <Button
                          onClick={() => {
                            setShowAddInput(false);
                            setNewInputName('');
                            setNewInputType(DataTypes.STRING);
                            setNewInputMinLength(0);
                            setNewInputMaxLength(0);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {Object.entries(state.featureInputs).map(([fieldName, input]) => (
                      <div key={fieldName} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Variable</label>
                          <Input
                            value={fieldName}
                            disabled
                            className="h-8 bg-grey-100"
                          />
                </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Type</label>
                          <Input
                            value={input.type}
                            disabled
                            className="h-8 bg-grey-100"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Min Length</label>
                          <Input
                            value={input.minlength || ''}
                            disabled
                            className="h-8 bg-grey-100"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Max Length</label>
                          <Input
                            value={input.maxlength || ''}
                            disabled
                            className="h-8 bg-grey-100"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-grey font-medium">Value</label>
                          <Input
                            value={`$Input{${fieldName}}`}
                            disabled
                            className="h-8 bg-grey-100"
                          />
                        </div>
                        <button
                          onClick={() => removeInputField(fieldName)}
                          className="h-8 px-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sequences with Events */}
                <div className="mb-3">
                  <h4 className="text-grey font-medium mb-1">Sequences with Events</h4>
                  <p className="text-xs text-grey-600">Each sequence represents a logical group of events. Data flows from one sequence to the next</p>
                </div>
                {state.sequences.map((sequence, sequenceIndex) => (
                  <div key={sequence.id}>
                    <div className="border border-grey-300 rounded-lg p-4">
                      <h4 className="text-grey font-medium mb-4">{sequence.name}</h4>

                      {sequence.components.map((componentId) => {
                        const component = state.selectedComponents.find(c => c.id === componentId);
                        if (!component) return null;

                        return (
                          <div key={componentId} className="mb-4 p-3 bg-grey-50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-grey font-medium">{component.name}</h5>
                              <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded">
                                {component.tag}
                              </span>
                            </div>

                            {/* Event Input Mapping Form */}
                            <div className="mb-3">
                              <p className="text-xs text-grey-600">Map each variable to a data source. Use the dropdowns to select from available options or enter custom values</p>
                            </div>
                            <div className="space-y-3">
                              {(() => {
                                // Get action variables if this is an action-based component
                                const actionVariables = component.action ? extractActionVariables(component.action) : [];

                                // Get component inputs for this component
                                const componentInputs = state.componentInputs[component.id] || {};

                                // Combine action variables and custom inputs
                                const allVariables = [
                                  ...actionVariables.map((variable: any) => ({
                                    ...variable,
                                    key: variable.key || variable.name,
                                    type: 'action',
                                    source: variable.source,
                                    required: variable.required,
                                    description: variable.description,
                                    dataType: variable.type
                                  })),
                                  ...Object.keys(componentInputs)
                                    .filter(key => !actionVariables.some((v: any) => (v.key || v.name) === key))
                                    .map(key => ({
                                      key,
                                      type: 'custom',
                                      source: 'custom',
                                      required: false,
                                      description: '',
                                      dataType: 'string'
                                    }))
                                ];

                                return allVariables.map((variable, index) => {
                                  const currentMapping = dataMappings[component.id]?.[variable.key];
                                  const hasValueSource = currentMapping?.source;

                                  return (
                                  <div key={index} className="space-y-3">
                                    {/* Variable Name Header */}
                                    <div className="p-4 bg-white rounded-lg border border-grey-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-base font-semibold text-grey-800">{variable.key}</h3>
                                        {variable.type === 'action' && (
                                          <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded">
                                            {variable.source}
                                          </span>
                                        )}
                                        {variable.required && (
                                          <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                                            Required
                                          </span>
                                        )}
                                      </div>

                                      {/* Variable Description */}
                                      {variable.description && (
                                        <p className="text-sm text-grey-600 mb-4">{variable.description}</p>
                                      )}

                                      {/* Progressive Disclosure: Fields */}
                                      <div className="space-y-3">
                                        {/* Step 1: Value Source */}
                                        <div>
                                          <label className="text-sm text-grey-800 font-medium mb-1 block">Value Source</label>
                                        <Select
                                          value={dataMappings[component.id]?.[variable.key]?.source || ''}
                                          onValueChange={(value) => {
                                            let code = '';
                                            if (value === 'input') {
                                              code = '';
                                            } else if (value === 'sequence') {
                                              const currentSequence = state.sequences.find(seq => seq.id === currentSequenceId);
                                              const sequenceName = currentSequence?.name?.toLowerCase().replace(/\s+/g, '_') || 'first_sequence';
                                              code = `$Sequence{${sequenceName}}{${component.tag}}{${variable.key}}`;
                                            } else if (value === 'session') {
                                              code = `$Session{${variable.key}}`;
                                            } else if (value === 'auth') {
                                              code = `$Auth{${variable.key}}`;
                                            } else if (value === 'variables') {
                                              code = `$Variables{${variable.key}}`;
                                            } else if (value === 'constants') {
                                              code = `$Constants{${variable.key}}`;
                                            } else if (value === 'hardcode') {
                                              code = variable.defaultValue || variable.sampleValue || '';
                                            } else if (value === 'default') {
                                              code = variable.defaultValue || '';
                                            } else if (value === 'data') {
                                              code = `$Data{${variable.key}}`;
                                            } else if (value === 'filterData') {
                                              code = `$FilterData{${variable.key}}`;
                                            } else if (value === 'operator') {
                                              code = '';
                                            }

                                            setDataMappings(prev => ({
                                              ...prev,
                                              [component.id]: {
                                                ...prev[component.id],
                                                [variable.key]: {
                                                  ...prev[component.id]?.[variable.key],
                                                  source: value as 'input' | 'sequence' | 'session' | 'auth' | 'variables' | 'constants' | 'hardcode' | 'default' | 'data' | 'filterData',
                                                  selectedValue: undefined,
                                                  authField: undefined,
                                                  code: code
                                                }
                                              }
                                            }));
                                          }}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select source" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="input">Feature Input - External data passed to your feature</SelectItem>
                                            {sequenceIndex > 0 && (
                                              <SelectItem value="sequence">Previous Event - Data from earlier events in sequences</SelectItem>
                                            )}
                                            <SelectItem value="session">Session - User session information</SelectItem>
                                            <SelectItem value="auth">Authorization - User authentication data</SelectItem>
                                            <SelectItem value="hardcode">Hard Code - Static value</SelectItem>
                                            <SelectItem value="operator">Operator - Use Ductape operators</SelectItem>
                                            {variable.source === 'data' && (
                                              <SelectItem value="data">Database Data - Field from database action data array</SelectItem>
                                            )}
                                            {variable.source === 'filterData' && (
                                              <SelectItem value="filterData">Database Filter - Field from database action filterData array</SelectItem>
                                            )}
                                            {variable.defaultValue !== undefined && variable.defaultValue !== null && variable.defaultValue !== '' && (
                                              <SelectItem value="default">Default Value - Use field's default value</SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        </div>

                                        {/* Step 2: Value (Progressive Disclosure - only show if source is selected) */}
                                        {hasValueSource && (
                                        <div>
                                          <label className="text-sm text-grey-800 font-medium mb-1 block">Value</label>
                                        {dataMappings[component.id]?.[variable.key]?.source === 'input' ? (
                                          <Select
                                            value={dataMappings[component.id]?.[variable.key]?.inputField || ''}
                                            onValueChange={(value) => {
                                              if (value === 'add-new') {
                                                setSourceVariable(variable);
                                                setNewInputType(variable.dataType || DataTypes.STRING);
                                                setNewInputMinLength(variable.minLength || 0);
                                                setNewInputMaxLength(variable.maxLength || 0);
                                                setAddInputFromMapping(true);
                                                setMappingVariableKey(variable.key);
                                                setMappingComponentId(component.id);
                                                setShowAddInput(true);
                                                setNewInputName(variable.key);
                                                setTimeout(() => {
                                                  if (addInputFormRef.current) {
                                                    addInputFormRef.current.scrollIntoView({
                                                      behavior: 'smooth',
                                                      block: 'start'
                                                    });
                                                  }
                                                }, 100);
                                              } else {
                                                setDataMappings(prev => ({
                                                  ...prev,
                                                  [component.id]: {
                                                    ...prev[component.id],
                                                    [variable.key]: {
                                                      ...prev[component.id]?.[variable.key],
                                                      inputField: value,
                                                      code: `$Input{${value}}`
                                                    }
                                                  }
                                                }));
                                              }
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select feature input" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.keys(state.featureInputs).map(inputKey => (
                                                <SelectItem key={inputKey} value={inputKey}>
                                                  {inputKey}
                                                </SelectItem>
                                              ))}
                                              <SelectItem value="add-new" className="text-primary font-medium">
                                                + Add New Feature Input
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : dataMappings[component.id]?.[variable.key]?.source === 'hardcode' ? (
                                          <Input
                                            value={dataMappings[component.id]?.[variable.key]?.code || variable.defaultValue || variable.sampleValue || ''}
                                            onChange={(e) => {
                                              setDataMappings(prev => ({
                                                ...prev,
                                                [component.id]: {
                                                  ...prev[component.id],
                                                  [variable.key]: {
                                                    ...prev[component.id]?.[variable.key],
                                                    code: e.target.value
                                                  }
                                                }
                                              }));
                                            }}
                                            placeholder="Enter hardcoded value"
                                          />
                                        ) : dataMappings[component.id]?.[variable.key]?.source === 'default' ? (
                                          <div className="flex items-center px-3 py-2 bg-grey-100 border border-grey-300 rounded text-sm text-grey-600">
                                            {variable.defaultValue}
                                            <span className="ml-2 text-xs text-grey-500">(Default Value)</span>
                                          </div>
                                        ) : dataMappings[component.id]?.[variable.key]?.source === 'data' ? (
                                          <div className="flex items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                            <span className="font-medium">Database Data Field</span>
                                            <span className="ml-2 text-xs text-blue-500">({variable.key})</span>
                                          </div>
                                        ) : dataMappings[component.id]?.[variable.key]?.source === 'filterData' ? (
                                          <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                            <span className="font-medium">Database Filter Field</span>
                                            <span className="ml-2 text-xs text-green-500">({variable.key})</span>
                                          </div>
                                        ) : (
                                          <Input
                                            value={dataMappings[component.id]?.[variable.key]?.code || ''}
                                            onChange={(e) => {
                                              setDataMappings(prev => ({
                                                ...prev,
                                                [component.id]: {
                                                  ...prev[component.id],
                                                  [variable.key]: {
                                                    ...prev[component.id]?.[variable.key],
                                                    code: e.target.value
                                                  }
                                                }
                                              }));
                                            }}
                                            placeholder={`e.g., $${dataMappings[component.id]?.[variable.key]?.source?.charAt(0).toUpperCase() + dataMappings[component.id]?.[variable.key]?.source?.slice(1)}{${variable.key}}`}
                                          />
                                        )}
                                        </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  );
                                });
                              })()}

                              {(() => {
                                const actionVariables = component.action ? extractActionVariables(component.action) : [];
                                const componentInputs = state.componentInputs[component.id] || {};
                                const allVariables = [
                                  ...actionVariables.map((v: any) => v.key || v.name),
                                  ...Object.keys(componentInputs).filter(key => !actionVariables.some((v: any) => (v.key || v.name) === key))
                                ];

                                return allVariables.length === 0 ? (
                                  <div className="text-center py-4 text-grey-500 text-sm">
                                    No variables to map for this event
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Arrow between sequences */}
                    {sequenceIndex < state.sequences.length - 1 && (
                      <div className="flex justify-center items-center py-6">
                        <div className="animate-bounce text-grey-400">
                          <ArrowDown className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Define Feature Output */}
        {state.sequences.length > 0 && state.sequences.some(seq => seq.components.length > 0) && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <CardTitle>Define Feature Output</CardTitle>
                  <CardDescription>Define what your feature returns to the caller</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-4">
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>📤 Output Definition:</strong> Define what your feature returns to the caller.
                    Map output fields to response values from your sequences using the dropdown selectors below.
                  </p>
                </div>

                {Object.entries(state.featureOutput).map(([fieldName, value]) => (
                  <div key={fieldName} className="p-4 border border-grey-300 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-grey text-base">{fieldName}</h4>
                      <Button
                        onClick={() => {
                          const newOutput = { ...state.featureOutput };
                          delete newOutput[fieldName];
                          setState({ ...state, featureOutput: newOutput });
                        }}
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-grey font-medium">Output Field Name</label>
                        <Input
                          value={editingFieldNames[fieldName] !== undefined ? editingFieldNames[fieldName] : fieldName}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditingFieldNames(prev => ({
                              ...prev,
                              [fieldName]: newValue
                            }));
                          }}
                          onBlur={(e) => {
                            const newFieldName = e.target.value.trim();
                            if (newFieldName !== fieldName && newFieldName !== '') {
                              const newOutput = { ...state.featureOutput };
                              const currentValue = newOutput[fieldName];
                              delete newOutput[fieldName];
                              newOutput[newFieldName] = currentValue;
                              setState({ ...state, featureOutput: newOutput });
                            }
                            setEditingFieldNames(prev => {
                              const newState = { ...prev };
                              delete newState[fieldName];
                              return newState;
                            });
                          }}
                          onFocus={() => {
                            setEditingFieldNames(prev => ({
                              ...prev,
                              [fieldName]: fieldName
                            }));
                          }}
                          placeholder="Enter output field name"
                          className="h-8"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-grey font-medium">Value Source</label>
                        <Select
                          value={typeof value === 'string' && value.startsWith('$Sequence{') ? 'sequence' :
                            typeof value === 'string' && value.startsWith('$') && !value.startsWith('$Sequence{') ? 'operator' : 'custom'}
                          onValueChange={(source) => {
                            if (source === 'sequence') {
                              const firstSequence = state.sequences[0];
                              const firstEvent = firstSequence?.components?.[0] ?
                                state.selectedComponents.find(c => c.id === firstSequence.components[0]) : null;
                              const eventTag = firstEvent?.tag || firstEvent?.name || 'event';

                              setState({
                                ...state,
                                featureOutput: {
                                  ...state.featureOutput,
                                  [fieldName]: `$Sequence{${firstSequence?.name || 'first_sequence'}}{${eventTag}}{field}`
                                }
                              });
                            } else if (source === 'operator') {
                              setState({
                                ...state,
                                featureOutput: {
                                  ...state.featureOutput,
                                  [fieldName]: '$Add(, )'
                                }
                              });
                            } else {
                              setState({
                                ...state,
                                featureOutput: {
                                  ...state.featureOutput,
                                  [fieldName]: ''
                                }
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequence">From Sequence Response</SelectItem>
                            <SelectItem value="operator">Use Ductape Operators</SelectItem>
                            <SelectItem value="custom">Custom Value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-grey font-medium">Value</label>
                        <Input
                          value={value as string}
                          onChange={(e) => setState({
                            ...state,
                            featureOutput: {
                              ...state.featureOutput,
                              [fieldName]: e.target.value
                            }
                          })}
                          placeholder="Enter custom value or data piping notation"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => {
                    const fieldName = `output_${Object.keys(state.featureOutput).length + 1}`;
                    setState({
                      ...state,
                      featureOutput: {
                        ...state.featureOutput,
                        [fieldName]: ''
                      }
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Output Field
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Generated Code */}
        {Object.keys(state.featureOutput).length > 0 && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div>
                  <CardTitle>Generated Code</CardTitle>
                  <CardDescription>Review and copy the generated TypeScript code for your feature</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-4">
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-800">
                    <strong>🚀 Ready to Use:</strong> Your feature code is generated and ready for integration.
                    Copy the TypeScript code and integrate it into your application. The code includes all your configurations and data mappings.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => copyToClipboard(codeSnippets.ductape)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Ductape Setup
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(codeSnippets.feature)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Feature Definition
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(codeSnippets.sample)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Sample Usage
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(codeSnippets.full)}
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Full Code
                  </Button>
                </div>

                <div className="bg-grey-50 rounded-lg p-4">
                  <pre className="text-sm text-grey-600 whitespace-pre-wrap overflow-x-auto">
                    {codeSnippets.full}
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
          <Button onClick={handleSave} disabled={isCreating || !isFormValid()} className="gap-2">
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
              <Save className="h-4 w-4" />
                Create Feature
              </>
            )}
            </Button>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">How Features Work</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Features are reusable workflows that combine multiple actions and integrations</li>
            <li>Each feature can have multiple sequences that run in parallel or sequentially</li>
            <li>Data flows between events using variable mapping - reference previous outputs using <code className="text-xs bg-grey-200 px-1 rounded">$EventName.field</code></li>
            <li>Use feature inputs to accept parameters from callers (e.g., <code className="text-xs bg-grey-200 px-1 rounded">$Input.userId</code>)</li>
            <li>Feature outputs define what data is returned to the caller - map these to sequence responses or custom values</li>
            <li>Generated code includes TypeScript interfaces and ready-to-use functions for your application</li>
          </ul>
        </div>
      </div>

      {/* Conditional Modal */}
      {editingComponentId && (
        <ConditionalModal
          isOpen={conditionalModalOpen}
          onClose={() => {
            setConditionalModalOpen(false);
            setEditingComponentId(null);
          }}
          onSave={(config) => {
            if (editingComponentId) {
              setState({
                ...state,
                eventConditions: {
                  ...state.eventConditions,
                  [editingComponentId]: config
                }
              });
            }
            setConditionalModalOpen(false);
            setEditingComponentId(null);
          }}
          currentConfig={state.eventConditions[editingComponentId] || null}
          componentName={state.selectedComponents.find(c => c.id === editingComponentId)?.name || 'Event'}
          featureInputs={state.featureInputs}
          sequences={state.sequences}
          selectedComponents={state.selectedComponents}
          componentIndex={state.selectedComponents.findIndex(c => c.id === editingComponentId)}
          onAddInput={(input: any) => {
            // The modal passes an extended input with a name property
            const { name, ...inputWithoutName } = input;
            if (name) {
              setState({
                ...state,
                featureInputs: {
                  ...state.featureInputs,
                  [name]: inputWithoutName
                }
              });
            }
          }}
        />
      )}
    </div>

  )
}
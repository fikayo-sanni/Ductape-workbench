import { useState, useMemo } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Box, Save, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { JobEventTypes } from '@ductape/sdk/dist/types';
import productServices from '@/services/productServices';
import appServices from '@/services/appServices';

interface NewJobTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewJobTabContent({ tabId, data }: NewJobTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Get productId from data
  const productId = data?.productId;

  // Fetch complete product data
  const { data: fetchedProductData, isLoading: isFetchingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId || !user?._id || !user?.public_key || !currentWorkspaceId) return null;

      const response = await productServices.fetchProduct({
        product_id: productId,
        user_id: user._id,
        public_key: user.public_key,
        workspace_id: currentWorkspaceId,
      });
      return response.data;
    },
    enabled: !!productId && !!user?._id && !!user?.public_key && !!currentWorkspaceId,
  });

  // Fetch connected apps with full data
  const { data: productAppsRes, isLoading: isFetchingApps } = useQuery({
    queryKey: ['product-apps', productId],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: productId || '',
      }),
    enabled: !!user?._id && !!user?.public_key && !!currentWorkspaceId && !!productId,
  });

  const connectedApps = productAppsRes?.data || [];

  // Use fetched product data
  const product = fetchedProductData || null;

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    event_type: '',
    parent: '',
    event: '',
    executions: 0,
    intervals: 0,
  });

  const [selectedType, setSelectedType] = useState<JobEventTypes | ''>('');
  const [selectedParent, setSelectedParent] = useState<string | ''>('');

  // Fetch selected app's full details when an app is selected
  const selectedAppData = connectedApps?.find((app: any) =>
    (app.access_tag || app.tag || app.app_tag) === selectedParent
  );
  const selectedAppId = selectedAppData?._id || selectedAppData?.app_id;

  const { data: selectedAppDetails, isLoading: isFetchingSelectedApp } = useQuery({
    queryKey: ['app', selectedAppId],
    queryFn: () => appServices.fetchApp({
      app_id: selectedAppId || '',
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!selectedAppId && !!user?._id && !!user?.public_key && selectedType === JobEventTypes.ACTION,
  });

  const selectedApp = selectedAppDetails?.data || null;

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: product?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    // Auto-generate tag
    if (value && product?.tag) {
      const sanitizedValue = value.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
      setFormData(prev => ({ ...prev, name: value, tag: sanitizedValue }));
    }
  };

  // Get parent options based on selected event type
  const parentOptions = useMemo(() => {
    if (!product) return [];

    if (selectedType === JobEventTypes.ACTION) {
      return connectedApps?.map((app: any) => ({
        label: app.app_name || app.access_tag || app.tag,
        value: app.access_tag || app.tag || app.app_tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.DATABASE_ACTION) {
      return product.databases?.map((db: any) => ({
        label: db.tag,
        value: db.tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.NOTIFICATION) {
      return product.notifications?.map((notif: any) => ({
        label: notif.tag,
        value: notif.tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.PUBLISH) {
      return product.messageBroker?.map((broker: any) => ({
        label: broker.tag,
        value: broker.tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.STORAGE) {
      return product.storage?.map((storage: any) => ({
        label: storage.tag,
        value: storage.tag,
      })) || [];
    }

    if (selectedType === 'FEATURE' as JobEventTypes) {
      return product.features?.map((feature: any) => ({
        label: feature.name || feature.tag,
        value: feature.tag,
      })) || [];
    }

    return [];
  }, [selectedType, product, connectedApps]);

  // Get event options based on selected parent
  const eventOptions = useMemo(() => {
    if (!product || !selectedParent) {
      console.log('eventOptions early return:', { product: !!product, selectedParent });
      return [];
    }

    if (selectedType === JobEventTypes.ACTION) {
      // Use the fetched app data which has full details
      if (!selectedApp) {
        console.log('Waiting for app data to load...');
        return [];
      }

      console.log('ACTION eventOptions:', {
        selectedParent,
        selectedApp: selectedApp?.app_name,
        versions: selectedApp?.versions?.length,
      });

      // Get actions from the latest version of the selected app
      const latestVersion = selectedApp?.versions?.find((v: any) => v.latest) || selectedApp?.versions?.[0];
      const actions = latestVersion?.actions?.map((action: any) => ({
        label: action.name || action.tag,
        value: action.tag,
      })) || [];

      console.log('Found actions:', actions.length, actions);
      return actions;
    }

    if (selectedType === JobEventTypes.DATABASE_ACTION) {
      const selectedDb = product.databases?.find((db: any) => db.tag === selectedParent);
      return selectedDb?.actions?.map((action: any) => ({
        label: action.tag,
        value: action.tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.NOTIFICATION) {
      const selectedNotif = product.notifications?.find((notif: any) => notif.tag === selectedParent);
      return selectedNotif?.messages?.map((message: any) => ({
        label: message.tag,
        value: message.tag,
      })) || [];
    }

    if (selectedType === JobEventTypes.PUBLISH) {
      const selectedBroker = product.messageBroker?.find((broker: any) => broker.tag === selectedParent);
      return selectedBroker?.topics?.map((topic: any) => ({
        label: topic.tag,
        value: topic.tag,
      })) || [];
    }

    if (selectedType === 'FEATURE' as JobEventTypes) {
      // For features, the parent IS the event - return the selected feature
      const selectedFeature = product.features?.find((feature: any) => feature.tag === selectedParent);
      if (selectedFeature) {
        return [{
          label: selectedFeature.name || selectedFeature.tag,
          value: selectedFeature.tag,
        }];
      }
      return [];
    }

    return [];
  }, [selectedType, selectedParent, product, connectedApps, selectedApp]);

  // Filter available event types based on what data exists
  const availableEventTypes = useMemo(() => {
    if (!product) return [];

    const types: JobEventTypes[] = [];

    // ACTION - check if there are connected apps
    if (connectedApps && connectedApps.length > 0) {
      types.push(JobEventTypes.ACTION);
    }

    // DATABASE_ACTION - check if there are databases
    if (product.databases && product.databases.length > 0) {
      types.push(JobEventTypes.DATABASE_ACTION);
    }

    // NOTIFICATION - check if there are notifications
    if (product.notifications && product.notifications.length > 0) {
      types.push(JobEventTypes.NOTIFICATION);
    }

    // PUBLISH - check if there are message brokers
    if (product.messageBroker && product.messageBroker.length > 0) {
      types.push(JobEventTypes.PUBLISH);
    }

    // STORAGE - check if there are storage components
    if (product.storage && product.storage.length > 0) {
      types.push(JobEventTypes.STORAGE);
    }

    // FEATURE - check if there are features
    if (product.features && product.features.length > 0) {
      types.push('FEATURE' as JobEventTypes);
    }

    return types;
  }, [product, connectedApps]);

  // Debug logging - placed after useMemo definitions
  console.log('NewJobTabContent State:', {
    selectedType,
    selectedParent,
    formData,
    connectedAppsCount: connectedApps?.length,
    parentOptionsCount: parentOptions?.length,
    eventOptionsCount: eventOptions?.length,
    isFetchingSelectedApp,
    selectedAppName: selectedApp?.app_name,
    selectedAppVersions: selectedApp?.versions?.length,
    availableEventTypesCount: availableEventTypes.length,
  });

  const { mutateAsync: createJob, isPending: isCreating } = useMutation({
    mutationFn: async (values: typeof formData) => {
      if (!ductape) throw new Error('Product not initialized');
      
      const payload = {
        name: values.name,
        tag: values.tag,
        event_type: values.event_type,
        executions: values.executions,
        intervals: values.intervals,
      };
      
      try {
        const job = await ductape.jobs.create(payload);
        return job;
      } catch (error) {
        console.error('Error in create:', error);
        throw error;
      }
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      closeTab(tabId);
      openTab({
        id: `job-${job._id}-${Date.now()}`,
        type: 'job',
        title: job.name,
        itemId: job._id,
        data: { ...job, componentType: 'job', productName: product?.name },
      });
      toast.success('Job created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create job');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.tag.trim()) {
      toast.error('Please fill in name and tag');
      return;
    }

    if (!formData.event_type) {
      toast.error('Please select an event type');
      return;
    }

    await createJob(formData);
  };

  // Show loading state while fetching data
  if (isFetchingProduct || isFetchingApps) {
    return (
      <div className="h-full overflow-auto bg-grey-100 p-6">
        <div className="max-w-3xl mx-auto flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-grey-600">Loading product data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Creating job for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This job will be automatically connected to your product for scheduled execution
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Box className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Job</h1>
              <p className="text-sm text-grey-600">
                {product?.name ? `Adding to ${product.name}` : 'Configure a scheduled or background job'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Job Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Daily Report Generation"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">A descriptive name for this job</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., daily_report_job"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                />
                <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Unique identifier for this job (auto-generated from job name)
              </p>
            </div>

            <div>
              <Label htmlFor="event_type" className="required">
                Event Type
              </Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, event_type: value, parent: '', event: '' });
                  setSelectedType(value as JobEventTypes);
                  setSelectedParent('');
                }}
              >
                <SelectTrigger id="event_type" className="mt-2">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {availableEventTypes.length > 0 ? (
                    availableEventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').toUpperCase()}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-grey-600 text-center">
                      No event types available. Add apps, databases, features, or other components to this product first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-grey-600 mt-1">
                {availableEventTypes.length > 0
                  ? 'The type of event this job will execute'
                  : 'Add components to this product to enable job creation'}
              </p>
            </div>

            {selectedType && parentOptions.length > 0 && (
              <div>
                <Label htmlFor="parent" className="required">
                  {selectedType === JobEventTypes.ACTION ? 'App' :
                   selectedType === JobEventTypes.DATABASE_ACTION ? 'Database' :
                   selectedType === JobEventTypes.NOTIFICATION ? 'Notification' :
                   selectedType === JobEventTypes.PUBLISH ? 'Message Broker' :
                   selectedType === JobEventTypes.STORAGE ? 'Storage' :
                   selectedType === JobEventTypes.FEATURE ? 'Feature' : 'Parent'}
                </Label>
                <Select
                  value={formData.parent}
                  onValueChange={(value) => {
                    setFormData({ ...formData, parent: value, event: '' });
                    setSelectedParent(value);
                  }}
                >
                  <SelectTrigger id="parent" className="mt-2">
                    <SelectValue placeholder={
                      selectedType === JobEventTypes.ACTION ? 'Select app' :
                      selectedType === JobEventTypes.DATABASE_ACTION ? 'Select database' :
                      selectedType === JobEventTypes.NOTIFICATION ? 'Select notification' :
                      selectedType === JobEventTypes.PUBLISH ? 'Select message broker' :
                      selectedType === JobEventTypes.STORAGE ? 'Select storage' :
                      selectedType === JobEventTypes.FEATURE ? 'Select feature' : 'Select parent component'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-600 mt-1">
                  {selectedType === JobEventTypes.ACTION ? 'Select the app containing the action' :
                   selectedType === JobEventTypes.DATABASE_ACTION ? 'Select the database to monitor' :
                   selectedType === JobEventTypes.NOTIFICATION ? 'Select the notification to trigger' :
                   selectedType === JobEventTypes.PUBLISH ? 'Select the message broker' :
                   selectedType === JobEventTypes.STORAGE ? 'Select the storage to monitor' :
                   selectedType === JobEventTypes.FEATURE ? 'Select the feature to execute' : 'The parent component for this event'}
                </p>
              </div>
            )}

            {selectedParent && (isFetchingSelectedApp ? (
              <div>
                <Label htmlFor="event" className="required">
                  {selectedType === JobEventTypes.ACTION ? 'Action' :
                   selectedType === JobEventTypes.DATABASE_ACTION ? 'Database Action' :
                   selectedType === JobEventTypes.NOTIFICATION ? 'Message' :
                   selectedType === JobEventTypes.PUBLISH ? 'Topic' :
                   selectedType === JobEventTypes.STORAGE ? 'Storage Action' : 'Event'}
                </Label>
                <div className="mt-2 flex items-center gap-2 p-3 rounded-md border border-grey-400 bg-grey-50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-grey-600">
                    {selectedType === JobEventTypes.ACTION ? 'Loading actions...' :
                     'Loading options...'}
                  </span>
                </div>
              </div>
            ) : eventOptions.length > 0 && (
              <div>
                <Label htmlFor="event" className="required">
                  {selectedType === JobEventTypes.ACTION ? 'Action' :
                   selectedType === JobEventTypes.DATABASE_ACTION ? 'Database Action' :
                   selectedType === JobEventTypes.NOTIFICATION ? 'Message' :
                   selectedType === JobEventTypes.PUBLISH ? 'Topic' :
                   selectedType === JobEventTypes.STORAGE ? 'Storage Action' : 'Event'}
                </Label>
                <Select
                  value={formData.event}
                  onValueChange={(value) => setFormData({ ...formData, event: value })}
                >
                  <SelectTrigger id="event" className="mt-2">
                    <SelectValue placeholder={
                      selectedType === JobEventTypes.ACTION ? 'Select action' :
                      selectedType === JobEventTypes.DATABASE_ACTION ? 'Select database action' :
                      selectedType === JobEventTypes.NOTIFICATION ? 'Select message' :
                      selectedType === JobEventTypes.PUBLISH ? 'Select topic' :
                      selectedType === JobEventTypes.STORAGE ? 'Select storage action' : 'Select event'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {eventOptions.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-600 mt-1">
                  {selectedType === JobEventTypes.ACTION ? 'The specific action to execute' :
                   selectedType === JobEventTypes.DATABASE_ACTION ? 'The database action to monitor' :
                   selectedType === JobEventTypes.NOTIFICATION ? 'The message template to send' :
                   selectedType === JobEventTypes.PUBLISH ? 'The topic to publish to' :
                   selectedType === JobEventTypes.STORAGE ? 'The storage action to execute' : 'The specific event to execute'}
                </p>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="executions" className="required">
                  Executions
                </Label>
                <Input
                  id="executions"
                  type="number"
                  placeholder="0"
                  value={formData.executions}
                  onChange={(e) => setFormData({ ...formData, executions: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                  min="0"
                />
                <p className="text-xs text-grey-600 mt-1">Number of times to execute (0 = unlimited)</p>
              </div>

              <div>
                <Label htmlFor="intervals" className="required">
                  Interval (seconds)
                </Label>
                <Input
                  id="intervals"
                  type="number"
                  placeholder="0"
                  value={formData.intervals}
                  onChange={(e) => setFormData({ ...formData, intervals: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                  min="0"
                />
                <p className="text-xs text-grey-600 mt-1">Time between executions in seconds</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={() => closeTab(tabId)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Job
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Job Configuration Tips</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Choose an event type that matches your job's purpose</li>
            <li>Set executions to 0 for continuous jobs</li>
            <li>Interval determines how often the job runs (in seconds)</li>
            <li>Ensure the parent component and event are properly configured</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

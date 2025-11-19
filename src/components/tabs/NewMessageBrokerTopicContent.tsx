import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { toast } from 'react-hot-toast';
import { Layers, Loader2, Save, CheckCircle, XCircle, Check, Info } from 'lucide-react';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

interface NewMessageBrokerTopicContentProps {
  tabId: string;
  data?: any;
}

interface QueueUrlEntry {
  env_slug: string;
  url: string;
}

export default function NewMessageBrokerTopicContent({ tabId, data }: NewMessageBrokerTopicContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract context from data
  const messageBroker = data?.messageBroker;
  const productTag = data?.productTag;
  const productName = data?.productName;
  const productLogo = data?.productLogo;
  const messageBrokerTag = messageBroker?.tag;

  // Get environments and filter for SQS only
  const environments = messageBroker?.envs || [];
  const sqsEnvironments = environments.filter((env: any) =>
    env.type?.toLowerCase() === 'sqs' ||
    env.type?.toLowerCase() === 'aws_sqs' ||
    env.provider?.toLowerCase() === 'sqs' ||
    env.provider?.toLowerCase() === 'aws_sqs'
  );
  const hasSqsEnvironment = sqsEnvironments.length > 0;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  // Initialize queueUrl array based on SQS environments only
  const initialQueueUrls: QueueUrlEntry[] = sqsEnvironments.map((env: any) => ({
    env_slug: env.slug,
    url: '',
  }));

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      description: '',
      queueUrl: initialQueueUrls,
      sample: '{}',
      idempotency: false,
    }
  );

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-topic',
    formData.name || 'New Topic',
    {},
    { formData }
  );

  // Validate JSON sample
  const sampleValidation = useMemo(() => {
    try {
      JSON.parse(formData.sample);
      return {
        isValid: true,
        error: null,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }, [formData.sample]);

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  const { mutateAsync: createTopic, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('SDK not initialized');
      if (!productTag) throw new Error('Product tag missing');
      if (!messageBrokerTag) throw new Error('Message broker tag missing');

      // Parse and validate sample JSON
      let parsedSample;
      try {
        parsedSample = JSON.parse(formData.sample);
      } catch {
        throw new Error('Invalid JSON in sample field');
      }

      // Validate queueUrl for all SQS environments
      const queueUrlArray = formData.queueUrl
        .filter((entry: QueueUrlEntry) => entry.url.trim() !== '')
        .map((entry: QueueUrlEntry) => ({
          env_slug: entry.env_slug,
          url: entry.url,
        }));

      if (hasSqsEnvironment && queueUrlArray.length !== sqsEnvironments.length) {
        throw new Error(`Queue URLs are required for all ${sqsEnvironments.length} SQS environment(s)`);
      }

      // Build the payload
      const payload = {
        name: formData.name,
        tag: `${messageBrokerTag}:${formData.tag}`,
        description: formData.description,
        idempotent: formData.idempotency,
        ...(queueUrlArray.length > 0 && { queueUrls: queueUrlArray }),
        sample: parsedSample,
      };

      // Initialize the app and create the topic
      await (ductape as any).init(productTag);

      alert(JSON.stringify(payload))
      const topic = await (ductape as any).messageBrokers.topics.create(payload);
      return topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageBrokers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', messageBroker?._id] });

      closeTab(tabId);

      // Reopen the message broker tab with refreshed data
      if (messageBroker) {
        openTab({
          id: `message-broker-${messageBroker._id}-${Date.now()}`,
          type: 'message-broker',
          title: messageBroker.name || messageBroker.tag,
          itemId: messageBroker._id,
          data: {
            ...messageBroker,
            componentType: 'message-broker',
            productTag,
            productName,
            productLogo,
          },
        });
      }

      toast.success('Topic created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create topic');
    },
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    if (!formData.tag.trim()) {
      toast.error('Please enter a topic tag');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!formData.sample.trim()) {
      toast.error('Please enter a sample');
      return;
    }

    // Validate sample is valid JSON
    if (!sampleValidation.isValid) {
      toast.error('Sample must be valid JSON');
      return;
    }

    await createTopic();
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const handleNameChange = (value: string) => {
    // Auto-generate tag from name
    const sanitizedTag = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({
      ...formData,
      name: value,
      tag: sanitizedTag,
      // Auto-populate description if it's empty or was previously auto-generated
      description: !formData.description || formData.description.endsWith(' topic')
        ? `${value} topic`
        : formData.description
    });
  };

  const handleQueueUrlChange = (envSlug: string, url: string) => {
    setFormData({
      ...formData,
      queueUrl: formData.queueUrl.map((entry: QueueUrlEntry) =>
        entry.env_slug === envSlug ? { ...entry, url } : entry
      ),
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Product Context Header */}
        {productName && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {productLogo ? (
                  <img
                    src={productLogo}
                    alt={productName}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  productName?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating topic for {messageBroker?.name || messageBroker?.tag}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {productTag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This topic will be automatically connected to your message broker for {productName}
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
              <Layers className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Topic</h1>
              <p className="text-sm text-grey-600">
                {messageBroker?.name ? `Adding to ${messageBroker.name}` : 'Configure topic/queue for message broker'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Variable Parameterization</p>
            <p>Use <code className="bg-blue-100 px-1 rounded">{"{{variableName}}"}</code> to create dynamic parameters in your sample. These will be replaced at runtime with actual values.</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Topic Name */}
          <div>
            <Label htmlFor="name" className="required">
              Topic Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., User Created Event"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for this topic</p>
          </div>

          {/* Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g. user_created"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
              <Button variant="outline" onClick={() => handleNameChange(formData.name)} size="sm">
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Full tag: {messageBrokerTag}:{formData.tag || 'tag'} (auto-generated from topic name)
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="required">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Topic for user creation events"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2"
              rows={3}
            />
            <p className="text-xs text-grey-600 mt-1">Detailed description of this topic's purpose</p>
          </div>

          {/* Idempotency Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-grey-300 bg-grey-50">
            <div className="flex-1">
              <Label htmlFor="idempotency" className="text-sm font-medium text-grey">
                Enable Idempotency
              </Label>
              <p className="text-xs text-grey-600 mt-1">
                Ensures duplicate messages with the same ID are processed only once
              </p>
            </div>
            <Switch
              id="idempotency"
              checked={formData.idempotency}
              onCheckedChange={(checked) => setFormData({ ...formData, idempotency: checked })}
            />
          </div>

          {/* Queue URLs (conditional for SQS environments) */}
          {hasSqsEnvironment && (
            <div>
              <Label className="required">Queue URLs (AWS SQS)</Label>
              <div className="mt-2 space-y-3">
                {formData.queueUrl.map((entry: QueueUrlEntry) => (
                  <div key={entry.env_slug} className="space-y-1">
                    <Label htmlFor={`url-${entry.env_slug}`} className="text-sm text-grey-600 required">
                      {entry.env_slug.toUpperCase()} Environment
                    </Label>
                    <Input
                      id={`url-${entry.env_slug}`}
                      placeholder={`https://sqs.us-east-1.amazonaws.com/123456789012/queue-${entry.env_slug}`}
                      value={entry.url}
                      onChange={(e) => handleQueueUrlChange(entry.env_slug, e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Required queue URLs for AWS SQS environments. Each SQS environment must have a queue URL.
              </p>
            </div>
          )}

          {/* Sample */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="sample" className="required">
                Sample Schema (JSON)
              </Label>
              {formData.sample && formData.sample.trim() !== '{}' && formData.sample.trim() !== '' && (
                <div className="flex items-center gap-1.5">
                  {sampleValidation.isValid ? (
                    <>
                      <Check className="h-4 w-4 text-green" />
                      <span className="text-xs text-green font-medium">Valid JSON</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red" />
                      <span className="text-xs text-red font-medium">Invalid JSON</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <Textarea
              id="sample"
              placeholder={`{
  "userId": "{{userId}}",
  "details": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "email": "{{email}}"
  }
}`}
              value={formData.sample}
              onChange={(e) => setFormData({ ...formData, sample: e.target.value })}
              className={`mt-2 min-h-40 font-mono text-sm ${
                formData.sample && formData.sample.trim() !== '{}' && formData.sample.trim() !== ''
                  ? sampleValidation.isValid
                    ? 'border-green focus:border-green focus:ring-green'
                    : 'border-red focus:border-red focus:ring-red'
                  : ''
              }`}
            />
            {!sampleValidation.isValid && formData.sample && formData.sample.trim() !== '{}' && formData.sample.trim() !== '' && (
              <p className="text-xs text-red mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {sampleValidation.error}
              </p>
            )}
            <p className="text-xs text-grey-600 mt-1">JSON sample representing the message structure. Use {`{{}}`} for variable placeholders.</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Topic
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Topic Configuration Tips</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Use descriptive names that clearly indicate the event or message type</li>
            <li>Sample should represent the actual message structure</li>
            <li>Use {`{{variableName}}`} for dynamic values that will be populated at runtime</li>
            <li>For SQS brokers, provide valid queue URLs for all environments</li>
            <li>Tag format follows: messageBrokerTag:topicTag pattern</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

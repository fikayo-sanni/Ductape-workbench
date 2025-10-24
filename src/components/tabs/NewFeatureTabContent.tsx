import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
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
  HardDrive,
  Database,
  Zap,
  Activity,
  MessageSquare,
  Settings2,
  Box,
  Timer,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';

interface NewFeatureTabContentProps {
  tabId: string;
  type: string;
  data?: any;
}

const featureConfig: Record<
  string,
  {
    icon: any;
    title: string;
    description: string;
    color: string;
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'textarea' | 'select';
      required?: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      description?: string;
    }>;
  }
> = {
  storage: {
    icon: HardDrive,
    title: 'Storage Configuration',
    description: 'Configure cloud storage for file uploads and management',
    color: 'bg-blue-500/10 text-blue-500',
    fields: [
      { name: 'name', label: 'Storage Name', type: 'text', required: true, placeholder: 'e.g., Production Storage' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., prod-storage' },
      {
        name: 'provider',
        label: 'Provider',
        type: 'select',
        required: true,
        options: [
          { value: 'aws-s3', label: 'AWS S3' },
          { value: 'azure-blob', label: 'Azure Blob Storage' },
          { value: 'gcp-cloud-storage', label: 'Google Cloud Storage' },
        ],
      },
      { name: 'bucket', label: 'Bucket/Container Name', type: 'text', required: true, placeholder: 'my-bucket' },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this storage configuration...' },
    ],
  },
  cache: {
    icon: Zap,
    title: 'Cache Configuration',
    description: 'Set up caching to improve performance',
    color: 'bg-yellow/10 text-yellow',
    fields: [
      { name: 'name', label: 'Cache Name', type: 'text', required: true, placeholder: 'e.g., API Cache' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., api-cache' },
      {
        name: 'provider',
        label: 'Provider',
        type: 'select',
        required: true,
        options: [
          { value: 'redis', label: 'Redis' },
          { value: 'memcached', label: 'Memcached' },
          { value: 'in-memory', label: 'In-Memory' },
        ],
      },
      { name: 'ttl', label: 'TTL (seconds)', type: 'text', placeholder: '3600', description: 'Time to live for cached items' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this cache configuration...' },
    ],
  },
  database: {
    icon: Database,
    title: 'Database Configuration',
    description: 'Configure database connections',
    color: 'bg-green/10 text-green',
    fields: [
      { name: 'name', label: 'Database Name', type: 'text', required: true, placeholder: 'e.g., Production DB' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., prod-db' },
      {
        name: 'type',
        label: 'Database Type',
        type: 'select',
        required: true,
        options: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
          { value: 'mongodb', label: 'MongoDB' },
          { value: 'redis', label: 'Redis' },
        ],
      },
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { name: 'port', label: 'Port', type: 'text', placeholder: '5432' },
      { name: 'database', label: 'Database Name', type: 'text', required: true, placeholder: 'mydb' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this database...' },
    ],
  },
  'message-broker': {
    icon: MessageSquare,
    title: 'Message Broker Configuration',
    description: 'Set up message queues and pub/sub systems',
    color: 'bg-purple-500/10 text-purple-500',
    fields: [
      { name: 'name', label: 'Broker Name', type: 'text', required: true, placeholder: 'e.g., Production Queue' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., prod-queue' },
      {
        name: 'type',
        label: 'Broker Type',
        type: 'select',
        required: true,
        options: [
          { value: 'rabbitmq', label: 'RabbitMQ' },
          { value: 'kafka', label: 'Apache Kafka' },
          { value: 'redis', label: 'Redis Pub/Sub' },
          { value: 'sqs', label: 'AWS SQS' },
        ],
      },
      { name: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
      { name: 'port', label: 'Port', type: 'text', placeholder: '5672' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this message broker...' },
    ],
  },
  session: {
    icon: Activity,
    title: 'Session Configuration',
    description: 'Configure session management',
    color: 'bg-orange-500/10 text-orange-500',
    fields: [
      { name: 'name', label: 'Session Name', type: 'text', required: true, placeholder: 'e.g., User Sessions' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., user-sessions' },
      {
        name: 'store',
        label: 'Session Store',
        type: 'select',
        required: true,
        options: [
          { value: 'redis', label: 'Redis' },
          { value: 'memory', label: 'Memory' },
          { value: 'mongodb', label: 'MongoDB' },
        ],
      },
      { name: 'ttl', label: 'Session TTL (seconds)', type: 'text', placeholder: '86400', description: 'Session expiry time' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe session configuration...' },
    ],
  },
  healthcheck: {
    icon: Activity,
    title: 'Health Check Configuration',
    description: 'Set up health monitoring for your services',
    color: 'bg-green/10 text-green',
    fields: [
      { name: 'name', label: 'Health Check Name', type: 'text', required: true, placeholder: 'e.g., API Health' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., api-health' },
      { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/health' },
      { name: 'interval', label: 'Check Interval (seconds)', type: 'text', placeholder: '60' },
      { name: 'timeout', label: 'Timeout (seconds)', type: 'text', placeholder: '10' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this health check...' },
    ],
  },
  notification: {
    icon: MessageSquare,
    title: 'Notification Configuration',
    description: 'Configure notification channels',
    color: 'bg-blue-500/10 text-blue-500',
    fields: [
      { name: 'name', label: 'Notification Name', type: 'text', required: true, placeholder: 'e.g., Email Notifications' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., email-notif' },
      {
        name: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'push', label: 'Push Notification' },
          { value: 'webhook', label: 'Webhook' },
        ],
      },
      { name: 'provider', label: 'Provider', type: 'text', placeholder: 'e.g., SendGrid, Twilio' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this notification setup...' },
    ],
  },
  fallback: {
    icon: Settings2,
    title: 'Fallback Configuration',
    description: 'Define fallback behavior for failed requests',
    color: 'bg-red/10 text-red',
    fields: [
      { name: 'name', label: 'Fallback Name', type: 'text', required: true, placeholder: 'e.g., API Fallback' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., api-fallback' },
      {
        name: 'strategy',
        label: 'Strategy',
        type: 'select',
        required: true,
        options: [
          { value: 'retry', label: 'Retry' },
          { value: 'cache', label: 'Use Cache' },
          { value: 'default', label: 'Default Response' },
        ],
      },
      { name: 'max_retries', label: 'Max Retries', type: 'text', placeholder: '3' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe fallback behavior...' },
    ],
  },
  quota: {
    icon: Timer,
    title: 'Quota Configuration',
    description: 'Set up rate limiting and quotas',
    color: 'bg-orange-500/10 text-orange-500',
    fields: [
      { name: 'name', label: 'Quota Name', type: 'text', required: true, placeholder: 'e.g., API Rate Limit' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., api-quota' },
      { name: 'limit', label: 'Request Limit', type: 'text', required: true, placeholder: '1000' },
      {
        name: 'window',
        label: 'Time Window',
        type: 'select',
        required: true,
        options: [
          { value: 'minute', label: 'Per Minute' },
          { value: 'hour', label: 'Per Hour' },
          { value: 'day', label: 'Per Day' },
          { value: 'month', label: 'Per Month' },
        ],
      },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe quota rules...' },
    ],
  },
  job: {
    icon: Box,
    title: 'Job Configuration',
    description: 'Configure scheduled or background jobs',
    color: 'bg-purple-500/10 text-purple-500',
    fields: [
      { name: 'name', label: 'Job Name', type: 'text', required: true, placeholder: 'e.g., Daily Report' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'e.g., daily-report' },
      {
        name: 'type',
        label: 'Job Type',
        type: 'select',
        required: true,
        options: [
          { value: 'scheduled', label: 'Scheduled (Cron)' },
          { value: 'recurring', label: 'Recurring' },
          { value: 'one-time', label: 'One-time' },
        ],
      },
      { name: 'schedule', label: 'Schedule (Cron)', type: 'text', placeholder: '0 0 * * *', description: 'Cron expression for scheduling' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe what this job does...' },
    ],
  },
};

export default function NewFeatureTabContent({ tabId, type, data }: NewFeatureTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { currentWorkspaceId } = useAuth();

  const config = featureConfig[type] || {
    icon: Settings2,
    title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: `Configure ${type}`,
    color: 'bg-primary/10 text-primary',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter name' },
      { name: 'tag', label: 'Tag', type: 'text', required: true, placeholder: 'Enter tag' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description' },
    ],
  };

  const Icon = config.icon;

  const [formData, setFormData] = useState<Record<string, string>>(
    config.fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );

  const handleSave = async () => {
    // Validate required fields
    const missingFields = config.fields
      .filter((field) => field.required && !formData[field.name]?.trim())
      .map((field) => field.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (!data?.productId) {
      toast.error('No product selected');
      return;
    }

    try {
      // TODO: Implement actual API call
      const newFeature = {
        _id: `${type}-${Date.now()}`,
        ...formData,
        type,
        product_id: data.productId,
        workspace_id: currentWorkspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      closeTab(tabId);

      openTab({
        id: `${type}-${newFeature._id}-${Date.now()}`,
        type: type as any,
        title: formData.name,
        itemId: newFeature._id,
        data: { ...newFeature, componentType: type, productName: data.productName },
      });

      toast.success(`${config.title.replace(' Configuration', '')} created successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to create ${type}`);
    }
  };

  const handleCancel = () => {
    closeTab(tabId);
  };

  const generateTag = () => {
    if (formData.name) {
      const tag = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData({ ...formData, tag });
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">{config.title}</h1>
              <p className="text-sm text-grey-600">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {config.fields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name} className={field.required ? 'required' : ''}>
                {field.label}
              </Label>

              {field.type === 'select' ? (
                <Select
                  value={formData[field.name]}
                  onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
                >
                  <SelectTrigger id={field.name} className="mt-2">
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  rows={4}
                  className="mt-2"
                />
              ) : (
                <div className="flex gap-2 mt-2">
                  <Input
                    id={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    onBlur={field.name === 'name' ? generateTag : undefined}
                  />
                  {field.name === 'tag' && (
                    <Button variant="outline" onClick={generateTag} size="sm">
                      Auto
                    </Button>
                  )}
                </div>
              )}

              {field.description && <p className="text-xs text-grey-600 mt-1">{field.description}</p>}
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Create {config.title.replace(' Configuration', '')}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Configuration Tips</h3>
          <ul className="text-sm text-grey-600 space-y-1 list-disc list-inside">
            <li>Ensure all required fields are properly configured</li>
            <li>Test the configuration in a development environment first</li>
            <li>You can update these settings later from the product view</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

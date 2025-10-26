import { Copy, Eye, EyeOff, Edit, Trash2, Activity, Heart, MessageSquare, Settings2, Box, Timer, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface GenericComponentContentProps {
  component: any;
  type: string;
}

const componentConfig: Record<string, {
  icon: any;
  title: string;
  color: string;
  fields: Array<{ key: string; label: string; secret?: boolean; copyable?: boolean }>;
}> = {
  session: {
    icon: Activity,
    title: 'Session',
    color: 'bg-orange-500/10 text-orange-500',
    fields: [
      { key: 'store', label: 'Session Store', copyable: true },
      { key: 'ttl', label: 'TTL (seconds)', copyable: false },
      { key: 'connection_string', label: 'Connection String', secret: true, copyable: true },
    ],
  },
  healthcheck: {
    icon: Heart,
    title: 'Health Check',
    color: 'bg-green/10 text-green',
    fields: [
      { key: 'endpoint', label: 'Endpoint', copyable: true },
      { key: 'interval', label: 'Check Interval (seconds)', copyable: false },
      { key: 'timeout', label: 'Timeout (seconds)', copyable: false },
      { key: 'retries', label: 'Retry Attempts', copyable: false },
    ],
  },
  notification: {
    icon: Bell,
    title: 'Notification',
    color: 'bg-blue-500/10 text-blue-500',
    fields: [
      { key: 'channel', label: 'Channel', copyable: false },
      { key: 'provider', label: 'Provider', copyable: false },
      { key: 'api_key', label: 'API Key', secret: true, copyable: true },
      { key: 'webhook_url', label: 'Webhook URL', secret: true, copyable: true },
    ],
  },
  fallback: {
    icon: Settings2,
    title: 'Fallback',
    color: 'bg-red/10 text-red',
    fields: [
      { key: 'strategy', label: 'Strategy', copyable: false },
      { key: 'max_retries', label: 'Max Retries', copyable: false },
      { key: 'retry_delay', label: 'Retry Delay (ms)', copyable: false },
      { key: 'fallback_url', label: 'Fallback URL', copyable: true },
    ],
  },
  quota: {
    icon: Timer,
    title: 'Quota',
    color: 'bg-orange-500/10 text-orange-500',
    fields: [
      { key: 'limit', label: 'Request Limit', copyable: false },
      { key: 'window', label: 'Time Window', copyable: false },
      { key: 'scope', label: 'Scope', copyable: false },
      { key: 'exceeded_message', label: 'Exceeded Message', copyable: false },
    ],
  },
  job: {
    icon: Box,
    title: 'Job',
    color: 'bg-purple-500/10 text-purple-500',
    fields: [
      { key: 'type', label: 'Job Type', copyable: false },
      { key: 'schedule', label: 'Schedule (Cron)', copyable: true },
      { key: 'handler', label: 'Handler Function', copyable: true },
      { key: 'timeout', label: 'Timeout (seconds)', copyable: false },
    ],
  },
  'message-broker': {
    icon: MessageSquare,
    title: 'Message Broker',
    color: 'bg-purple-500/10 text-purple-500',
    fields: [
      { key: 'type', label: 'Broker Type', copyable: false },
      { key: 'host', label: 'Host', copyable: true },
      { key: 'port', label: 'Port', copyable: false },
      { key: 'username', label: 'Username', copyable: true },
      { key: 'password', label: 'Password', secret: true, copyable: true },
      { key: 'queue_name', label: 'Queue/Topic Name', copyable: true },
    ],
  },
};

export default function GenericComponentContent({ component, type }: GenericComponentContentProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  const config = componentConfig[type] || {
    icon: Settings2,
    title: type.charAt(0).toUpperCase() + type.slice(1),
    color: 'bg-primary/10 text-primary',
    fields: [],
  };

  const Icon = config.icon;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const renderField = (field: any) => {
    const value = component[field.key];
    if (!value) return null;

    const displayValue = field.secret && !showSecrets ? '•'.repeat(20) : value;

    return (
      <div key={field.key}>
        <label className="text-sm font-medium text-grey-600">{field.label}</label>
        <div className="mt-1 flex items-center gap-2">
          <code className={cn(
            'flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm',
            field.secret && 'break-all'
          )}>
            {displayValue}
          </code>
          {field.copyable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(value, field.label)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const hasSecretFields = config.fields.some(f => f.secret && component[f.key]);

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', config.color)}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">{component.name}</h1>
                <p className="text-sm text-grey-600">{component.tag}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red hover:text-red">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {component.description && (
            <p className="text-grey-600 mt-4">{component.description}</p>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">{config.title} Configuration</h2>
            {hasSecretFields && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
                className="gap-2"
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? 'Hide' : 'Show'}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {config.fields.map(renderField)}

            {/* Render any additional fields not in config */}
            {Object.entries(component).map(([key, value]) => {
              if (
                !['_id', 'name', 'tag', 'description', 'type', 'product_id', 'workspace_id', 'created_at', 'updated_at', 'componentType', 'productName', 'isNew'].includes(key) &&
                !config.fields.find(f => f.key === key) &&
                value
              ) {
                return (
                  <div key={key}>
                    <label className="text-sm font-medium text-grey-600">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </label>
                    <div className="mt-1">
                      <code className="block px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                        {String(value)}
                      </code>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          {hasSecretFields && (
            <div className="mt-4 p-3 bg-yellow/5 border border-yellow/20 rounded-lg">
              <p className="text-sm text-grey-600">
                <strong>Security Note:</strong> Keep sensitive credentials secure and never expose them in client-side code.
              </p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">{config.title} Active</h3>
          <p className="text-sm text-grey-600">
            This {type} configuration is active and available for use in your application.
          </p>
        </div>
      </div>
    </div>
  );
}

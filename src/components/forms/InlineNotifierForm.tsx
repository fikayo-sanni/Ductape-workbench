import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bell, Loader2, CheckCircle, Plus, Upload, Trash2, Eye, EyeOff, ArrowLeft, Slack } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSDKProxy } from '@/services/sdkProxy';
import { useAuth } from '@/store/useAuth';
import { cn } from '@/lib/utils';
import { Notifiers } from '@ductape/sdk/dist/types/enums';
import { z } from 'zod';

interface InlineNotifierFormProps {
  product: {
    _id: string;
    name: string;
    tag: string;
    logo?: string;
    envs: Array<{ slug: string; name?: string; env_name?: string }>;
    workspace_id?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

interface NotifierType {
  id: string;
  label: string;
  selected: boolean;
}

interface EnvConfig {
  slug: string;
  push_notifications?: any;
  emails?: any;
  sms?: any;
  callbacks?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string>;
    body?: string;
  };
  slack?: { webhook_url?: string };
  discord?: { webhook_url?: string };
}

// Zod validation schema
const smtpConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.string().min(1, 'SMTP port is required'),
  sender_email: z.string().email('Invalid sender email'),
  auth: z.object({
    user: z.string().min(1, 'Auth username is required'),
    pass: z.string().min(1, 'Auth password is required'),
  }),
  secure: z.boolean().default(false),
  tls: z.object({
    rejectUnauthorized: z.boolean(),
  }).optional(),
});

const mailgunConfigSchema = z.object({
  apiKey: z.string().min(1, 'Mailgun API key is required'),
  domain: z.string().min(1, 'Mailgun domain is required'),
  sender_email: z.string().email('Invalid sender email'),
  region: z.enum(['us', 'eu']).default('us'),
  baseUrl: z.string().url('Invalid base URL').optional(),
});

const sendgridConfigSchema = z.object({
  apiKey: z.string().min(1, 'SendGrid API key is required'),
  sender_email: z.string().email('Invalid sender email'),
});

const postmarkConfigSchema = z.object({
  serverToken: z.string().min(1, 'Postmark server token is required'),
  sender_email: z.string().email('Invalid sender email'),
  messageStream: z.string().optional(),
});

const brevoConfigSchema = z.object({
  apiKey: z.string().min(1, 'Brevo API key is required'),
  sender_email: z.string().email('Invalid sender email'),
  sender_name: z.string().optional(),
});

const emailConfigSchema = z.object({
  provider: z.enum(['smtp', 'mailgun', 'sendgrid', 'postmark', 'brevo']),
  smtp: smtpConfigSchema.optional(),
  mailgun: mailgunConfigSchema.optional(),
  sendgrid: sendgridConfigSchema.optional(),
  postmark: postmarkConfigSchema.optional(),
  brevo: brevoConfigSchema.optional(),
}).refine((data) => {
  // Ensure provider-specific config exists
  const providerConfig = data[data.provider];
  return providerConfig !== undefined && providerConfig !== null;
}, {
  message: 'Provider-specific configuration is required',
  path: ['provider'],
});

const smsConfigSchema = z.object({
  provider: z.enum(['twilio', 'nexmo', 'plivo']),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  sender: z.string().min(1, 'Sender phone number is required'),
}).refine((data) => {
  if (data.provider === 'twilio') {
    return data.accountSid && data.authToken;
  } else if (data.provider === 'nexmo') {
    return data.apiKey && data.apiSecret;
  } else if (data.provider === 'plivo') {
    return data.apiKey;
  }
  return false;
}, {
  message: 'Provider-specific fields are required',
});

const pushNotificationConfigSchema = z.object({
  type: z.enum(['firebase', 'expo']),
  credentials: z.object({
    type: z.string(),
    project_id: z.string(),
    private_key_id: z.string(),
    private_key: z.string(),
    client_email: z.string().email(),
    client_id: z.string(),
    auth_uri: z.string().url(),
    token_uri: z.string().url(),
    auth_provider_x509_cert_url: z.string().url(),
    client_x509_cert_url: z.string().url(),
  }).optional(),
  databaseUrl: z.string().url().optional(),
}).refine((data) => {
  if (data.type === 'firebase') {
    return data.credentials && data.databaseUrl;
  }
  return true;
}, {
  message: 'Firebase requires credentials and database URL',
});

const callbackConfigSchema = z.object({
  url: z.string().url('Invalid callback URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
  params: z.record(z.string()).optional(),
  body: z.string().optional(),
});

const webhookUrlConfigSchema = z.object({
  webhook_url: z.string().url('Webhook URL is required'),
});

const envConfigSchema = z.object({
  slug: z.string().length(3, 'Environment slug must be 3 characters'),
  push_notifications: pushNotificationConfigSchema.optional().nullable(),
  emails: emailConfigSchema.optional().nullable(),
  sms: smsConfigSchema.optional().nullable(),
  callbacks: callbackConfigSchema.optional().nullable(),
  slack: webhookUrlConfigSchema.optional().nullable(),
  discord: webhookUrlConfigSchema.optional().nullable(),
});

const notifierFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tag: z.string().min(1, 'Tag is required').regex(/^[a-z0-9-]+$/, 'Tag must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  envs: z.array(envConfigSchema).min(1, 'At least one environment must be configured'),
}).refine((data) => {
  // Validate that at least one environment has at least one configured channel
  return data.envs.some(env =>
    env.push_notifications || env.emails || env.sms || env.callbacks || env.slack || env.discord
  );
}, {
  message: 'At least one environment must have a channel configured',
  path: ['envs'],
});

export default function InlineNotifierForm({ product, onCancel, onSuccess }: InlineNotifierFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
  });

  const [selectedNotifiers, setSelectedNotifiers] = useState<NotifierType[]>([
    { id: 'push', label: 'Push Notifications', selected: false },
    { id: 'email', label: 'Email', selected: false },
    { id: 'sms', label: 'SMS', selected: false },
    { id: 'callback', label: 'Callbacks', selected: false },
    { id: 'slack', label: 'Slack', selected: false },
    { id: 'discord', label: 'Discord', selected: false },
  ]);

  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);
  /** Inline validation errors: path -> message (e.g. "name", "tag", "envs.0.emails") */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Clear a field error when user changes that field
  const clearFieldError = (path: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  // Initialize environment configurations
  useEffect(() => {
    if (product?.envs) {
      setEnvConfigs(product.envs.map((env: any) => ({
        slug: env.slug,
        push_notifications: undefined,
        emails: undefined,
        sms: undefined,
        callbacks: undefined,
      })));
    }
  }, [product?.envs]);

  // Proxy configuration
  const proxyConfig = product?.workspace_id && user?._id
    ? {
        workspace_id: product.workspace_id || currentWorkspaceId || '',
        user_id: user._id || '',
        token: user.auth_token || '',
        public_key: user.public_key || '',
      }
    : null;

  // Initialize SDK Proxy
  const sdkProxy = useSDKProxy(proxyConfig);

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const sanitized = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, tag: sanitized }));
    }
  }, [formData.name]);

  const handleNotifierToggle = (id: string) => {
    setSelectedNotifiers((prev) =>
      prev.map((n) => (n.id === id ? { ...n, selected: !n.selected } : n))
    );
  };

  const { mutateAsync: createNotification, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!sdkProxy) throw new Error('SDK proxy not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      const envs = envConfigs.map((config) => {
        const out: Record<string, unknown> = { slug: config.slug };
        // Include each channel when selected and config has it; include when config has it so no env is dropped
        if (selectedNotifiers.find((n) => n.id === 'push')?.selected && config.push_notifications) {
          out.push_notifications = config.push_notifications;
        }
        if (selectedNotifiers.find((n) => n.id === 'email')?.selected && config.emails) {
          out.emails = config.emails;
        }
        if (selectedNotifiers.find((n) => n.id === 'sms')?.selected && config.sms) {
          out.sms = config.sms;
        }
        if (selectedNotifiers.find((n) => n.id === 'callback')?.selected && config.callbacks) {
          out.callbacks = config.callbacks;
        }
        if (selectedNotifiers.find((n) => n.id === 'slack')?.selected && config.slack) {
          out.slack = config.slack;
        }
        if (selectedNotifiers.find((n) => n.id === 'discord')?.selected && config.discord) {
          out.discord = config.discord;
        }
        return out;
      });

      const payload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        envs,
      };

      const notification = await sdkProxy.notifications.create(product.tag, payload);
        return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', product?._id] });
      queryClient.invalidateQueries({ queryKey: ['products', currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['product', product._id] });

      toast.success('Notifier created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Failed to create notifier';
      toast.error(message);
    },
  });

  const handleCreate = async () => {
    setFieldErrors({}); // reset inline errors before validating

    try {
      const envsForValidation = envConfigs.map((config) => {
        const cleanConfig: any = { slug: config.slug };
        if (config.push_notifications) cleanConfig.push_notifications = config.push_notifications;
        if (config.emails) cleanConfig.emails = config.emails;
        if (config.sms) cleanConfig.sms = config.sms;
        if (config.callbacks) cleanConfig.callbacks = config.callbacks;
        if (config.slack) cleanConfig.slack = config.slack;
        if (config.discord) cleanConfig.discord = config.discord;
        return cleanConfig;
      });

      const payload = {
        name: formData.name.trim(),
        tag: formData.tag.trim(),
        description: formData.description?.trim() || '',
        envs: envsForValidation,
      };

      notifierFormSchema.parse(payload);

      const selectedChannels = selectedNotifiers.filter(n => n.selected).map(n => n.id);
      const configuredChannels = new Set<string>();
      envConfigs.forEach(env => {
        if (env.push_notifications) configuredChannels.add('push');
        if (env.emails) configuredChannels.add('email');
        if (env.sms) configuredChannels.add('sms');
        if (env.callbacks) configuredChannels.add('callback');
        if (env.slack) configuredChannels.add('slack');
        if (env.discord) configuredChannels.add('discord');
      });

      const missingConfigs = selectedChannels.filter(ch => !configuredChannels.has(ch));
      if (missingConfigs.length > 0) {
        setFieldErrors({
          channels: `Please configure ${missingConfigs.map(ch => selectedNotifiers.find(n => n.id === ch)?.label).join(', ')} for at least one environment`,
        });
        return;
      }

      await createNotification();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.length > 0 ? err.path.join('.') : 'form';
          errors[path] = err.message;
        });
        setFieldErrors(errors);
      } else {
        setFieldErrors({ form: 'Failed to validate form data' });
      }
      return;
    }
  };

  const isStep1Complete = formData.name.trim() !== '' && formData.tag.trim() !== '';
  const isStep2Complete = selectedNotifiers.some((n) => n.selected);
  const isFormComplete = isStep1Complete && isStep2Complete;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-grey-500 hover:text-grey -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Notifier</h1>
              <p className="text-sm text-grey-600">Adding to {product.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {Object.keys(fieldErrors).length > 0 && (
            <div className="p-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red" role="alert">
              <span className="font-medium">Please fix the following:</span>
              <ul className="mt-1 list-disc list-inside">
                {fieldErrors.name && <li>{fieldErrors.name}</li>}
                {fieldErrors.tag && <li>{fieldErrors.tag}</li>}
                {fieldErrors.channels && <li>{fieldErrors.channels}</li>}
                {fieldErrors.envs && <li>{fieldErrors.envs}</li>}
                {Object.entries(fieldErrors)
                  .filter(([k]) => k.startsWith('envs.'))
                  .map(([path, msg]) => (
                    <li key={path}>{msg}</li>
                  ))}
                {fieldErrors.form && <li>{fieldErrors.form}</li>}
              </ul>
            </div>
          )}

          {/* Step 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className={cn('h-5 w-5', isStep1Complete ? 'text-green' : 'text-grey-400')} />
              <h2 className="text-lg font-semibold text-grey">1. Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="required">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., User Notifications"
                  value={formData.name}
                  onChange={(e) => {
                    clearFieldError('name');
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      description: !formData.description || formData.description.endsWith(' notifier')
                        ? `${name} notifier`
                        : formData.description,
                    });
                  }}
                  onBlur={() => {
                    const result = z.string().min(1, 'Name is required').safeParse(formData.name.trim());
                    if (!result.success) {
                      setFieldErrors((prev) => ({ ...prev, name: result.error.errors[0].message }));
                    }
                  }}
                  className={cn('mt-2', fieldErrors.name && 'border-red focus-visible:ring-red')}
                  autoFocus
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red mt-1" role="alert">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tag" className="required">Tag</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="tag"
                    placeholder="e.g., user-notifications"
                    value={formData.tag}
                    onChange={(e) => {
                      clearFieldError('tag');
                      setFormData({ ...formData, tag: e.target.value });
                    }}
                    onBlur={() => {
                      const tagSchema = z.string().min(1, 'Tag is required').regex(/^[a-z0-9-]+$/, 'Tag must contain only lowercase letters, numbers, and hyphens');
                      const result = tagSchema.safeParse(formData.tag.trim());
                      if (!result.success) {
                        setFieldErrors((prev) => ({ ...prev, tag: result.error.errors[0].message }));
                      }
                    }}
                    className={cn('font-mono', fieldErrors.tag && 'border-red focus-visible:ring-red')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearFieldError('tag');
                      const sanitized = formData.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                      setFormData({ ...formData, tag: sanitized });
                    }}
                    size="sm"
                  >
                    Auto-generate
                  </Button>
                </div>
                {fieldErrors.tag && (
                  <p className="text-sm text-red mt-1" role="alert">{fieldErrors.tag}</p>
                )}
              </div>

              <div>
                <MarkdownEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Describe this notifier..."
                  label="Description"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Select Notifier Types */}
          <div className="border-t border-grey-400 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className={cn('h-5 w-5', isStep2Complete ? 'text-green' : 'text-grey-400')} />
              <h2 className="text-lg font-semibold text-grey">2. Select Channels</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedNotifiers.map((notifier) => (
                <div
                  key={notifier.id}
                  onClick={() => handleNotifierToggle(notifier.id)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-colors cursor-pointer',
                    notifier.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={notifier.selected}
                      onCheckedChange={() => handleNotifierToggle(notifier.id)}
                    />
                    <span className="font-medium text-grey">{notifier.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Environment Configuration */}
          {isStep2Complete && (
            <div className="border-t border-grey-400 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green" />
                <h2 className="text-lg font-semibold text-grey">3. Configure Environments</h2>
              </div>

              {(fieldErrors.envs || fieldErrors.channels || Object.keys(fieldErrors).some((k) => k.startsWith('envs.'))) && (
                <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/30 text-sm text-red" role="alert">
                  {fieldErrors.channels ?? fieldErrors.envs ?? Object.entries(fieldErrors)
                    .filter(([k]) => k.startsWith('envs.'))
                    .map(([, msg]) => msg)
                    .join(' ')}
                </div>
              )}

              <div className="space-y-6">
                {envConfigs.map((config, envIndex) => (
                  <EnvironmentConfigCard
                    key={config.slug}
                    env={product?.envs?.[envIndex]}
                    envConfig={config}
                    selectedNotifiers={selectedNotifiers}
                    onConfigChange={(updatedConfig) => {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.channels;
                        delete next.envs;
                        Object.keys(next).filter((k) => k.startsWith('envs.')).forEach((k) => delete next[k]);
                        return next;
                      });
                      const newConfigs = [...envConfigs];
                      const existingConfig = newConfigs[envIndex] || { slug: config.slug };
                      const mergedConfig = { ...existingConfig, ...updatedConfig };
                      if (mergedConfig.emails === undefined) delete mergedConfig.emails;
                      if (mergedConfig.sms === undefined) delete mergedConfig.sms;
                      if (mergedConfig.push_notifications === undefined) delete mergedConfig.push_notifications;
                      if (mergedConfig.callbacks === undefined) delete mergedConfig.callbacks;
                      newConfigs[envIndex] = mergedConfig;
                      setEnvConfigs(newConfigs);
                    }}
                    envIndex={envIndex}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
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
                  Create Notifier
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvironmentConfigCard({
  env,
  envConfig,
  selectedNotifiers,
  onConfigChange,
  envIndex,
}: {
  env: any;
  envConfig: EnvConfig;
  selectedNotifiers: NotifierType[];
  onConfigChange: (config: EnvConfig) => void;
  envIndex?: number;
}) {
  const selectedChannels = selectedNotifiers.filter((n) => n.selected);

  return (
    <div className="p-4 rounded-lg space-y-4 bg-grey-50 border border-grey-300">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-grey">{env?.env_name || env?.name || envConfig.slug}</h4>
        <span className="text-xs text-grey-600">{selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''}</span>
      </div>

      <Accordion type="multiple" defaultValue={['push', 'email', 'sms', 'callback', 'slack', 'discord']} className="w-full">
        {selectedNotifiers.find((n) => n.id === 'push')?.selected && (
          <AccordionItem value="push" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Push Notifications</div>
                  <div className="text-xs text-grey-600">Configure Firebase or Expo push notifications</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <NotificationTypeConfig
                initialValue={envConfig.push_notifications}
                onFieldChange={(value) => onConfigChange({ ...envConfig, push_notifications: value })}
                envIndex={envIndex}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find((n) => n.id === 'email')?.selected && (
          <AccordionItem value="email" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Email</div>
                  <div className="text-xs text-grey-600">Configure email provider settings (SMTP, Mailgun, SendGrid, Postmark, Brevo)</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <EmailConfig initialValue={envConfig.emails} onFieldChange={(value) => onConfigChange({ ...envConfig, emails: value })} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find((n) => n.id === 'sms')?.selected && (
          <AccordionItem value="sms" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">SMS</div>
                  <div className="text-xs text-grey-600">Configure SMS provider settings</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <SmsConfig initialValue={envConfig.sms} onFieldChange={(value) => onConfigChange({ ...envConfig, sms: value })} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find((n) => n.id === 'callback')?.selected && (
          <AccordionItem value="callback" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Callbacks</div>
                  <div className="text-xs text-grey-600">Configure webhook callback URLs</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <CallbackConfig initialValue={envConfig.callbacks} onFieldChange={(value) => onConfigChange({ ...envConfig, callbacks: value })} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find((n) => n.id === 'slack')?.selected && (
          <AccordionItem value="slack" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4A154B]/10 flex items-center justify-center">
                  <Slack className="h-4 w-4 text-[#4A154B]" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Slack</div>
                  <div className="text-xs text-grey-600">Incoming webhook URL for Slack</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <WebhookUrlConfig
                initialValue={envConfig.slack}
                onFieldChange={(value) => onConfigChange({ ...envConfig, slack: value })}
                placeholder="https://hooks.slack.com/services/..."
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find((n) => n.id === 'discord')?.selected && (
          <AccordionItem value="discord" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
                  <svg className="h-4 w-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C2.632 6.018 2.083 7.795 2.083 9.581c0 .194.015.389.043.583.012.09.02.18.027.27a.066.066 0 0 0 .032.05 18.094 18.094 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 12.58 12.58 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.598 12.598 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 18.2 18.2 0 0 0 6.002-3.03.066.066 0 0 0 .032-.05c.007-.09.014-.18.026-.27.03-.194.043-.389.043-.583 0-1.785-.55-3.562-1.562-5.184a.07.07 0 0 0-.031-.027z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Discord</div>
                  <div className="text-xs text-grey-600">Webhook URL for Discord</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <WebhookUrlConfig
                initialValue={envConfig.discord}
                onFieldChange={(value) => onConfigChange({ ...envConfig, discord: value })}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function WebhookUrlConfig({
  initialValue,
  onFieldChange,
  placeholder,
}: {
  initialValue?: { webhook_url?: string };
  onFieldChange: (value: { webhook_url: string } | undefined) => void;
  placeholder: string;
}) {
  const [url, setUrl] = useState(() => initialValue?.webhook_url ?? '');
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      onFieldChange(undefined);
      return;
    }
    try {
      new URL(trimmed);
      onFieldChange({ webhook_url: trimmed });
    } catch {
      onFieldChange(undefined);
    }
  }, [url, onFieldChange]);
  return (
    <div className="space-y-2">
      <Label>Webhook URL</Label>
      <Input
        placeholder={placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        type="url"
      />
    </div>
  );
}

const defaultCredentials = {
  type: 'service_account',
  project_id: '',
  private_key_id: '',
  private_key: '',
  client_email: '',
  client_id: '',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: '',
};

function NotificationTypeConfig({ initialValue, onFieldChange, envIndex }: { initialValue?: any; onFieldChange: (value: any) => void; envIndex?: number }) {
  const [notificationType, setNotificationType] = useState<'firebase' | 'expo'>(() => {
    if (!initialValue?.type) return 'firebase';
    return initialValue.type === 'expo' || initialValue.type === Notifiers.EXPO ? 'expo' : 'firebase';
  });
  const [credentials, setCredentials] = useState(() => {
    if (!initialValue?.credentials) return defaultCredentials;
    const c = initialValue.credentials;
    return {
      type: c.type || 'service_account',
      project_id: c.project_id || '',
      private_key_id: c.private_key_id || '',
      private_key: c.private_key || '',
      client_email: c.client_email || '',
      client_id: c.client_id || '',
      auth_uri: c.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: c.token_uri || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: c.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: c.client_x509_cert_url || '',
    };
  });
  const [databaseUrl, setDatabaseUrl] = useState(() => initialValue?.databaseUrl ?? '');

  useEffect(() => {
    if (notificationType === 'firebase') {
      // Only call onFieldChange if we have required Firebase credentials, otherwise clear
      if (credentials.project_id && credentials.private_key && credentials.client_email && databaseUrl) {
        onFieldChange({
          type: Notifiers.FIREBASE,
          credentials,
          databaseUrl,
        });
      } else {
        onFieldChange(undefined);
      }
    } else if (notificationType === 'expo') {
      // Expo doesn't require additional config, so we can call it immediately
      onFieldChange({
        type: Notifiers.EXPO,
      });
    }
  }, [notificationType, credentials, databaseUrl, onFieldChange]);

  return (
    <div className="space-y-4">
      <div>
        <Label>Notification Type</Label>
        <Select value={notificationType} onValueChange={(v: any) => setNotificationType(v)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="firebase">Firebase</SelectItem>
            <SelectItem value="expo">Expo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {notificationType === 'firebase' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Firebase Credentials</h4>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string);
                        setCredentials({
                          type: json.type || 'service_account',
                          project_id: json.project_id || '',
                          private_key_id: json.private_key_id || '',
                          private_key: json.private_key || '',
                          client_email: json.client_email || '',
                          client_id: json.client_id || '',
                          auth_uri: json.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
                          token_uri: json.token_uri || 'https://oauth2.googleapis.com/token',
                          auth_provider_x509_cert_url: json.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
                          client_x509_cert_url: json.client_x509_cert_url || '',
                        });
                        toast.success('Service account file loaded successfully');
                      } catch (error) {
                        toast.error('Failed to parse JSON file');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
                id={`firebase-json-upload-${envIndex ?? 0}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`firebase-json-upload-${envIndex ?? 0}`)?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Service Account JSON
              </Button>
            </div>
          </div>

          <div>
            <Label>Database URL</Label>
            <Input
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              className="mt-1"
              placeholder="https://project.firebaseio.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Project ID</Label>
              <Input
                value={credentials.project_id}
                onChange={(e) => setCredentials({ ...credentials, project_id: e.target.value })}
                className="mt-1"
                placeholder="your-project-id"
              />
            </div>
            <div>
              <Label>Client Email</Label>
              <Input
                value={credentials.client_email}
                onChange={(e) => setCredentials({ ...credentials, client_email: e.target.value })}
                className="mt-1"
                placeholder="service@project.iam.gserviceaccount.com"
              />
            </div>
            <div>
              <Label>Client ID</Label>
              <Input
                value={credentials.client_id}
                onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                className="mt-1"
                placeholder="123456789012345678901"
              />
            </div>
            <div>
              <Label>Private Key ID</Label>
              <Input
                value={credentials.private_key_id}
                onChange={(e) => setCredentials({ ...credentials, private_key_id: e.target.value })}
                className="mt-1"
                placeholder="abc123def456..."
              />
            </div>
          </div>

          <div>
            <Label>Private Key</Label>
            <Textarea
              value={credentials.private_key}
              onChange={(e) => setCredentials({ ...credentials, private_key: e.target.value })}
              className="mt-1"
              placeholder="-----BEGIN PRIVATE KEY-----..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Auth URI</Label>
              <Input
                value={credentials.auth_uri}
                onChange={(e) => setCredentials({ ...credentials, auth_uri: e.target.value })}
                className="mt-1"
                placeholder="https://accounts.google.com/o/oauth2/auth"
              />
            </div>
            <div>
              <Label>Token URI</Label>
              <Input
                value={credentials.token_uri}
                onChange={(e) => setCredentials({ ...credentials, token_uri: e.target.value })}
                className="mt-1"
                placeholder="https://oauth2.googleapis.com/token"
              />
            </div>
            <div>
              <Label>Auth Provider X509 Cert URL</Label>
              <Input
                value={credentials.auth_provider_x509_cert_url}
                onChange={(e) => setCredentials({ ...credentials, auth_provider_x509_cert_url: e.target.value })}
                className="mt-1"
                placeholder="https://www.googleapis.com/oauth2/v1/certs"
              />
            </div>
            <div>
              <Label>Client X509 Cert URL</Label>
              <Input
                value={credentials.client_x509_cert_url}
                onChange={(e) => setCredentials({ ...credentials, client_x509_cert_url: e.target.value })}
                className="mt-1"
                placeholder="https://www.googleapis.com/robot/v1/metadata/x509/..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailConfig({ initialValue, onFieldChange }: { initialValue?: any; onFieldChange: (value: any) => void }) {
  const [provider, setProvider] = useState<'smtp' | 'mailgun' | 'sendgrid' | 'postmark' | 'brevo'>(() => (initialValue?.provider as any) || 'smtp');
  const [showSecret, setShowSecret] = useState(false);

  // SMTP config
  const [smtpConfig, setSmtpConfig] = useState(() => {
    const s = initialValue?.smtp;
    if (!s) return { host: '', port: '', sender_email: '', auth_user: '', auth_pass: '', secure: false };
    return {
      host: s.host ?? '',
      port: s.port ?? '',
      sender_email: s.sender_email ?? '',
      auth_user: s.auth?.user ?? '',
      auth_pass: s.auth?.pass ?? '',
      secure: s.secure ?? false,
    };
  });

  // Mailgun config
  const [mailgunConfig, setMailgunConfig] = useState(() => {
    const m = initialValue?.mailgun;
    if (!m) return { apiKey: '', domain: '', sender_email: '', region: 'us', baseUrl: '' };
    return {
      apiKey: m.apiKey ?? '',
      domain: m.domain ?? '',
      sender_email: m.sender_email ?? '',
      region: m.region ?? 'us',
      baseUrl: m.baseUrl ?? '',
    };
  });

  // SendGrid config
  const [sendgridConfig, setSendgridConfig] = useState(() => {
    const s = initialValue?.sendgrid;
    if (!s) return { apiKey: '', sender_email: '' };
    return { apiKey: s.apiKey ?? '', sender_email: s.sender_email ?? '' };
  });

  // Postmark config
  const [postmarkConfig, setPostmarkConfig] = useState(() => {
    const p = initialValue?.postmark;
    if (!p) return { serverToken: '', sender_email: '', messageStream: '' };
    return {
      serverToken: p.serverToken ?? '',
      sender_email: p.sender_email ?? '',
      messageStream: p.messageStream ?? '',
    };
  });

  // Brevo config
  const [brevoConfig, setBrevoConfig] = useState(() => {
    const b = initialValue?.brevo;
    if (!b) return { apiKey: '', sender_email: '', sender_name: '' };
    return {
      apiKey: b.apiKey ?? '',
      sender_email: b.sender_email ?? '',
      sender_name: b.sender_name ?? '',
    };
  });

  useEffect(() => {
    let emailsData: any = {
      provider,
    };

    let hasValidData = false;

    switch (provider) {
      case 'smtp':
        if (smtpConfig.host && smtpConfig.port && smtpConfig.sender_email && smtpConfig.auth_user && smtpConfig.auth_pass) {
          hasValidData = true;
          emailsData.smtp = {
            host: smtpConfig.host,
            port: smtpConfig.port,
            sender_email: smtpConfig.sender_email,
            auth: {
              user: smtpConfig.auth_user,
              pass: smtpConfig.auth_pass,
            },
            secure: smtpConfig.secure,
          };
        }
        break;
      case 'mailgun':
        if (mailgunConfig.apiKey && mailgunConfig.domain && mailgunConfig.sender_email) {
          hasValidData = true;
          emailsData.mailgun = {
            apiKey: mailgunConfig.apiKey,
            domain: mailgunConfig.domain,
            sender_email: mailgunConfig.sender_email,
            region: mailgunConfig.region,
            ...(mailgunConfig.baseUrl && { baseUrl: mailgunConfig.baseUrl }),
          };
        }
        break;
      case 'sendgrid':
        if (sendgridConfig.apiKey && sendgridConfig.sender_email) {
          hasValidData = true;
          emailsData.sendgrid = {
            apiKey: sendgridConfig.apiKey,
            sender_email: sendgridConfig.sender_email,
          };
        }
        break;
      case 'postmark':
        if (postmarkConfig.serverToken && postmarkConfig.sender_email) {
          hasValidData = true;
          emailsData.postmark = {
            serverToken: postmarkConfig.serverToken,
            sender_email: postmarkConfig.sender_email,
            ...(postmarkConfig.messageStream && { messageStream: postmarkConfig.messageStream }),
          };
        }
        break;
      case 'brevo':
        if (brevoConfig.apiKey && brevoConfig.sender_email) {
          hasValidData = true;
          emailsData.brevo = {
            apiKey: brevoConfig.apiKey,
            sender_email: brevoConfig.sender_email,
            ...(brevoConfig.sender_name && { sender_name: brevoConfig.sender_name }),
          };
        }
        break;
    }

    // Call onFieldChange with valid data, or undefined to clear the config
    onFieldChange(hasValidData ? emailsData : undefined);
  }, [provider, smtpConfig, mailgunConfig, sendgridConfig, postmarkConfig, brevoConfig, onFieldChange]);

  // Reset provider-specific fields when provider changes
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider as any);
    // Reset all configs
    setSmtpConfig({ host: '', port: '', sender_email: '', auth_user: '', auth_pass: '', secure: false });
    setMailgunConfig({ apiKey: '', domain: '', sender_email: '', region: 'us', baseUrl: '' });
    setSendgridConfig({ apiKey: '', sender_email: '' });
    setPostmarkConfig({ serverToken: '', sender_email: '', messageStream: '' });
    setBrevoConfig({ apiKey: '', sender_email: '', sender_name: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Email Provider</Label>
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select email provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="smtp">SMTP</SelectItem>
            <SelectItem value="mailgun">Mailgun</SelectItem>
            <SelectItem value="sendgrid">SendGrid</SelectItem>
            <SelectItem value="postmark">Postmark</SelectItem>
            <SelectItem value="brevo">Brevo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SMTP Configuration */}
      {provider === 'smtp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>SMTP Host</Label>
            <Input
              value={smtpConfig.host}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
              className="mt-1"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <Label>Port</Label>
            <Input
              value={smtpConfig.port}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
              className="mt-1"
              placeholder="587"
            />
          </div>
          <div>
            <Label>Sender Email</Label>
            <Input
              value={smtpConfig.sender_email}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_email: e.target.value })}
              className="mt-1"
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <Label>Auth Username</Label>
            <Input
              value={smtpConfig.auth_user}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, auth_user: e.target.value })}
              className="mt-1"
              placeholder="your-username"
            />
          </div>
          <div>
            <Label>Auth Password</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={smtpConfig.auth_pass}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, auth_pass: e.target.value })}
                className="pr-10"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Checkbox
              checked={smtpConfig.secure}
              onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, secure: !!checked })}
            />
            <Label>Use Secure Connection (SSL/TLS)</Label>
          </div>
        </div>
      )}

      {/* Mailgun Configuration */}
      {provider === 'mailgun' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={mailgunConfig.apiKey}
                onChange={(e) => setMailgunConfig({ ...mailgunConfig, apiKey: e.target.value })}
                className="pr-10"
                placeholder="key-xxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Domain</Label>
            <Input
              value={mailgunConfig.domain}
              onChange={(e) => setMailgunConfig({ ...mailgunConfig, domain: e.target.value })}
              className="mt-1"
              placeholder="mg.example.com"
            />
          </div>
          <div className="col-span-2">
            <Label>Base URL (Optional)</Label>
            <Input
              value={mailgunConfig.baseUrl}
              onChange={(e) => setMailgunConfig({ ...mailgunConfig, baseUrl: e.target.value })}
              className="mt-1"
              placeholder="https://api.mailgun.net (leave empty to use default based on region)"
            />
            <p className="text-xs text-grey-600 mt-1">
              Custom base URL for self-hosted Mailgun or testing. Defaults to https://api.mailgun.net (US) or https://api.eu.mailgun.net (EU) if not provided.
            </p>
          </div>
          <div>
            <Label>Region</Label>
            <Select value={mailgunConfig.region} onValueChange={(value) => setMailgunConfig({ ...mailgunConfig, region: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">US (Default)</SelectItem>
                <SelectItem value="eu">EU</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sender Email</Label>
            <Input
              value={mailgunConfig.sender_email}
              onChange={(e) => setMailgunConfig({ ...mailgunConfig, sender_email: e.target.value })}
              className="mt-1"
              placeholder="noreply@example.com"
            />
          </div>
        </div>
      )}

      {/* SendGrid Configuration */}
      {provider === 'sendgrid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={sendgridConfig.apiKey}
                onChange={(e) => setSendgridConfig({ ...sendgridConfig, apiKey: e.target.value })}
                className="pr-10"
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Sender Email</Label>
            <Input
              value={sendgridConfig.sender_email}
              onChange={(e) => setSendgridConfig({ ...sendgridConfig, sender_email: e.target.value })}
              className="mt-1"
              placeholder="noreply@example.com"
            />
          </div>
        </div>
      )}

      {/* Postmark Configuration */}
      {provider === 'postmark' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Server Token</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={postmarkConfig.serverToken}
                onChange={(e) => setPostmarkConfig({ ...postmarkConfig, serverToken: e.target.value })}
                className="pr-10"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Sender Email</Label>
            <Input
              value={postmarkConfig.sender_email}
              onChange={(e) => setPostmarkConfig({ ...postmarkConfig, sender_email: e.target.value })}
              className="mt-1"
              placeholder="noreply@example.com"
            />
          </div>
          <div className="col-span-2">
            <Label>Message Stream (Optional)</Label>
            <Input
              value={postmarkConfig.messageStream}
              onChange={(e) => setPostmarkConfig({ ...postmarkConfig, messageStream: e.target.value })}
              className="mt-1"
              placeholder="outbound (default if not provided)"
            />
            <p className="text-xs text-grey-600 mt-1">
              Message stream ID for organizing emails (e.g., "outbound", "broadcasts"). Defaults to "outbound" if not provided.
            </p>
          </div>
        </div>
      )}

      {/* Brevo Configuration */}
      {provider === 'brevo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={brevoConfig.apiKey}
                onChange={(e) => setBrevoConfig({ ...brevoConfig, apiKey: e.target.value })}
                className="pr-10"
                placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Sender Email</Label>
            <Input
              value={brevoConfig.sender_email}
              onChange={(e) => setBrevoConfig({ ...brevoConfig, sender_email: e.target.value })}
              className="mt-1"
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <Label>Sender Name (Optional)</Label>
            <Input
              value={brevoConfig.sender_name}
              onChange={(e) => setBrevoConfig({ ...brevoConfig, sender_name: e.target.value })}
              className="mt-1"
              placeholder="Your Company Name"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SmsConfig({ initialValue, onFieldChange }: { initialValue?: any; onFieldChange: (value: any) => void }) {
  const [smsConfig, setSmsConfig] = useState(() => {
    if (!initialValue) return { provider: '', accountSid: '', authToken: '', apiKey: '', apiSecret: '', sender: '' };
    return {
      provider: initialValue.provider ?? '',
      accountSid: initialValue.accountSid ?? '',
      authToken: initialValue.authToken ?? '',
      apiKey: initialValue.apiKey ?? '',
      apiSecret: initialValue.apiSecret ?? '',
      sender: initialValue.sender ?? '',
    };
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    // Only call onFieldChange if we have a provider and required fields
    if (!smsConfig.provider || !smsConfig.sender) {
      return;
    }

    let hasValidData = false;
    let smsData: any = {
      provider: smsConfig.provider,
      sender: smsConfig.sender,
    };

    if (smsConfig.provider === 'twilio') {
      if (smsConfig.accountSid && smsConfig.authToken) {
        hasValidData = true;
        smsData.accountSid = smsConfig.accountSid;
        smsData.authToken = smsConfig.authToken;
      }
    } else if (smsConfig.provider === 'nexmo') {
      if (smsConfig.apiKey && smsConfig.apiSecret) {
        hasValidData = true;
        smsData.apiKey = smsConfig.apiKey;
        smsData.apiSecret = smsConfig.apiSecret;
      }
    } else if (smsConfig.provider === 'plivo') {
      if (smsConfig.apiKey) {
        hasValidData = true;
        smsData.apiKey = smsConfig.apiKey;
      }
    }

    // Call onFieldChange with valid data, or undefined to clear the config
    onFieldChange(hasValidData ? smsData : undefined);
  }, [smsConfig, onFieldChange]);

  // Reset provider-specific fields when provider changes
  const handleProviderChange = (provider: string) => {
    setSmsConfig({
      provider,
      accountSid: '',
      authToken: '',
      apiKey: '',
      apiSecret: '',
      sender: smsConfig.sender, // Keep sender
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>SMS Provider</Label>
        <Select value={smsConfig.provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="nexmo">Nexmo (Vonage)</SelectItem>
            <SelectItem value="plivo">Plivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Twilio-specific fields */}
      {smsConfig.provider === 'twilio' && (
        <>
          <div>
            <Label>Account SID</Label>
            <Input
              value={smsConfig.accountSid}
              onChange={(e) => setSmsConfig({ ...smsConfig, accountSid: e.target.value })}
              className="mt-1"
              placeholder="ACxxxxxxxxxx"
            />
          </div>
          <div>
            <Label>Auth Token</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={smsConfig.authToken}
                onChange={(e) => setSmsConfig({ ...smsConfig, authToken: e.target.value })}
                className="pr-10"
                placeholder="Your auth token"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Nexmo-specific fields */}
      {smsConfig.provider === 'nexmo' && (
        <>
          <div>
            <Label>API Key</Label>
            <Input
              value={smsConfig.apiKey}
              onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
              className="mt-1"
              placeholder="Your API key"
            />
          </div>
          <div>
            <Label>API Secret</Label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={smsConfig.apiSecret}
                onChange={(e) => setSmsConfig({ ...smsConfig, apiSecret: e.target.value })}
                className="pr-10"
                placeholder="Your API secret"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Plivo-specific fields */}
      {smsConfig.provider === 'plivo' && (
        <div className="col-span-2">
          <Label>Auth ID (API Key)</Label>
          <Input
            value={smsConfig.apiKey}
            onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
            className="mt-1"
            placeholder="Your Auth ID"
          />
          <p className="text-xs text-grey-600 mt-1">
            Find your Auth ID in your Plivo console
          </p>
        </div>
      )}

      {/* Sender field - common to all providers */}
      {smsConfig.provider && (
        <div className="col-span-2">
          <Label>Sender Phone Number</Label>
          <Input
            value={smsConfig.sender}
            onChange={(e) => setSmsConfig({ ...smsConfig, sender: e.target.value })}
            className="mt-1"
            placeholder="+1415xxxxxxx"
          />
          <p className="text-xs text-grey-600 mt-1">
            {smsConfig.provider === 'twilio' && 'Your Twilio phone number'}
            {smsConfig.provider === 'nexmo' && 'Your Vonage virtual number or sender ID'}
            {smsConfig.provider === 'plivo' && 'Your Plivo phone number'}
          </p>
        </div>
      )}
    </div>
  );
}

function buildRequestFieldsFromInitial(initialValue?: any): Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }> {
  if (!initialValue) return [];
  const fields: Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }> = [];
  let id = 0;
  if (initialValue.headers && typeof initialValue.headers === 'object') {
    for (const [k, v] of Object.entries(initialValue.headers)) {
      fields.push({ id: `field_${id++}`, key: k, value: String(v), addTo: 'headers' });
    }
  }
  if (initialValue.query && typeof initialValue.query === 'object') {
    for (const [k, v] of Object.entries(initialValue.query)) {
      fields.push({ id: `field_${id++}`, key: k, value: String(v), addTo: 'query' });
    }
  }
  if (initialValue.params && typeof initialValue.params === 'object') {
    for (const [k, v] of Object.entries(initialValue.params)) {
      fields.push({ id: `field_${id++}`, key: k, value: String(v), addTo: 'params' });
    }
  }
  if (initialValue.body != null && initialValue.body !== '') {
    fields.push({ id: `field_${id++}`, key: '', value: String(initialValue.body), addTo: 'body' });
  }
  return fields;
}

function CallbackConfig({ initialValue, onFieldChange }: { initialValue?: any; onFieldChange: (value: any) => void }) {
  const [url, setUrl] = useState(() => initialValue?.url ?? '');
  const [method, setMethod] = useState(() => (initialValue?.method as string) || 'POST');
  const [requestFields, setRequestFields] = useState<Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>>(() => buildRequestFieldsFromInitial(initialValue));

  useEffect(() => {
    // Only call onFieldChange if we have a URL, otherwise pass undefined to clear
    if (!url) {
      onFieldChange(undefined);
      return;
    }

    const headers: Record<string, string> = {};
    const query: Record<string, string> = {};
    const params: Record<string, string> = {};
    let body = '';

    requestFields.forEach((item) => {
      if (item.key && item.value) {
        if (item.addTo === 'headers') {
          headers[item.key] = item.value;
        } else if (item.addTo === 'query') {
          query[item.key] = item.value;
        } else if (item.addTo === 'params') {
          params[item.key] = item.value;
        } else if (item.addTo === 'body') {
          body = item.value;
        }
      }
    });

    const newCallbacks = {
      url,
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: body || undefined,
    };

    onFieldChange(newCallbacks);
  }, [url, method, requestFields, onFieldChange]);

  const handleAddField = () => {
    setRequestFields([...requestFields, { id: `field_${Date.now()}`, key: '', value: '', addTo: 'headers' }]);
  };

  const handleRemoveField = (id: string) => {
    setRequestFields(requestFields.filter((f) => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<{ key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>) => {
    setRequestFields(requestFields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Callback URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="col-span-2"
        />
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Request Fields</Label>
        <Button type="button" variant="outline" onClick={handleAddField} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {requestFields.map((field) => (
        <div key={field.id} className="flex gap-2 items-end p-3 bg-white rounded-lg border border-grey-400">
          <div className="flex-1">
            <Label>Key</Label>
            <Input
              placeholder="e.g., Authorization"
              value={field.key}
              onChange={(e) => handleUpdateField(field.id, { key: e.target.value })}
              className="mt-2"
            />
          </div>
          <div className="flex-1">
            <Label>Value</Label>
            <Input
              placeholder="e.g., Bearer <token>"
              value={field.value}
              onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
              className="mt-2"
            />
          </div>
          <div className="flex-1">
            <Label>Add To</Label>
            <Select value={field.addTo} onValueChange={(value) => handleUpdateField(field.id, { addTo: value as any })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headers">Headers</SelectItem>
                <SelectItem value="body">Body</SelectItem>
                <SelectItem value="params">Params</SelectItem>
                <SelectItem value="query">Query</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveField(field.id)} className="mb-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

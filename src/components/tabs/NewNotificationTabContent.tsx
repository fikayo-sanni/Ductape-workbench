import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bell, Loader2, CheckCircle, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Notifiers } from '@ductape/sdk/dist/types/enums';

interface NewNotificationTabContentProps {
  data?: any;
  tabId?: string;
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
    headers?: Array<{ key: string; value: string }>;
    query?: Array<{ key: string; value: string }>;
    params?: Array<{ key: string; value: string }>;
    body?: string;
  };
}

export default function NewNotificationTabContent({ data, tabId }: NewNotificationTabContentProps) {
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
  } : null;

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
  ]);

  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>([]);

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

  // Initialize Ductape SDK for product (only when we have valid credentials)
  const shouldInitDuctape = product?.workspace_id && user?._id && user?.auth_token && user?.public_key;
  const ductape = useDuctape(
    shouldInitDuctape
      ? {
          workspace_id: product.workspace_id,
          user_id: user._id,
          token: user.auth_token,
          public_key: user.public_key,
          type: 'product',
        }
      : {
          workspace_id: '',
          user_id: '',
          token: '',
          public_key: '',
          type: 'product',
        }
  ) as any;

  // Auto-generate tag from name
  useEffect(() => {
    if (formData.name) {
      const sanitized = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, tag: sanitized }));
    }
  }, [formData.name]);

  const handleAutoGenerateTag = () => {
    if (!formData.name) {
      toast.error('Please enter a name first');
      return;
    }
    const sanitized = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, tag: sanitized }));
  };

  const handleNotifierToggle = (id: string) => {
    setSelectedNotifiers(prev =>
      prev.map(n => n.id === id ? { ...n, selected: !n.selected } : n)
    );
  };

  const { mutateAsync: createNotification, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Product not initialized');
      if (!product?.tag) throw new Error('Product tag not found');

      await ductape.init(product.tag);

      const envs = envConfigs.map(config => ({
        slug: config.slug,
        ...(selectedNotifiers.find(n => n.id === 'push')?.selected && config.push_notifications && {
          push_notifications: config.push_notifications,
        }),
        ...(selectedNotifiers.find(n => n.id === 'email')?.selected && config.emails && {
          emails: config.emails,
        }),
        ...(selectedNotifiers.find(n => n.id === 'sms')?.selected && config.sms && {
          sms: config.sms,
        }),
        ...(selectedNotifiers.find(n => n.id === 'callback')?.selected && config.callbacks && {
          callbacks: {
            ...config.callbacks,
            headers: config.callbacks.headers?.reduce((acc, item) => {
              if (item.key && item.value) acc[item.key] = item.value;
              return acc;
            }, {} as Record<string, string>),
            query: config.callbacks.query?.reduce((acc, item) => {
              if (item.key && item.value) acc[item.key] = item.value;
              return acc;
            }, {} as Record<string, string>),
            params: config.callbacks.params?.reduce((acc, item) => {
              if (item.key && item.value) acc[item.key] = item.value;
              return acc;
            }, {} as Record<string, string>),
          },
        }),
      }));

      const payload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        envs,
      };

      const notification = await ductape.notifications.create(payload);
      return notification;
    },
    onSuccess: (notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', product?._id] });
      closeTab(tabId || '');
      openTab({
        id: `notification-${notification._id}-${Date.now()}`,
        type: 'notifier',
        title: notification.name,
        itemId: notification._id,
        data: { ...notification, componentType: 'notifier', productName: product?.name },
      });
      toast.success('Notifier created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create notifier');
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!formData.tag.trim()) {
      toast.error('Please enter a tag');
      return;
    }
    const hasSelection = selectedNotifiers.some(n => n.selected);
    if (!hasSelection) {
      toast.error('Please select at least one notifier type');
      return;
    }
    
    createNotification();
  };

  const isStep1Complete = formData.name.trim() !== '' && formData.tag.trim() !== '';
  const isStep2Complete = selectedNotifiers.some(n => n.selected);
  const isFormComplete = isStep1Complete && isStep2Complete;

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Product Context */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-grey">
                  Create Notifier for {product.name}
                </h2>
                <p className="text-sm text-grey-600">Configure notification channels</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">Create New Notifier</h1>
              <p className="text-sm text-grey-600">Set up notification channels for your product</p>
            </div>
          </div>
        </div>

        {/* Form - Single Page Progressive Disclosure */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Step 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className={cn(
                "h-5 w-5",
                isStep1Complete ? "text-green" : "text-grey-400"
              )} />
              <h2 className="text-lg font-semibold text-grey">1. Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="required">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., User Notifications"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="tag" className="required">Tag</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="tag"
                    placeholder="e.g., user-notifications"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoGenerateTag}
                    size="sm"
                  >
                    Auto-generate
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this notifier..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Select Notifier Types */}
          <div className="border-t border-grey-400 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className={cn(
                "h-5 w-5",
                isStep2Complete ? "text-green" : "text-grey-400"
              )} />
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

              <div className="space-y-6">
                {envConfigs.map((config, envIndex) => (
                  <EnvironmentConfigCard
                    key={config.slug}
                    env={product?.envs?.[envIndex]}
                    envConfig={config}
                    selectedNotifiers={selectedNotifiers}
                    onConfigChange={(updatedConfig) => {
                      const newConfigs = [...envConfigs];
                      newConfigs[envIndex] = updatedConfig;
                      setEnvConfigs(newConfigs);
                    }}
                    previousConfigs={envIndex > 0 ? envConfigs.slice(0, envIndex) : []}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeTab(tabId || '')}
              disabled={isCreating}
            >
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
  previousConfigs,
}: {
  env: any;
  envConfig: EnvConfig;
  selectedNotifiers: NotifierType[];
  onConfigChange: (config: EnvConfig) => void;
  previousConfigs?: EnvConfig[];
}) {
  const selectedChannels = selectedNotifiers.filter(n => n.selected);

  return (
    <div className="border border-grey-400 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="bg-grey-100 px-6 py-4 border-b border-grey-400">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-grey">{env?.env_name || envConfig.slug}</h3>
              <p className="text-xs text-grey-600">{selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
        </div>
        {previousConfigs && previousConfigs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-grey-600">Quick copy:</span>
            <div className="flex gap-2 flex-wrap">
              {previousConfigs.map((prevConfig, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onConfigChange({ ...prevConfig, slug: envConfig.slug });
                    toast.success(`Copied configuration from ${prevConfig.slug}`);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {prevConfig.slug}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Channels - Progressive Disclosure */}
      <Accordion type="multiple" className="w-full">
        {selectedNotifiers.find(n => n.id === 'push')?.selected && (
          <AccordionItem value="push" className="border-b border-grey-400 last:border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
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
            <AccordionContent className="px-6 pb-6">
              <NotificationTypeConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'email')?.selected && (
          <AccordionItem value="email" className="border-b border-grey-400 last:border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-grey">Email</div>
                  <div className="text-xs text-grey-600">Configure SMTP email settings</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <EmailConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'sms')?.selected && (
          <AccordionItem value="sms" className="border-b border-grey-400 last:border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
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
            <AccordionContent className="px-6 pb-6">
              <SmsConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'callback')?.selected && (
          <AccordionItem value="callback" className="border-b border-grey-400 last:border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
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
            <AccordionContent className="px-6 pb-6">
              <CallbackConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

// Individual configuration components for each notifier type
function NotificationTypeConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [notificationType, setNotificationType] = useState<'firebase' | 'expo'>('firebase');
  
  const [credentials, setCredentials] = useState({
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
  });
  const [databaseUrl, setDatabaseUrl] = useState('');

  useEffect(() => {
    if (notificationType === 'firebase') {
      onConfigChange({
        ...envConfig,
        push_notifications: {
          type: Notifiers.FIREBASE,
          credentials,
          databaseUrl,
        },
      });
    } else {
      onConfigChange({
        ...envConfig,
        push_notifications: {
          type: Notifiers.EXPO,
        },
      });
    }
  }, [notificationType, credentials, databaseUrl, envConfig, onConfigChange]);

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
          <h4 className="text-sm font-medium">Firebase Credentials</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Input
                value={credentials.type}
                onChange={(e) => setCredentials({ ...credentials, type: e.target.value })}
                className="mt-1"
                placeholder="service_account"
              />
            </div>
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
              <Label>Private Key ID</Label>
              <Input
                value={credentials.private_key_id}
                onChange={(e) => setCredentials({ ...credentials, private_key_id: e.target.value })}
                className="mt-1"
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
              />
            </div>
            <div>
              <Label>Auth URI</Label>
              <Input
                value={credentials.auth_uri}
                onChange={(e) => setCredentials({ ...credentials, auth_uri: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Token URI</Label>
              <Input
                value={credentials.token_uri}
                onChange={(e) => setCredentials({ ...credentials, token_uri: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Auth Provider X509 Cert URL</Label>
              <Input
                value={credentials.auth_provider_x509_cert_url}
                onChange={(e) => setCredentials({ ...credentials, auth_provider_x509_cert_url: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label>Private Key</Label>
              <Textarea
                value={credentials.private_key}
                onChange={(e) => setCredentials({ ...credentials, private_key: e.target.value })}
                className="mt-1"
                placeholder="-----BEGIN PRIVATE KEY-----..."
                rows={4}
              />
            </div>
            <div className="col-span-2">
              <Label>Database URL</Label>
              <Input
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                className="mt-1"
                placeholder="https://project.firebaseio.com"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    sender_email: '',
    auth_user: '',
    auth_pass: '',
    secure: false,
  });

  useEffect(() => {
    onConfigChange({
      ...envConfig,
      emails: emailConfig,
    });
  }, [emailConfig, envConfig, onConfigChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>SMTP Host</Label>
        <Input
          value={emailConfig.host}
          onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
          className="mt-1"
          placeholder="smtp.gmail.com"
        />
      </div>
      <div>
        <Label>Port</Label>
        <Input
          value={emailConfig.port}
          onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })}
          className="mt-1"
          placeholder="587"
        />
      </div>
      <div>
        <Label>Sender Email</Label>
        <Input
          value={emailConfig.sender_email}
          onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
          className="mt-1"
          placeholder="noreply@example.com"
        />
      </div>
      <div>
        <Label>Auth Username</Label>
        <Input
          value={emailConfig.auth_user}
          onChange={(e) => setEmailConfig({ ...emailConfig, auth_user: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Auth Password</Label>
        <Input
          type="password"
          value={emailConfig.auth_pass}
          onChange={(e) => setEmailConfig({ ...emailConfig, auth_pass: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2 mt-6">
        <Checkbox
          checked={emailConfig.secure}
          onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, secure: !!checked })}
        />
        <Label>Use Secure Connection</Label>
      </div>
    </div>
  );
}

function SmsConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [smsConfig, setSmsConfig] = useState({
    provider: '',
    accountSid: '',
    authToken: '',
    sender: '',
  });

  useEffect(() => {
    onConfigChange({
      ...envConfig,
      sms: smsConfig,
    });
  }, [smsConfig, envConfig, onConfigChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>SMS Provider</Label>
        <Select value={smsConfig.provider} onValueChange={(v) => setSmsConfig({ ...smsConfig, provider: v })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="aws-sns">AWS SNS</SelectItem>
            <SelectItem value="sendgrid">SendGrid</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
        <Input
          type="password"
          value={smsConfig.authToken}
          onChange={(e) => setSmsConfig({ ...smsConfig, authToken: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Sender Number</Label>
        <Input
          value={smsConfig.sender}
          onChange={(e) => setSmsConfig({ ...smsConfig, sender: e.target.value })}
          className="mt-1"
          placeholder="+1415xxxxxxx"
        />
      </div>
    </div>
  );
}

function CallbackConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [query, setQuery] = useState<Array<{ key: string; value: string }>>([]);
  const [params, setParams] = useState<Array<{ key: string; value: string }>>([]);
  const [body, setBody] = useState('');

  useEffect(() => {
    onConfigChange({
      ...envConfig,
      callbacks: { url, method, headers, query, params, body },
    });
  }, [url, method, headers, query, params, body, envConfig, onConfigChange]);

  const handleAddPair = (type: 'headers' | 'query' | 'params') => {
    const newPair = { key: '', value: '' };
    if (type === 'headers') setHeaders([...headers, newPair]);
    if (type === 'query') setQuery([...query, newPair]);
    if (type === 'params') setParams([...params, newPair]);
  };

  const handleUpdatePair = (
    type: 'headers' | 'query' | 'params',
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    if (type === 'headers') {
      const newHeaders = [...headers];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      setHeaders(newHeaders);
    }
    if (type === 'query') {
      const newQuery = [...query];
      newQuery[index] = { ...newQuery[index], [field]: value };
      setQuery(newQuery);
    }
    if (type === 'params') {
      const newParams = [...params];
      newParams[index] = { ...newParams[index], [field]: value };
      setParams(newParams);
    }
  };

  const handleRemovePair = (type: 'headers' | 'query' | 'params', index: number) => {
    if (type === 'headers') setHeaders(headers.filter((_, i) => i !== index));
    if (type === 'query') setQuery(query.filter((_, i) => i !== index));
    if (type === 'params') setParams(params.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* URL and Method */}
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

      {/* Headers */}
      <div className="space-y-2">
        <Label>Headers</Label>
        {headers.map((pair, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Key"
              value={pair.key}
              onChange={(e) => handleUpdatePair('headers', index, 'key', e.target.value)}
            />
            <Input
              placeholder="Value"
              value={pair.value}
              onChange={(e) => handleUpdatePair('headers', index, 'value', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemovePair('headers', index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddPair('headers')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Header
        </Button>
      </div>

      {/* Query Params */}
      <div className="space-y-2">
        <Label>Query Parameters</Label>
        {query.map((pair, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Key"
              value={pair.key}
              onChange={(e) => handleUpdatePair('query', index, 'key', e.target.value)}
            />
            <Input
              placeholder="Value"
              value={pair.value}
              onChange={(e) => handleUpdatePair('query', index, 'value', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemovePair('query', index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddPair('query')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Query Param
        </Button>
      </div>

      {/* Path Params */}
      <div className="space-y-2">
        <Label>Path Parameters</Label>
        {params.map((pair, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Key"
              value={pair.key}
              onChange={(e) => handleUpdatePair('params', index, 'key', e.target.value)}
            />
            <Input
              placeholder="Value"
              value={pair.value}
              onChange={(e) => handleUpdatePair('params', index, 'value', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemovePair('params', index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddPair('params')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Path Param
        </Button>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label>Request Body (JSON)</Label>
        <Textarea
          placeholder='{"key": "value"}'
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}

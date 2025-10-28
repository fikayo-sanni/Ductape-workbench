import { useState, useEffect } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
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
import { Bell, Loader2, CheckCircle, Plus, Upload, Trash2 } from 'lucide-react';
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
            url: config.callbacks.url,
            method: config.callbacks.method,
            headers: config.callbacks.headers?.length ? {
              ...config.callbacks.headers.reduce((acc, item) => {
                if (item.key && item.value) acc[item.key] = item.value;
                return acc;
              }, {} as Record<string, string>)
            } : undefined,
            query: config.callbacks.query?.length ? {
              ...config.callbacks.query.reduce((acc, item) => {
                if (item.key && item.value) acc[item.key] = item.value;
                return acc;
              }, {} as Record<string, string>)
            } : undefined,
            params: config.callbacks.params?.length ? {
              ...config.callbacks.params.reduce((acc, item) => {
                if (item.key && item.value) acc[item.key] = item.value;
                return acc;
              }, {} as Record<string, string>)
            } : undefined,
            body: config.callbacks.body,
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
                    envIndex={envIndex}
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
  envIndex,
}: {
  env: any;
  envConfig: EnvConfig;
  selectedNotifiers: NotifierType[];
  onConfigChange: (config: EnvConfig) => void;
  previousConfigs?: EnvConfig[];
  envIndex?: number;
}) {
  const selectedChannels = selectedNotifiers.filter(n => n.selected);

  return (
    <div className="p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-grey">{env?.env_name || envConfig.slug}</h4>
        <span className="text-xs text-grey-600">{selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''}</span>
      </div>

      {previousConfigs && previousConfigs.length > 0 && (
        <div className="flex items-center gap-2 pb-2 border-b border-grey-300">
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

      {/* Channels - Progressive Disclosure */}
      <Accordion type="multiple" className="w-full">
        {selectedNotifiers.find(n => n.id === 'push')?.selected && (
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
              <NotificationTypeConfig envConfig={envConfig} onConfigChange={onConfigChange} envIndex={envIndex} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'email')?.selected && (
          <AccordionItem value="email" className="border-b border-grey-300 last:border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
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
            <AccordionContent className="py-4">
              <EmailConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'sms')?.selected && (
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
              <SmsConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'callback')?.selected && (
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
              <CallbackConfig envConfig={envConfig} onConfigChange={onConfigChange} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

// Individual configuration components for each notifier type
function NotificationTypeConfig({ envConfig, onConfigChange, envIndex }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void; envIndex?: number }) {
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

          {/* Info box explaining what the upload does */}
          <div className="border border-grey-300 rounded-lg p-4 bg-grey-100/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-semibold">i</span>
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-medium text-grey mb-1">Upload Service Account File</h5>
                <p className="text-sm text-grey-600 leading-relaxed">
                  Save time by uploading your Firebase service account JSON file. The upload will automatically populate
                  all credential fields below (project ID, private key, client email, etc.), eliminating the need to
                  manually copy and paste each value. You can still edit any field after uploading.
                </p>
              </div>
            </div>
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
  const [requestFields, setRequestFields] = useState<Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>>([]);

  useEffect(() => {
    // Build headers, query, params, and body arrays to match the interface
    const headers: Array<{ key: string; value: string }> = [];
    const query: Array<{ key: string; value: string }> = [];
    const params: Array<{ key: string; value: string }> = [];
    let body = '';

    requestFields.forEach(item => {
      if (item.key && item.value) {
        if (item.addTo === 'headers') {
          headers.push({ key: item.key, value: item.value });
        } else if (item.addTo === 'query') {
          query.push({ key: item.key, value: item.value });
        } else if (item.addTo === 'params') {
          params.push({ key: item.key, value: item.value });
        } else if (item.addTo === 'body') {
          body = item.value;
        }
      }
    });

    onConfigChange({
      ...envConfig,
      callbacks: { 
        url, 
        method, 
        headers: headers.length > 0 ? headers : undefined,
        query: query.length > 0 ? query : undefined,
        params: params.length > 0 ? params : undefined,
        body: body || undefined,
      },
    });
  }, [url, method, requestFields, envConfig, onConfigChange]);

  const handleAddField = () => {
    const newField = { 
      id: `field_${Date.now()}`, 
      key: '', 
      value: '', 
      addTo: 'headers' as const 
    };
    setRequestFields([...requestFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setRequestFields(requestFields.filter(f => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<{ key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>) => {
    setRequestFields(requestFields.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
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

      <div className="flex items-center justify-between">
        <Label>Request Fields</Label>
        <Button
          type="button"
          variant="outline"
          onClick={handleAddField}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {requestFields.map((field) => (
        <div key={field.id} className="flex gap-2 items-end p-3 bg-grey-50 rounded-lg border border-grey-400">
          <div className="flex-1">
            <Label>Key</Label>
            <Input
              placeholder="e.g., Authorization"
              value={field.key}
              onChange={(e) =>
                handleUpdateField(field.id, { key: e.target.value })
              }
              className="mt-2"
            />
          </div>

          <div className="flex-1">
            <Label>Value</Label>
            <Input
              placeholder="e.g., Bearer <token>"
              value={field.value}
              onChange={(e) =>
                handleUpdateField(field.id, { value: e.target.value })
              }
              className="mt-2"
            />
          </div>

          <div className="flex-1">
            <Label>Add To</Label>
            <Select
              value={field.addTo}
              onValueChange={(value) =>
                handleUpdateField(field.id, { addTo: value as 'headers' | 'body' | 'params' | 'query' })
              }
            >
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

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => handleRemoveField(field.id)}
            disabled={requestFields.length === 0}
            className="mb-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <p className="text-xs text-grey-600 mt-2">
        Configure how the callback request should be constructed with fields that can be added to headers, query parameters, path parameters, or the request body.
      </p>
    </div>
  );
}

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
import { Bell, Loader2, CheckCircle, Plus, Upload, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSDKProxy } from '@/services/sdkProxy';
import { useAuth } from '@/store/useAuth';
import { cn } from '@/lib/utils';
import { Notifiers } from '@ductape/sdk/dist/types/enums';

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
}

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

      const envs = envConfigs.map((config) => ({
        slug: config.slug,
        ...(selectedNotifiers.find((n) => n.id === 'push')?.selected && config.push_notifications && {
          push_notifications: config.push_notifications,
        }),
        ...(selectedNotifiers.find((n) => n.id === 'email')?.selected && config.emails && {
          emails: config.emails,
        }),
        ...(selectedNotifiers.find((n) => n.id === 'sms')?.selected && config.sms && {
          sms: config.sms,
        }),
        ...(selectedNotifiers.find((n) => n.id === 'callback')?.selected && config.callbacks && {
          callbacks: config.callbacks,
        }),
      }));

      const payload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        envs,
      };

      alert(JSON.stringify(payload, null, 2));

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
      toast.error(error.message || 'Failed to create notifier');
    },
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!formData.tag.trim()) {
      toast.error('Please enter a tag');
      return;
    }
    const hasSelection = selectedNotifiers.some((n) => n.selected);
    if (!hasSelection) {
      toast.error('Please select at least one notifier type');
      return;
    }

    await createNotification();
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
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      description: !formData.description || formData.description.endsWith(' notifier')
                        ? `${name} notifier`
                        : formData.description,
                    });
                  }}
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
                    onClick={() => {
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

      <Accordion type="multiple" defaultValue={['push', 'email', 'sms', 'callback']} className="w-full">
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
                  <div className="text-xs text-grey-600">Configure SMTP email settings</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">
              <EmailConfig onFieldChange={(value) => onConfigChange({ ...envConfig, emails: value })} />
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
              <SmsConfig onFieldChange={(value) => onConfigChange({ ...envConfig, sms: value })} />
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
              <CallbackConfig onFieldChange={(value) => onConfigChange({ ...envConfig, callbacks: value })} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function NotificationTypeConfig({ onFieldChange, envIndex }: { onFieldChange: (value: any) => void; envIndex?: number }) {
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
      onFieldChange({
        type: Notifiers.FIREBASE,
        credentials,
        databaseUrl,
      });
    } else {
      onFieldChange({
        type: Notifiers.EXPO,
      });
    }
  }, [notificationType, credentials, databaseUrl]);

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

function EmailConfig({ onFieldChange }: { onFieldChange: (value: any) => void }) {
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    sender_email: '',
    auth_user: '',
    auth_pass: '',
    secure: false,
  });

  useEffect(() => {
    const emailsData = {
      host: emailConfig.host,
      port: emailConfig.port,
      sender_email: emailConfig.sender_email,
      auth: {
        user: emailConfig.auth_user,
        pass: emailConfig.auth_pass,
      },
      secure: emailConfig.secure,
    };

    onFieldChange(emailsData);
  }, [emailConfig]);

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

function SmsConfig({ onFieldChange }: { onFieldChange: (value: any) => void }) {
  const [smsConfig, setSmsConfig] = useState({
    provider: '',
    // Twilio fields
    accountSid: '',
    authToken: '',
    // Nexmo/Plivo fields
    apiKey: '',
    apiSecret: '',
    // Common field
    sender: '',
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    // Build provider-specific config
    let smsData: any = {
      provider: smsConfig.provider,
      sender: smsConfig.sender,
    };

    if (smsConfig.provider === 'twilio') {
      smsData.accountSid = smsConfig.accountSid;
      smsData.authToken = smsConfig.authToken;
    } else if (smsConfig.provider === 'nexmo') {
      smsData.apiKey = smsConfig.apiKey;
      smsData.apiSecret = smsConfig.apiSecret;
    } else if (smsConfig.provider === 'plivo') {
      smsData.apiKey = smsConfig.apiKey;
    }

    onFieldChange(smsData);
  }, [smsConfig]);

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

function CallbackConfig({ onFieldChange }: { onFieldChange: (value: any) => void }) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [requestFields, setRequestFields] = useState<Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>>([]);

  useEffect(() => {
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
  }, [url, method, requestFields]);

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

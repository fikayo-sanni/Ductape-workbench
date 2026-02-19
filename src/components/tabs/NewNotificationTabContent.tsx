import { useState, useEffect, useRef } from 'react';
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
import { Bell, Loader2, CheckCircle, Plus, Upload, Trash2, Eye, EyeOff, Slack } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Notifiers } from '@ductape/sdk/dist/types/enums';
import { useTabState, getInitialTabState } from '@/hooks/useTabState';

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
    headers?: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string>;
    body?: string;
  };
  slack?: { webhook_url?: string };
  discord?: { webhook_url?: string };
}

export default function NewNotificationTabContent({ data, tabId }: NewNotificationTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Extract product context from data (productId from header, or productTag from explorer)
  const product = (data?.productId || data?.productTag) ? {
    _id: data.productId,
    name: data.productName,
    tag: data.productTag,
    logo: data.productLogo,
    envs: data.productEnvs || [],
    workspace_id: data.workspaceId || currentWorkspaceId,
  } : null;

  // Restore saved state
  const savedTabState = getInitialTabState(tabId || '', null as any);

  const [formData, setFormData] = useState(
    savedTabState?.formData || {
      name: '',
      tag: '',
      description: '',
    }
  );

  const [selectedNotifiers, setSelectedNotifiers] = useState<NotifierType[]>(
    savedTabState?.selectedNotifiers || [
      { id: 'push', label: 'Push Notifications', selected: false },
      { id: 'email', label: 'Email', selected: false },
      { id: 'sms', label: 'SMS', selected: false },
      { id: 'callback', label: 'Callbacks', selected: false },
      { id: 'slack', label: 'Slack', selected: false },
      { id: 'discord', label: 'Discord', selected: false },
    ]
  );

  const [envConfigs, setEnvConfigs] = useState<EnvConfig[]>(savedTabState?.envConfigs || []);

  // Persist tab state automatically
  useTabState(
    tabId || '',
    'new-notification',
    formData.name || 'New Notification',
    {},
    { formData, selectedNotifiers, envConfigs }
  );

  // Initialize environment configurations
  useEffect(() => {
    if (product?.envs) {
      setEnvConfigs(product.envs.map((env: any) => ({
        slug: env.slug,
        push_notifications: undefined,
        emails: undefined,
        sms: undefined,
        callbacks: undefined,
        slack: undefined,
        discord: undefined,
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
      setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
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
    setFormData((prev: typeof formData) => ({ ...prev, tag: sanitized }));
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
      const payload = {
        name: formData.name,
        tag: formData.tag,
        description: formData.description,
        envs: envConfigs,
      };

      const notification = await ductape.notifications.create(payload);
      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', product?._id] });
      closeTab(tabId || '');
      openTab({
        id: `product-${product?._id}`,
        type: 'product',
        title: product?.name || 'Product',
        itemId: product?._id,
        data: product,
      });
      toast.success('Notifier created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create notifier');
    },
  });

  const handleCreate = async() => {
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

    // Debug: Show the complete notification object before sending
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
        callbacks: config.callbacks,
      }),
      ...(selectedNotifiers.find(n => n.id === 'slack')?.selected && config.slack && {
        slack: config.slack,
      }),
      ...(selectedNotifiers.find(n => n.id === 'discord')?.selected && config.discord && {
        discord: config.discord,
      }),
    }));

    const payload = {
      name: formData.name,
      tag: formData.tag,
      description: formData.description,
      envs,
    };

    // alert(JSON.stringify(payload));
    
    // console.log('Complete notification payload:', JSON.stringify(payload, null, 2));

    // return;
    console.log('Complete notification payload:', JSON.stringify(payload, null, 2));
    await createNotification();
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
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      // Auto-populate description if it's empty or was previously auto-generated
                      description: !formData.description || formData.description.endsWith(' notifier')
                        ? `${name} notifier`
                        : formData.description
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
        <>{/* <div className="flex items-center gap-2 pb-2 border-b border-grey-300">
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
        </div> */}</>
      )}

      {/* Channels - Progressive Disclosure */}
      <Accordion type="multiple" defaultValue={['push', 'email', 'sms', 'callback', 'slack', 'discord']} className="w-full">
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

        {selectedNotifiers.find(n => n.id === 'slack')?.selected && (
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
              <WebhookUrlConfig envConfig={envConfig} onConfigChange={onConfigChange} channelKey="slack" placeholder="https://hooks.slack.com/services/..." />
            </AccordionContent>
          </AccordionItem>
        )}

        {selectedNotifiers.find(n => n.id === 'discord')?.selected && (
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
              <WebhookUrlConfig envConfig={envConfig} onConfigChange={onConfigChange} channelKey="discord" placeholder="https://discord.com/api/webhooks/..." />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function WebhookUrlConfig({
  envConfig,
  onConfigChange,
  channelKey,
  placeholder,
}: {
  envConfig: EnvConfig;
  onConfigChange: (config: EnvConfig) => void;
  channelKey: 'slack' | 'discord';
  placeholder: string;
}) {
  const config = channelKey === 'slack' ? envConfig.slack : envConfig.discord;
  const [url, setUrl] = useState(() => config?.webhook_url ?? '');
  const lastSyncedRef = useRef<any>(null);
  useEffect(() => {
    if (lastSyncedRef.current === config) return;
    lastSyncedRef.current = config;
    setUrl(config?.webhook_url ?? '');
  }, [config?.webhook_url]);
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      onConfigChange({ ...envConfig, [channelKey]: undefined });
      return;
    }
    try {
      new URL(trimmed);
      onConfigChange({ ...envConfig, [channelKey]: { webhook_url: trimmed } });
    } catch {
      onConfigChange({ ...envConfig, [channelKey]: undefined });
    }
  }, [url]);
  return (
    <div className="space-y-2">
      <Label>Webhook URL</Label>
      <Input placeholder={placeholder} value={url} onChange={(e) => setUrl(e.target.value)} type="url" />
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
  const isSyncingRef = useRef(false);

  // Initialize from envConfig.push_notifications when it changes (for Quick Copy)
  useEffect(() => {
    if (envConfig.push_notifications) {
      const pushNotif = envConfig.push_notifications as any;
      if (pushNotif.type === Notifiers.FIREBASE && pushNotif.credentials) {
        isSyncingRef.current = true;
        setNotificationType('firebase');
        setCredentials({
          type: pushNotif.credentials.type || 'service_account',
          project_id: pushNotif.credentials.project_id || '',
          private_key_id: pushNotif.credentials.private_key_id || '',
          private_key: pushNotif.credentials.private_key || '',
          client_email: pushNotif.credentials.client_email || '',
          client_id: pushNotif.credentials.client_id || '',
          auth_uri: pushNotif.credentials.auth_uri || 'https://accounts.google.com/o/oauth2/auth',
          token_uri: pushNotif.credentials.token_uri || 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: pushNotif.credentials.auth_provider_x509_cert_url || 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: pushNotif.credentials.client_x509_cert_url || '',
        });
        setDatabaseUrl(pushNotif.databaseUrl || '');
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
      } else if (pushNotif.type === Notifiers.EXPO) {
        isSyncingRef.current = true;
        setNotificationType('expo');
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
      }
    }
  }, [envConfig.push_notifications]);

  useEffect(() => {
    // Don't sync if we're currently initializing from parent
    if (isSyncingRef.current) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const isSyncingRef = useRef(false);

  // Initialize from envConfig.emails when it changes (for Quick Copy)
  useEffect(() => {
    if (envConfig.emails) {
      const emails = envConfig.emails as any;
      isSyncingRef.current = true;
      setEmailConfig({
        host: emails.host || '',
        port: emails.port || '',
        sender_email: emails.sender_email || '',
        auth_user: emails.auth?.user || emails.auth_user || '',
        auth_pass: emails.auth?.pass || emails.auth_pass || '',
        secure: emails.secure || false,
      });
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [envConfig.emails]);

  useEffect(() => {
    // Don't sync if we're currently initializing from parent
    if (isSyncingRef.current) return;

    // Build the email config with nested auth object
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

    // Debug: Show constructed object
    console.log('Email config being sent:', emailsData);

    onConfigChange({
      ...envConfig,
      emails: emailsData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function SmsConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [smsConfig, setSmsConfig] = useState({
    provider: '',
    accountSid: '',
    authToken: '',
    apiKey: '',
    apiSecret: '',
    sender: '',
  });
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const isSyncingRef = useRef(false);

  // Initialize from envConfig.sms when it changes (for Quick Copy)
  useEffect(() => {
    if (envConfig.sms) {
      isSyncingRef.current = true;
      setSmsConfig({
        provider: (envConfig.sms as any).provider || '',
        accountSid: (envConfig.sms as any).accountSid || '',
        authToken: (envConfig.sms as any).authToken || '',
        apiKey: (envConfig.sms as any).apiKey || '',
        apiSecret: (envConfig.sms as any).apiSecret || '',
        sender: (envConfig.sms as any).sender || '',
      });
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [envConfig.sms]);

  useEffect(() => {
    // Don't sync if we're currently initializing from parent
    if (isSyncingRef.current) return;

    // Build the SMS config with standardized format
    const smsData = {
      provider: smsConfig.provider,
      accountSid: smsConfig.accountSid,
      authToken: smsConfig.authToken,
      sender: smsConfig.sender,
    };

    // Debug: Show constructed object
    console.log('SMS config being sent:', smsData);

    onConfigChange({
      ...envConfig,
      sms: smsData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smsConfig]);

  // Get provider-specific field labels and visibility
  const getFieldConfig = () => {
    switch (smsConfig.provider) {
      case 'twilio':
        return {
          field1Label: 'Account SID',
          field1Placeholder: 'ACxxxxxxxxxx',
          field1Key: 'accountSid' as const,
          field2Label: 'Auth Token',
          field2Placeholder: 'Your Twilio auth token',
          field2Key: 'authToken' as const,
          showApiKey: false,
          showApiSecret: false,
        };
      case 'nexmo':
        return {
          field1Label: 'API Key',
          field1Placeholder: 'Your Nexmo API key',
          field1Key: 'apiKey' as const,
          field2Label: 'API Secret',
          field2Placeholder: 'Your Nexmo API secret',
          field2Key: 'apiSecret' as const,
          showApiKey: true,
          showApiSecret: true,
        };
      case 'plivo':
        return {
          field1Label: 'Auth ID',
          field1Placeholder: 'Your Plivo auth ID',
          field1Key: 'accountSid' as const,
          field2Label: 'API Key',
          field2Placeholder: 'Your Plivo API key',
          field2Key: 'apiKey' as const,
          showApiKey: true,
          showApiSecret: false,
        };
      default:
        return {
          field1Label: 'Account SID / Auth ID',
          field1Placeholder: '',
          field1Key: 'accountSid' as const,
          field2Label: 'Auth Token / API Key',
          field2Placeholder: '',
          field2Key: 'authToken' as const,
          showApiKey: false,
          showApiSecret: false,
        };
    }
  };

  const fieldConfig = getFieldConfig();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>SMS Provider</Label>
        <Select value={smsConfig.provider} onValueChange={(v) => setSmsConfig({ ...smsConfig, provider: v })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="nexmo">Nexmo</SelectItem>
            <SelectItem value="plivo">Plivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {smsConfig.provider && (
        <>
          <div>
            <Label>{fieldConfig.field1Label}</Label>
            <Input
              value={smsConfig[fieldConfig.field1Key]}
              onChange={(e) => setSmsConfig({ ...smsConfig, [fieldConfig.field1Key]: e.target.value })}
              className="mt-1"
              placeholder={fieldConfig.field1Placeholder}
            />
          </div>

          <div>
            <Label>{fieldConfig.field2Label}</Label>
            <div className="relative mt-1">
              <Input
                type={(fieldConfig.field2Key === 'authToken' && showAuthToken) || (fieldConfig.field2Key === 'apiSecret' && showApiSecret) || fieldConfig.field2Key === 'apiKey' ? 'text' : 'password'}
                value={smsConfig[fieldConfig.field2Key]}
                onChange={(e) => setSmsConfig({ ...smsConfig, [fieldConfig.field2Key]: e.target.value })}
                className="pr-10"
                placeholder={fieldConfig.field2Placeholder}
              />
              {(fieldConfig.field2Key === 'authToken' || fieldConfig.field2Key === 'apiSecret') && (
                <button
                  type="button"
                  onClick={() => fieldConfig.field2Key === 'authToken' ? setShowAuthToken(prev => !prev) : setShowApiSecret(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-600 hover:text-grey focus:outline-none"
                  aria-label={(fieldConfig.field2Key === 'authToken' && showAuthToken) || (fieldConfig.field2Key === 'apiSecret' && showApiSecret) ? 'Hide' : 'Show'}
                >
                  {((fieldConfig.field2Key === 'authToken' && showAuthToken) || (fieldConfig.field2Key === 'apiSecret' && showApiSecret)) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <Label>Sender Phone Number</Label>
            <Input
              value={smsConfig.sender}
              onChange={(e) => setSmsConfig({ ...smsConfig, sender: e.target.value })}
              className="mt-1"
              placeholder="+1415xxxxxxx"
            />
          </div>
        </>
      )}
    </div>
  );
}

function CallbackConfig({ envConfig, onConfigChange }: { envConfig: EnvConfig; onConfigChange: (config: EnvConfig) => void }) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [requestFields, setRequestFields] = useState<Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }>>([]);
  const lastSyncedCallbacksRef = useRef<any>(null);

  // Initialize from envConfig.callbacks when it changes (for Quick Copy)
  useEffect(() => {
    // Only initialize if callbacks actually changed (not from our own sync)
    if (envConfig.callbacks && envConfig.callbacks !== lastSyncedCallbacksRef.current) {
      const callbacks = envConfig.callbacks;
      setUrl(callbacks.url || '');
      setMethod(callbacks.method || 'POST');

      // Reconstruct requestFields from callbacks
      const fields: Array<{ id: string; key: string; value: string; addTo: 'headers' | 'body' | 'params' | 'query' }> = [];

      // Add headers (now an object)
      if (callbacks.headers) {
        Object.entries(callbacks.headers).forEach(([key, value], idx) => {
          fields.push({
            id: `header_${Date.now()}_${idx}`,
            key,
            value,
            addTo: 'headers',
          });
        });
      }

      // Add query params (now an object)
      if (callbacks.query) {
        Object.entries(callbacks.query).forEach(([key, value], idx) => {
          fields.push({
            id: `query_${Date.now()}_${idx}`,
            key,
            value,
            addTo: 'query',
          });
        });
      }

      // Add params (now an object)
      if (callbacks.params) {
        Object.entries(callbacks.params).forEach(([key, value], idx) => {
          fields.push({
            id: `param_${Date.now()}_${idx}`,
            key,
            value,
            addTo: 'params',
          });
        });
      }

      // Add body
      if (callbacks.body) {
        fields.push({
          id: `body_${Date.now()}`,
          key: 'body',
          value: callbacks.body,
          addTo: 'body',
        });
      }

      setRequestFields(fields);
    }
  }, [envConfig.callbacks]);

  useEffect(() => {
    // Build headers, query, params, and body as objects
    const headers: Record<string, string> = {};
    const query: Record<string, string> = {};
    const params: Record<string, string> = {};
    let body = '';

    requestFields.forEach(item => {
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

    // Store reference to what we're syncing
    lastSyncedCallbacksRef.current = newCallbacks;

    onConfigChange({
      ...envConfig,
      callbacks: newCallbacks,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, method, requestFields]);

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

      {/* Request Preview */}
      {url && (
        <div className="mt-4 p-4 bg-grey-100 rounded-lg border border-grey-300">
          <h4 className="text-sm font-semibold text-grey mb-3">Request Preview</h4>
          <div className="space-y-3 text-sm font-mono">
            {/* Method and URL */}
            <div>
              <span className="text-blue-600 font-bold">{method}</span>{' '}
              <span className="text-grey">{url}</span>
            </div>

            {/* Headers */}
            {requestFields.some(f => f.addTo === 'headers' && f.key && f.value) && (
              <div>
                <div className="text-xs text-grey-600 font-sans mb-1">Headers:</div>
                <div className="pl-4 space-y-1">
                  {requestFields
                    .filter(f => f.addTo === 'headers' && f.key && f.value)
                    .map(f => (
                      <div key={f.id} className="text-grey-700">
                        <span className="text-purple-600">{f.key}:</span> {f.value}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Query Parameters */}
            {requestFields.some(f => f.addTo === 'query' && f.key && f.value) && (
              <div>
                <div className="text-xs text-grey-600 font-sans mb-1">Query Params:</div>
                <div className="pl-4 space-y-1">
                  {requestFields
                    .filter(f => f.addTo === 'query' && f.key && f.value)
                    .map(f => (
                      <div key={f.id} className="text-grey-700">
                        <span className="text-green-600">{f.key}:</span> {f.value}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Path Parameters */}
            {requestFields.some(f => f.addTo === 'params' && f.key && f.value) && (
              <div>
                <div className="text-xs text-grey-600 font-sans mb-1">Path Params:</div>
                <div className="pl-4 space-y-1">
                  {requestFields
                    .filter(f => f.addTo === 'params' && f.key && f.value)
                    .map(f => (
                      <div key={f.id} className="text-grey-700">
                        <span className="text-orange-600">{f.key}:</span> {f.value}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Body */}
            {requestFields.some(f => f.addTo === 'body' && f.value) && (
              <div>
                <div className="text-xs text-grey-600 font-sans mb-1">Body:</div>
                <div className="pl-4 bg-white p-2 rounded border border-grey-300">
                  <pre className="text-grey-700 whitespace-pre-wrap break-all">
                    {requestFields.find(f => f.addTo === 'body')?.value}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

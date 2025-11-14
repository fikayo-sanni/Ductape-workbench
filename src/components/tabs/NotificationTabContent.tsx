import { useState } from 'react';
import { Bell, Mail, Webhook, FileText, Plus, Box, Activity, Loader2, CheckCircle, Eye, EyeOff, Copy, Check, MessageSquare } from 'lucide-react';
import { IProductNotifier } from '@/types/notifier';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '../ui/button';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface NotificationTabContentProps {
  data?: any;
}

export default function NotificationTabContent({ data }: NotificationTabContentProps) {
  const notifier: IProductNotifier = data;
  const productTag = data?.productTag;
  const productName = data?.productName;
  const productLogo = data?.productLogo;
  const [selectedEnv, setSelectedEnv] = useState<string>(notifier?.envs?.[0]?.slug || '');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch notification from SDK
  const { data: notificationData, isLoading } = useQuery({
    queryKey: ['notification', productTag, notifier?.tag],
    queryFn: async () => {
      if (!ductape || !productTag || !notifier?.tag) return null;
      try {
        // Initialize product context
        await ductape.init(productTag);

        
        console.dir(ductape)
        // Fetch all notifications for the product
        const notification = await ductape.notifications.fetch(notifier?.tag);

        console.log(notification)
        // Find the specific notification by tag
        //const notification = notifications?.find((n: any) => n.tag === notifier.tag);

        return notification || null;
      } catch (error) {
        console.error('Error fetching notification:', error);
        return null;
      }
    },
    enabled: !!ductape && !!productTag && !!notifier?.tag,
  });

  // Get the notification configuration for the selected environment
  const notificationConfig = notificationData?.envs?.find((env: any) => env.slug === selectedEnv);
  const displayNotifier = notificationData || notifier;

  // Debug logging
  console.log('NotificationTabContent Debug:', {
    notifier,
    notificationData,
    selectedEnv,
    notificationConfig,
    displayNotifier,
    envs: notificationData?.envs,
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowCredential = (key: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Extract product info for header
  const product = productName && productTag ? {
    name: productName,
    tag: productTag,
    logo: productLogo,
  } : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading notification details...</p>
        </div>
      </div>
    );
  }

  if (!displayNotifier) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Notifier not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
                  <h2 className="text-xl font-bold text-grey">Notification for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This notification service is connected to your product and configured for its environments
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
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6 text-red" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayNotifier.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayNotifier.tag}</span></span>
              </div>
              {displayNotifier.description && (
                <p className="text-sm text-grey-600">{displayNotifier.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Box className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{displayNotifier.envs?.length || 0}</div>
                <div className="text-sm text-grey-600">Environments</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{displayNotifier.messages?.length || 0}</div>
                <div className="text-sm text-grey-600">Messages</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green" />
                  <div className="text-sm font-medium text-grey">Active</div>
                </div>
                <div className="text-xs text-grey-600 mt-1">Notification service</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{displayNotifier.messages?.length || 0}</div>
                <div className="text-sm text-grey-600">Templates</div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Messages</h2>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                openTab({
                  id: `new-message-${Date.now()}`,
                  type: 'new-message',
                  title: 'New Message',
                  itemId: 'new',
                  data: {
                    notification: notifier,
                    productTag,
                    isNew: true,
                  },
                  isDirty: true,
                });
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {!displayNotifier.messages || displayNotifier.messages.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-1">No messages yet</p>
              <p className="text-xs text-grey-500">Create message templates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayNotifier.messages.map((message: any, idx: number) => (
                <button
                  key={message._id || idx}
                  onClick={() => {
                    openTab({
                      id: `message-${message._id || idx}-${Date.now()}`,
                      type: 'message',
                      title: message.name,
                      itemId: message._id,
                      data: {
                        ...message,
                        notification: notifier,
                        productTag,
                        notifierTag: notifier.tag,
                      },
                    });
                  }}
                  className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-grey text-sm">{message.name}</span>
                      {message.tag && (
                        <Badge variant="outline" className="text-xs">{message.tag}</Badge>
                      )}
                    </div>
                    {message.email && <Mail className="h-4 w-4 text-blue-500" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Configuration</h2>
            {displayNotifier.envs && displayNotifier.envs.length > 1 && (
              <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayNotifier.envs.map((env: any, index: number) => (
                    <SelectItem key={env._id || env.slug || index} value={env.slug}>
                      {env.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!notificationConfig ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600">No configuration available for this environment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Push Notifications (Firebase) */}
              {notificationConfig.push_notifications && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="font-medium text-grey">Push Notifications (Firebase)</span>
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {typeof notificationConfig.push_notifications === 'object' && notificationConfig.push_notifications.credentials ? (
                      <>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Credentials Type</Label>
                          <Input
                            value={notificationConfig.push_notifications.credentials.type || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Project ID</Label>
                          <Input
                            value={notificationConfig.push_notifications.credentials.project_id || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Client Email</Label>
                          <Input
                            value={notificationConfig.push_notifications.credentials.client_email || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Private Key</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type={showCredentials['firebase-key'] ? 'text' : 'password'}
                              value={notificationConfig.push_notifications.credentials.private_key || ''}
                              disabled
                              className="bg-white text-grey font-mono pr-10"
                            />
                            <button
                              onClick={() => toggleShowCredential('firebase-key')}
                              className="text-grey-600 hover:text-grey"
                            >
                              {showCredentials['firebase-key'] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(notificationConfig.push_notifications.credentials.private_key, 'firebase-key')}
                            >
                              {copiedKey === 'firebase-key' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Email */}
              {notificationConfig.emails && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="font-medium text-grey">Email (SMTP)</span>
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {typeof notificationConfig.emails === 'object' ? (
                      <>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Host</Label>
                          <Input
                            value={notificationConfig.emails.host || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Port</Label>
                          <Input
                            value={notificationConfig.emails.port || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Email</Label>
                          <Input
                            value={notificationConfig.emails.sender_email || ''}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>

                        <div className="flex items-center justify-between border border-grey-300 rounded-lg p-3 bg-grey-50">
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide block">TLS</Label>
                            <p className="text-xs text-grey-600 mt-1">Enable secure connection</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${notificationConfig.emails.secure ? 'text-green' : 'text-grey-400'}`}>
                              {notificationConfig.emails.secure ? 'Enabled' : 'Disabled'}
                            </span>
                            <div className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${
                              notificationConfig.emails.secure ? 'bg-green' : 'bg-grey-300'
                            }`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-sm ${
                                notificationConfig.emails.secure ? 'ml-auto' : ''
                              }`} />
                            </div>
                          </div>
                        </div>

                        {notificationConfig.emails.auth && (
                          <div className="border-t border-grey-300 pt-3">
                            <h3 className="text-sm font-semibold text-grey mb-3">Authentication</h3>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">User</Label>
                                <Input
                                  value={notificationConfig.emails.auth.user || ''}
                                  disabled
                                  className="bg-white text-grey font-mono"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Password</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type={showCredentials['email-pass'] ? 'text' : 'password'}
                                    value={notificationConfig.emails.auth.pass ? '••••••••••••••••' : ''}
                                    disabled
                                    className="bg-white text-grey font-mono pr-10"
                                  />
                                  <button
                                    onClick={() => toggleShowCredential('email-pass')}
                                    className="text-grey-600 hover:text-grey"
                                  >
                                    {showCredentials['email-pass'] ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* SMS */}
              {notificationConfig.sms && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="font-medium text-grey">SMS</span>
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {typeof notificationConfig.sms === 'object' ? (
                      <>
                        {notificationConfig.sms.provider && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Provider</Label>
                            <Input
                              value={notificationConfig.sms.provider.charAt(0).toUpperCase() + notificationConfig.sms.provider.slice(1)}
                              disabled
                              className="bg-white text-grey font-mono"
                            />
                          </div>
                        )}
                        {notificationConfig.sms.accountSid && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Account SID / Auth ID</Label>
                            <Input
                              value={notificationConfig.sms.accountSid}
                              disabled
                              className="bg-white text-grey font-mono"
                            />
                          </div>
                        )}
                        {notificationConfig.sms.authToken && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Auth Token</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type={showCredentials['sms-token'] ? 'text' : 'password'}
                                value={notificationConfig.sms.authToken ? '••••••••••••••••' : ''}
                                disabled
                                className="bg-white text-grey font-mono pr-10"
                              />
                              <button
                                onClick={() => toggleShowCredential('sms-token')}
                                className="text-grey-600 hover:text-grey"
                              >
                                {showCredentials['sms-token'] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        {notificationConfig.sms.sender && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Sender Phone Number</Label>
                            <Input
                              value={notificationConfig.sms.sender}
                              disabled
                              className="bg-white text-grey font-mono"
                            />
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Callbacks */}
              {notificationConfig.callbacks && (
                <div className="border border-grey-300 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Webhook className="h-4 w-4 text-orange-500" />
                    </div>
                    <span className="font-medium text-grey">Callbacks (Webhook)</span>
                    <Badge variant="outline" className="ml-auto">Active</Badge>
                  </div>
                  <div className="space-y-3">
                    {typeof notificationConfig.callbacks === 'object' ? (
                      <>
                        {notificationConfig.callbacks.url && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">URL</Label>
                            <Input
                              value={notificationConfig.callbacks.url}
                              disabled
                              className="bg-white text-grey font-mono"
                            />
                          </div>
                        )}
                        {notificationConfig.callbacks.method && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Method</Label>
                            <Input
                              value={notificationConfig.callbacks.method.toUpperCase()}
                              disabled
                              className="bg-white text-grey font-mono font-bold"
                            />
                          </div>
                        )}
                        {notificationConfig.callbacks.headers && typeof notificationConfig.callbacks.headers === 'object' && Object.keys(notificationConfig.callbacks.headers).length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Headers</Label>
                            <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2">
                              {Object.entries(notificationConfig.callbacks.headers).map(([key, value], idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-grey w-32">{key}:</span>
                                  <span className="text-grey-600 font-mono flex-1">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {notificationConfig.callbacks.query && typeof notificationConfig.callbacks.query === 'object' && Object.keys(notificationConfig.callbacks.query).length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Query Parameters</Label>
                            <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2">
                              {Object.entries(notificationConfig.callbacks.query).map(([key, value], idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-grey w-32">{key}:</span>
                                  <span className="text-grey-600 font-mono flex-1">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {notificationConfig.callbacks.params && typeof notificationConfig.callbacks.params === 'object' && Object.keys(notificationConfig.callbacks.params).length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Path Parameters</Label>
                            <div className="bg-grey-50 border border-grey-300 rounded-lg p-3 space-y-2">
                              {Object.entries(notificationConfig.callbacks.params).map(([key, value], idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-grey w-32">{key}:</span>
                                  <span className="text-grey-600 font-mono flex-1">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {notificationConfig.callbacks.body && (
                          <div>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Body</Label>
                            <Textarea
                              value={typeof notificationConfig.callbacks.body === 'string' 
                                ? notificationConfig.callbacks.body 
                                : JSON.stringify(notificationConfig.callbacks.body, null, 2)}
                              disabled
                              className="bg-white text-grey font-mono text-sm"
                              rows={6}
                            />
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Notifications</h3>
          <p className="text-xs text-blue-800">
            Notification services allow you to send messages via push notifications, email, SMS, and webhooks. Configure credentials for each environment to enable multi-channel messaging.
          </p>
        </div>
      </div>
    </div>
  );
}

import { FileText, Bell, Mail, Phone, Webhook, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useQuery } from '@tanstack/react-query';

interface MessageTabContentProps {
  data?: any;
}

export default function MessageTabContent({ data }: MessageTabContentProps) {
  const message = data;
  const productTag = data?.productTag;
  const notifierTag = data?.notifierTag;
  const { user, currentWorkspaceId } = useAuth();

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch message details from SDK
  const { data: messageData, isLoading } = useQuery({
    queryKey: ['message', productTag, notifierTag, message?.tag],
    queryFn: async () => {
      if (!ductape || !productTag || !notifierTag || !message?.tag) return null;
      const productBuilder = ductape as any;
      await productBuilder.init(productTag);
      return await productBuilder.notifications.messages.fetch(message.tag);
    },
    enabled: !!ductape && !!productTag && !!notifierTag && !!message?.tag,
  });

  const displayData = messageData || message;

  if (isLoading) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-grey-600">Loading message details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Message not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
                <p className="text-sm text-grey-600 font-mono mb-3">
                  {notifierTag}:{displayData.tag}
                </p>
                {displayData.description && (
                  <p className="text-grey-600">{displayData.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Push Notification */}
          {displayData.push_notification && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-purple-500" />
                </div>
                <span className="font-medium text-grey">Push Notification</span>
                <Badge variant="outline" className="ml-auto">Configured</Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Title</Label>
                  <Input
                    value={displayData.push_notification.title || ''}
                    disabled
                    className="bg-white text-grey font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Body</Label>
                  <Input
                    value={displayData.push_notification.body || ''}
                    disabled
                    className="bg-white text-grey font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email */}
          {displayData.email && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium text-grey">Email</span>
                <Badge variant="outline" className="ml-auto">Configured</Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Subject</Label>
                  <Input
                    value={displayData.email.subject || ''}
                    disabled
                    className="bg-white text-grey font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Template</Label>
                  <Input
                    value={displayData.email.template || ''}
                    disabled
                    className="bg-white text-grey font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SMS */}
          {displayData.sms && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-500" />
                </div>
                <span className="font-medium text-grey">SMS</span>
                <Badge variant="outline" className="ml-auto">Configured</Badge>
              </div>
              <div>
                <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Message</Label>
                <Input
                  value={displayData.sms}
                  disabled
                  className="bg-white text-grey font-mono"
                />
              </div>
            </div>
          )}

          {/* Callback */}
          {displayData.callback && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Webhook className="h-4 w-4 text-orange-500" />
                </div>
                <span className="font-medium text-grey">Callback/Webhook</span>
                <Badge variant="outline" className="ml-auto">Configured</Badge>
              </div>
              <div className="space-y-4">
                {/* URL */}
                {displayData.callback.url && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">URL</Label>
                    <Input
                      value={displayData.callback.url}
                      disabled
                      className="bg-white text-grey font-mono"
                    />
                  </div>
                )}

                {/* Method */}
                {displayData.callback.method && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Method</Label>
                    <Input
                      value={displayData.callback.method.toUpperCase()}
                      disabled
                      className="bg-white text-grey font-mono font-bold"
                    />
                  </div>
                )}

                {/* Headers */}
                {displayData.callback.headers && Object.keys(displayData.callback.headers).length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Headers</Label>
                    <div className="bg-grey-50 border border-grey-400 rounded-lg p-3 space-y-2">
                      {Object.entries(displayData.callback.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-grey w-24">{key}:</span>
                          <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query Parameters */}
                {displayData.callback.query && Object.keys(displayData.callback.query).length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Query Parameters</Label>
                    <div className="bg-grey-50 border border-grey-400 rounded-lg p-3 space-y-2">
                      {Object.entries(displayData.callback.query).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-grey w-24">{key}:</span>
                          <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route Parameters */}
                {displayData.callback.params && Object.keys(displayData.callback.params).length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-2 block">Route Parameters</Label>
                    <div className="bg-grey-50 border border-grey-400 rounded-lg p-3 space-y-2">
                      {Object.entries(displayData.callback.params).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-grey w-24">{key}:</span>
                          <span className="text-grey-600 font-mono flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                {displayData.callback.body && (
                  <div>
                    <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">Body</Label>
                    <Textarea
                      value={typeof displayData.callback.body === 'string' 
                        ? displayData.callback.body 
                        : JSON.stringify(displayData.callback.body, null, 2)}
                      disabled
                      className="bg-white text-grey font-mono text-sm"
                      rows={6}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


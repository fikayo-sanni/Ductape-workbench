import { FileText, Bell, Mail, Phone, Webhook, Loader2, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import CodeSidebar from '@/components/CodeSidebar';

interface MessageTabContentProps {
  data?: any;
}

export default function MessageTabContent({ data }: MessageTabContentProps) {
  const message = data;
  const productTag = data?.productTag;
  const notifierTag = data?.notifierTag;
  const notification = data?.notification;
  const { user, currentWorkspaceId } = useAuth();
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);

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

  const handleViewCode = () => {
    setShowCodeSidebar(true);
  };

  // Generate SDK code examples for sending notifications
  const generateCodeSections = (language: string, env?: string) => {
    const messageTag = displayData?.tag || 'message-tag';
    const fullTag = notifierTag ? `${notifierTag}:${messageTag}` : messageTag;
    const productTagValue = productTag || 'your-product-tag';
    const envSlug = env || notification?.envs?.[0]?.slug || 'prd';

    // Build input structure based on configured channels
    const hasPushNotification = !!displayData?.push_notification;
    const hasEmail = !!displayData?.email;
    const hasCallback = !!displayData?.callback;
    const hasSms = !!displayData?.sms;

    // Helper function to group fields by parent_key
    const groupByParentKey = (dataArray: any[]) => {
      const grouped: Record<string, Record<string, any>> = {};
      dataArray?.forEach((item: any) => {
        const parentKey = item.parent_key || 'root';
        if (!grouped[parentKey]) {
          grouped[parentKey] = {};
        }
        grouped[parentKey][item.key] = item.value;
      });
      return grouped;
    };

    // Helper to format grouped data as JavaScript object string
    const formatAsJsObject = (grouped: Record<string, Record<string, any>>, indent: string = '  ') => {
      const lines: string[] = [];
      const hasOnlyRoot = Object.keys(grouped).length === 1 && grouped['root'];
      const hasRoot = !!grouped['root'];

      // Handle root fields first (they go at the top level)
      if (hasRoot && !hasOnlyRoot) {
        Object.entries(grouped['root']).forEach(([key, value]) => {
          const formattedValue = typeof value === 'string' && !value.startsWith('{{')
            ? `${value}`
            : `${value}`;
          lines.push(`${indent}${key}: ${formattedValue}`);
        });
      }

      Object.entries(grouped).forEach(([parentKey, fields]) => {
        const fieldLines = Object.entries(fields).map(([key, value]) => {
          const formattedValue = typeof value === 'string' && !value.startsWith('{{')
            ? `${value}`
            : `${value}`;
          // If we only have 'root', output fields at top level
          if (hasOnlyRoot && parentKey === 'root') {
            return `${indent}${key}: ${formattedValue}`;
          }
          return `${indent}  ${key}: ${formattedValue}`;
        }).join(',\n');

        // If only 'root' exists, output fields directly without nesting
        if (hasOnlyRoot && parentKey === 'root') {
          lines.push(fieldLines);
        } else if (parentKey !== 'root') {
          // Only create nested structure for non-root parent keys
          lines.push(`${indent}${parentKey}: {\n${fieldLines}\n${indent}}`);
        }
      });
      return lines.join(',\n');
    };

    // Helper to format grouped data as Python dict string
    const formatAsPythonDict = (grouped: Record<string, Record<string, any>>, indent: string = '    ') => {
      const lines: string[] = [];
      const hasOnlyRoot = Object.keys(grouped).length === 1 && grouped['root'];
      const hasRoot = !!grouped['root'];

      // Handle root fields first (they go at the top level)
      if (hasRoot && !hasOnlyRoot) {
        Object.entries(grouped['root']).forEach(([key, value]) => {
          const formattedValue = typeof value === 'string' && !value.startsWith('{{')
            ? `'${value}'`
            : `'${value}'`;
          lines.push(`${indent}'${key}': ${formattedValue}`);
        });
      }

      Object.entries(grouped).forEach(([parentKey, fields]) => {
        const fieldLines = Object.entries(fields).map(([key, value]) => {
          const formattedValue = typeof value === 'string' && !value.startsWith('{{')
            ? `'${value}'`
            : `'${value}'`;
          // If we only have 'root', output fields at top level
          if (hasOnlyRoot && parentKey === 'root') {
            return `${indent}'${key}': ${formattedValue}`;
          }
          return `${indent}    '${key}': ${formattedValue}`;
        }).join(',\n');

        // If only 'root' exists, output fields directly without nesting
        if (hasOnlyRoot && parentKey === 'root') {
          lines.push(fieldLines);
        } else if (parentKey !== 'root') {
          // Only create nested structure for non-root parent keys
          lines.push(`${indent}'${parentKey}': {\n${fieldLines}\n${indent}}`);
        }
      });
      return lines.join(',\n');
    };

    if (language === 'javascript') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  token: 'your-auth-token',
  public_key: 'your-public-key',
  type: 'product'
});

// Initialize product
await ductape.init('${productTagValue}');`
        }
      ];

      // Add channel-specific input sections
      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        const pushCode = hasPushData
          ? `const push_notification = {\n  device_token: '{{deviceToken}}', // Replace with the user's device token\n${formatAsJsObject(pushData)}\n};`
          : `const push_notification = {
  device_token: '{{deviceToken}}', // Replace with the user's device token
  title: { en: 'Your title here' },
  body: { en: 'Your message here' },
  data: { action: 'open_screen' }
};`;

        sections.push({
          title: 'Input - Push Notification',
          code: pushCode
        });
      }

      if (hasEmail) {
        const emailData = groupByParentKey(displayData?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;

        const emailCode = hasEmailData
          ? `const email = {\n  to: ['user@example.com'], // Replace with recipient email addresses\n${formatAsJsObject(emailData)}\n};`
          : `const email = {
  to: ['user@example.com'], // Replace with recipient email addresses
  subject: { en: 'Email subject' },
  template: { en: '<p>Email content</p>' }
};`;

        sections.push({
          title: 'Input - Email',
          code: emailCode
        });
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(displayData?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;

        const callbackCode = hasCallbackData
          ? `const callback = {\n${formatAsJsObject(callbackData)}\n};`
          : `const callback = {
  query: { userId: '{{userId}}' },
  headers: { Authorization: 'Bearer token' },
  body: { event: 'notification_sent' }
};`;

        sections.push({
          title: 'Input - Callback',
          code: callbackCode
        });
      }

      if (hasSms) {
        const smsData = groupByParentKey(displayData?.sms_data || []);
        const hasSmsData = Object.keys(smsData).length > 0;

        const smsCode = hasSmsData
          ? `const sms = {\n  recipients: ['+1234567890'], // Replace with recipient phone numbers\n  body: {\n${formatAsJsObject(smsData, '    ')}\n  }\n};`
          : `const sms = {
  recipients: ['+1234567890'], // Replace with recipient phone numbers
  body: {
    firstname: '{{firstName}}',
    lastname: '{{lastName}}'
  }
};`;

        sections.push({
          title: 'Input - SMS',
          code: smsCode
        });
      }

      // Build the final input object
      const inputParts = [`  slug: '${messageTag}'`];
      if (hasPushNotification) inputParts.push('  push_notification');
      if (hasEmail) inputParts.push('  email');
      if (hasCallback) inputParts.push('  callback');
      if (hasSms) inputParts.push('  sms');

      sections.push({
        title: 'Execute',
        code: `const input = {
${inputParts.join(',\n')}
};

await ductape.processor.notification.send({
  env: '${envSlug}',
  product: '${productTagValue}',
  event: '${fullTag}',
  input,
  retries: 3
});`


      });

      return sections;
    } else if (language === 'typescript') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `import { Ductape } from '@ductape/sdk';

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  token: 'your-auth-token',
  public_key: 'your-public-key',
  type: 'product'
});

// Initialize product
await ductape.init('${productTagValue}');`
        }
      ];

      // Add channel-specific input sections
      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        const pushCode = hasPushData
          ? `const push_notification = {\n  device_token: '{{deviceToken}}', // Replace with the user's device token\n${formatAsJsObject(pushData)}\n};`
          : `const push_notification = {
  device_token: '{{deviceToken}}', // Replace with the user's device token
  title: { en: 'Your title here' },
  body: { en: 'Your message here' },
  data: { action: 'open_screen' }
};`;

        sections.push({
          title: 'Input - Push Notification',
          code: pushCode
        });
      }

      if (hasEmail) {
        const emailData = groupByParentKey(displayData?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;

        const emailCode = hasEmailData
          ? `const email = {\n  to: ['user@example.com'], // Replace with recipient email addresses\n${formatAsJsObject(emailData)}\n};`
          : `const email = {
  to: ['user@example.com'], // Replace with recipient email addresses
  subject: { en: 'Email subject' },
  template: { en: '<p>Email content</p>' }
};`;

        sections.push({
          title: 'Input - Email',
          code: emailCode
        });
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(displayData?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;

        const callbackCode = hasCallbackData
          ? `const callback = {\n${formatAsJsObject(callbackData)}\n};`
          : `const callback = {
  query: { userId: '{{userId}}' },
  headers: { Authorization: 'Bearer token' },
  body: { event: 'notification_sent' }
};`;

        sections.push({
          title: 'Input - Callback',
          code: callbackCode
        });
      }

      if (hasSms) {
        const smsData = groupByParentKey(displayData?.sms_data || []);
        const hasSmsData = Object.keys(smsData).length > 0;

        const smsCode = hasSmsData
          ? `const sms = {\n  recipients: ['+1234567890'], // Replace with recipient phone numbers\n  body: {\n${formatAsJsObject(smsData, '    ')}\n  }\n};`
          : `const sms = {
  recipients: ['+1234567890'], // Replace with recipient phone numbers
  body: {
    firstname: '{{firstName}}',
    lastname: '{{lastName}}'
  }
};`;

        sections.push({
          title: 'Input - SMS',
          code: smsCode
        });
      }

      // Build the final input object
      const inputParts = [`  slug: '${messageTag}'`];
      if (hasPushNotification) inputParts.push('  push_notification');
      if (hasEmail) inputParts.push('  email');
      if (hasCallback) inputParts.push('  callback');
      if (hasSms) inputParts.push('  sms');

      sections.push({
        title: 'Execute',
        code: `const input = {
${inputParts.join(',\n')}
};

await ductape.processor.notification.send({
  env: '${envSlug}',
  product: '${productTagValue}',
  event: '${fullTag}',
  input,
  retries: 3
});`
      });

      return sections;
    } else if (language === 'python') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `from ductape import Ductape

ductape = Ductape(
    workspace_id='your-workspace-id',
    user_id='your-user-id',
    token='your-auth-token',
    public_key='your-public-key',
    type='product'
)

# Initialize product
ductape.init('${productTagValue}')`
        }
      ];

      // Add channel-specific input sections
      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        const pushCode = hasPushData
          ? `push_notification = {\n    'device_token': '{{deviceToken}}',  # Replace with the user's device token\n${formatAsPythonDict(pushData)}\n}`
          : `push_notification = {
    'device_token': '{{deviceToken}}',  # Replace with the user's device token
    'title': { 'en': 'Your title here' },
    'body': { 'en': 'Your message here' },
    'data': { 'action': 'open_screen' }
}`;

        sections.push({
          title: 'Input - Push Notification',
          code: pushCode
        });
      }

      if (hasEmail) {
        const emailData = groupByParentKey(displayData?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;

        const emailCode = hasEmailData
          ? `email = {\n    'to': ['user@example.com'],  # Replace with recipient email addresses\n${formatAsPythonDict(emailData)}\n}`
          : `email = {
    'to': ['user@example.com'],  # Replace with recipient email addresses
    'subject': { 'en': 'Email subject' },
    'template': { 'en': '<p>Email content</p>' }
}`;

        sections.push({
          title: 'Input - Email',
          code: emailCode
        });
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(displayData?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;

        const callbackCode = hasCallbackData
          ? `callback = {\n${formatAsPythonDict(callbackData)}\n}`
          : `callback = {
    'query': { 'userId': '{{userId}}' },
    'headers': { 'Authorization': 'Bearer token' },
    'body': { 'event': 'notification_sent' }
}`;

        sections.push({
          title: 'Input - Callback',
          code: callbackCode
        });
      }

      if (hasSms) {
        const smsData = groupByParentKey(displayData?.sms_data || []);
        const hasSmsData = Object.keys(smsData).length > 0;

        const smsCode = hasSmsData
          ? `sms = {\n    'recipients': ['+1234567890'],  # Replace with recipient phone numbers\n    'body': {\n${formatAsPythonDict(smsData, '        ')}\n    }\n}`
          : `sms = {
    'recipients': ['+1234567890'],  # Replace with recipient phone numbers
    'body': {
        'firstname': '{{firstName}}',
        'lastname': '{{lastName}}'
    }
}`;

        sections.push({
          title: 'Input - SMS',
          code: smsCode
        });
      }

      // Build the final input object
      const inputParts = [`    'slug': '${messageTag}'`];
      if (hasPushNotification) inputParts.push('    push_notification');
      if (hasEmail) inputParts.push('    email');
      if (hasCallback) inputParts.push('    callback');
      if (hasSms) inputParts.push('    sms');

      sections.push({
        title: 'Execute',
        code: `input_data = {
${inputParts.join(',\n')}
}

ductape.processor.notification.send({
    'env': '${envSlug}',
    'product': '${productTagValue}',
    'event': '${fullTag}',
    'input': input_data,
    'retries': 3
})`
      });

      return sections;
    }

    return [];
  };

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
                  <div className="text-grey-600">
                    <MarkdownViewer content={displayData.description} />
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleViewCode}
              variant="outline"
              className="gap-2"
            >
              <Code className="h-4 w-4" />
              View Code
            </Button>
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
                <Badge variant="outline" className="ml-auto text-grey">Configured</Badge>
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
                <Badge variant="outline" className="ml-auto text-grey">Configured</Badge>
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
                <Badge variant="outline" className="ml-auto text-grey">Configured</Badge>
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
                <Badge variant="outline" className="ml-auto text-grey">Configured</Badge>
              </div>
              <div className="space-y-4">
                {/* URL */}
                {displayData.callback.url && (
                  <div>
                    {JSON.stringify(displayData.callbacks)}
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

      {/* Code Sidebar */}
      {showCodeSidebar && (
        <CodeSidebar
          title={displayData.name}
          subtitle={`Send notifications using the ${notifierTag}:${displayData.tag} message template`}
          tag={`${notifierTag}:${displayData.tag}`}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={notification?.envs || []}
          additionalControls={undefined}
          onSectionAction={undefined}
          sectionFooter={undefined}
        />
      )}
    </div>
  );
}


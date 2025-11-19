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
          code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`
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
          code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`
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
    private_key='your-private-key'
)`
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
    } else if (language === 'java') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape;
import com.ductape.sdk.models.*;
import java.util.*;

Ductape ductape = new Ductape.Builder()
    .workspaceId("your-workspace-id")
    .userId("your-user-id")
    .privateKey("your-private-key")
    .build();`
        }
      ];

      // Add channel-specific input sections
      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `Map<String, Object> pushNotification = new HashMap<>();
pushNotification.put("device_token", "{{deviceToken}}");
${Object.entries(pushData).map(([key, value]) => `pushNotification.put("${key}", ${JSON.stringify(value)});`).join('\n')}`
            : `Map<String, Object> pushNotification = new HashMap<>();
pushNotification.put("device_token", "{{deviceToken}}");
pushNotification.put("title", Map.of("en", "Your title here"));
pushNotification.put("body", Map.of("en", "Your message here"));
pushNotification.put("data", Map.of("action", "open_screen"));`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `Map<String, Object> email = new HashMap<>();
email.put("to", Arrays.asList("user@example.com"));
email.put("subject", Map.of("en", "Email subject"));
email.put("template", Map.of("en", "<p>Email content</p>"));`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `Map<String, Object> callback = new HashMap<>();
callback.put("query", Map.of("userId", "{{userId}}"));
callback.put("headers", Map.of("Authorization", "Bearer token"));
callback.put("body", Map.of("event", "notification_sent"));`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `Map<String, Object> sms = new HashMap<>();
sms.put("recipients", Arrays.asList("+1234567890"));
Map<String, Object> smsBody = new HashMap<>();
smsBody.put("firstname", "{{firstName}}");
smsBody.put("lastname", "{{lastName}}");
sms.put("body", smsBody);`
        });
      }

      const inputParts = [];
      inputParts.push(`input.put("slug", "${messageTag}");`);
      if (hasPushNotification) inputParts.push('input.put("push_notification", pushNotification);');
      if (hasEmail) inputParts.push('input.put("email", email);');
      if (hasCallback) inputParts.push('input.put("callback", callback);');
      if (hasSms) inputParts.push('input.put("sms", sms);');

      sections.push({
        title: 'Execute',
        code: `Map<String, Object> input = new HashMap<>();
${inputParts.join('\n')}

NotificationRequest request = new NotificationRequest.Builder()
    .env("${envSlug}")
    .product("${productTagValue}")
    .event("${fullTag}")
    .input(input)
    .retries(3)
    .build();

ductape.processor().notification().send(request);`
      });

      return sections;
    } else if (language === 'ruby') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `require 'ductape'

ductape = Ductape::Client.new(
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
)`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `push_notification = {
  device_token: '{{deviceToken}}',
${Object.entries(pushData).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`).join(',\n')}
}`
            : `push_notification = {
  device_token: '{{deviceToken}}',
  title: { en: 'Your title here' },
  body: { en: 'Your message here' },
  data: { action: 'open_screen' }
}`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `email = {
  to: ['user@example.com'],
  subject: { en: 'Email subject' },
  template: { en: '<p>Email content</p>' }
}`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `callback = {
  query: { userId: '{{userId}}' },
  headers: { Authorization: 'Bearer token' },
  body: { event: 'notification_sent' }
}`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `sms = {
  recipients: ['+1234567890'],
  body: {
    firstname: '{{firstName}}',
    lastname: '{{lastName}}'
  }
}`
        });
      }

      const inputParts = [];
      inputParts.push(`  slug: '${messageTag}'`);
      if (hasPushNotification) inputParts.push('  push_notification: push_notification');
      if (hasEmail) inputParts.push('  email: email');
      if (hasCallback) inputParts.push('  callback: callback');
      if (hasSms) inputParts.push('  sms: sms');

      sections.push({
        title: 'Execute',
        code: `input_data = {
${inputParts.join(',\n')}
}

ductape.processor.notification.send(
  env: '${envSlug}',
  product: '${productTagValue}',
  event: '${fullTag}',
  input: input_data,
  retries: 3
)`
      });

      return sections;
    } else if (language === 'php') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `<?php
require_once 'vendor/autoload.php';

use Ductape\\Client;

$ductape = new Client([
    'workspace_id' => 'your-workspace-id',
    'user_id' => 'your-user-id',
    'private_key' => 'your-private-key'
]);`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `$pushNotification = [
    'device_token' => '{{deviceToken}}',
${Object.entries(pushData).map(([key, value]) => `    '${key}' => ${JSON.stringify(value)}`).join(',\n')}
];`
            : `$pushNotification = [
    'device_token' => '{{deviceToken}}',
    'title' => ['en' => 'Your title here'],
    'body' => ['en' => 'Your message here'],
    'data' => ['action' => 'open_screen']
];`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `$email = [
    'to' => ['user@example.com'],
    'subject' => ['en' => 'Email subject'],
    'template' => ['en' => '<p>Email content</p>']
];`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `$callback = [
    'query' => ['userId' => '{{userId}}'],
    'headers' => ['Authorization' => 'Bearer token'],
    'body' => ['event' => 'notification_sent']
];`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `$sms = [
    'recipients' => ['+1234567890'],
    'body' => [
        'firstname' => '{{firstName}}',
        'lastname' => '{{lastName}}'
    ]
];`
        });
      }

      const inputParts = [];
      inputParts.push(`    'slug' => '${messageTag}'`);
      if (hasPushNotification) inputParts.push("    'push_notification' => $pushNotification");
      if (hasEmail) inputParts.push("    'email' => $email");
      if (hasCallback) inputParts.push("    'callback' => $callback");
      if (hasSms) inputParts.push("    'sms' => $sms");

      sections.push({
        title: 'Execute',
        code: `$inputData = [
${inputParts.join(',\n')}
];

$ductape->processor->notification->send([
    'env' => '${envSlug}',
    'product' => '${productTagValue}',
    'event' => '${fullTag}',
    'input' => $inputData,
    'retries' => 3
]);`
      });

      return sections;
    } else if (language === 'kotlin') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape
import com.ductape.sdk.models.*

val ductape = Ductape(
    workspaceId = "your-workspace-id",
    userId = "your-user-id",
    privateKey = "your-private-key"
)`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `val pushNotification = mapOf(
    "device_token" to "{{deviceToken}}",
${Object.entries(pushData).map(([key, value]) => `    "${key}" to ${JSON.stringify(value)}`).join(',\n')}
)`
            : `val pushNotification = mapOf(
    "device_token" to "{{deviceToken}}",
    "title" to mapOf("en" to "Your title here"),
    "body" to mapOf("en" to "Your message here"),
    "data" to mapOf("action" to "open_screen")
)`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `val email = mapOf(
    "to" to listOf("user@example.com"),
    "subject" to mapOf("en" to "Email subject"),
    "template" to mapOf("en" to "<p>Email content</p>")
)`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `val callback = mapOf(
    "query" to mapOf("userId" to "{{userId}}"),
    "headers" to mapOf("Authorization" to "Bearer token"),
    "body" to mapOf("event" to "notification_sent")
)`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `val sms = mapOf(
    "recipients" to listOf("+1234567890"),
    "body" to mapOf(
        "firstname" to "{{firstName}}",
        "lastname" to "{{lastName}}"
    )
)`
        });
      }

      const inputParts = [];
      inputParts.push(`    "slug" to "${messageTag}"`);
      if (hasPushNotification) inputParts.push('    "push_notification" to pushNotification');
      if (hasEmail) inputParts.push('    "email" to email');
      if (hasCallback) inputParts.push('    "callback" to callback');
      if (hasSms) inputParts.push('    "sms" to sms');

      sections.push({
        title: 'Execute',
        code: `val inputData = mapOf(
${inputParts.join(',\n')}
)

ductape.processor.notification.send(
    NotificationRequest(
        env = "${envSlug}",
        product = "${productTagValue}",
        event = "${fullTag}",
        input = inputData,
        retries = 3
    )
)`
      });

      return sections;
    } else if (language === 'go') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `package main

import (
    "github.com/ductape/ductape-go"
)

client := ductape.NewClient(&ductape.Config{
    WorkspaceID: "your-workspace-id",
    UserID:      "your-user-id",
    PrivateKey:  "your-private-key",
})`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `pushNotification := map[string]interface{}{
    "device_token": "{{deviceToken}}",
${Object.entries(pushData).map(([key, value]) => `    "${key}": ${JSON.stringify(value)},`).join('\n')}
}`
            : `pushNotification := map[string]interface{}{
    "device_token": "{{deviceToken}}",
    "title": map[string]string{"en": "Your title here"},
    "body": map[string]string{"en": "Your message here"},
    "data": map[string]string{"action": "open_screen"},
}`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `email := map[string]interface{}{
    "to": []string{"user@example.com"},
    "subject": map[string]string{"en": "Email subject"},
    "template": map[string]string{"en": "<p>Email content</p>"},
}`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `callback := map[string]interface{}{
    "query": map[string]string{"userId": "{{userId}}"},
    "headers": map[string]string{"Authorization": "Bearer token"},
    "body": map[string]string{"event": "notification_sent"},
}`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `sms := map[string]interface{}{
    "recipients": []string{"+1234567890"},
    "body": map[string]string{
        "firstname": "{{firstName}}",
        "lastname": "{{lastName}}",
    },
}`
        });
      }

      const inputParts = [];
      inputParts.push(`    "slug": "${messageTag}",`);
      if (hasPushNotification) inputParts.push('    "push_notification": pushNotification,');
      if (hasEmail) inputParts.push('    "email": email,');
      if (hasCallback) inputParts.push('    "callback": callback,');
      if (hasSms) inputParts.push('    "sms": sms,');

      sections.push({
        title: 'Execute',
        code: `inputData := map[string]interface{}{
${inputParts.join('\n')}
}

request := &ductape.NotificationRequest{
    Env:     "${envSlug}",
    Product: "${productTagValue}",
    Event:   "${fullTag}",
    Input:   inputData,
    Retries: 3,
}

err := client.Processor.Notification.Send(request)
if err != nil {
    log.Fatal(err)
}`
      });

      return sections;
    } else if (language === 'csharp') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `using Ductape.Sdk;

var ductape = new DuctapeClient(new DuctapeConfig
{
    WorkspaceId = "your-workspace-id",
    UserId = "your-user-id",
    PrivateKey = "your-private-key"
});`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `var pushNotification = new Dictionary<string, object>
{
    ["device_token"] = "{{deviceToken}}",
${Object.entries(pushData).map(([key, value]) => `    ["${key}"] = ${JSON.stringify(value)},`).join('\n')}
};`
            : `var pushNotification = new Dictionary<string, object>
{
    ["device_token"] = "{{deviceToken}}",
    ["title"] = new Dictionary<string, string> { ["en"] = "Your title here" },
    ["body"] = new Dictionary<string, string> { ["en"] = "Your message here" },
    ["data"] = new Dictionary<string, string> { ["action"] = "open_screen" }
};`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `var email = new Dictionary<string, object>
{
    ["to"] = new[] { "user@example.com" },
    ["subject"] = new Dictionary<string, string> { ["en"] = "Email subject" },
    ["template"] = new Dictionary<string, string> { ["en"] = "<p>Email content</p>" }
};`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `var callback = new Dictionary<string, object>
{
    ["query"] = new Dictionary<string, string> { ["userId"] = "{{userId}}" },
    ["headers"] = new Dictionary<string, string> { ["Authorization"] = "Bearer token" },
    ["body"] = new Dictionary<string, string> { ["event"] = "notification_sent" }
};`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `var sms = new Dictionary<string, object>
{
    ["recipients"] = new[] { "+1234567890" },
    ["body"] = new Dictionary<string, string>
    {
        ["firstname"] = "{{firstName}}",
        ["lastname"] = "{{lastName}}"
    }
};`
        });
      }

      const inputParts = [];
      inputParts.push(`    ["slug"] = "${messageTag}"`);
      if (hasPushNotification) inputParts.push('    ["push_notification"] = pushNotification');
      if (hasEmail) inputParts.push('    ["email"] = email');
      if (hasCallback) inputParts.push('    ["callback"] = callback');
      if (hasSms) inputParts.push('    ["sms"] = sms');

      sections.push({
        title: 'Execute',
        code: `var inputData = new Dictionary<string, object>
{
${inputParts.join(',\n')}
};

var request = new NotificationRequest
{
    Env = "${envSlug}",
    Product = "${productTagValue}",
    Event = "${fullTag}",
    Input = inputData,
    Retries = 3
};

await ductape.Processor.Notification.SendAsync(request);`
      });

      return sections;
    } else if (language === 'rust') {
      const sections = [
        {
          title: 'Init Ductape',
          code: `use ductape_sdk::Ductape;
use std::collections::HashMap;

let ductape = Ductape::new(
    "your-workspace-id",
    "your-user-id",
    "your-private-key"
)?;`
        }
      ];

      if (hasPushNotification) {
        const pushData = groupByParentKey(displayData?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;

        sections.push({
          title: 'Input - Push Notification',
          code: hasPushData
            ? `let mut push_notification: HashMap<String, serde_json::Value> = HashMap::new();
push_notification.insert("device_token".to_string(), serde_json::json!("{{deviceToken}}"));
${Object.entries(pushData).map(([key, value]) => `push_notification.insert("${key}".to_string(), serde_json::json!(${JSON.stringify(value)}));`).join('\n')}`
            : `let mut push_notification: HashMap<String, serde_json::Value> = HashMap::new();
push_notification.insert("device_token".to_string(), serde_json::json!("{{deviceToken}}"));
push_notification.insert("title".to_string(), serde_json::json!({"en": "Your title here"}));
push_notification.insert("body".to_string(), serde_json::json!({"en": "Your message here"}));
push_notification.insert("data".to_string(), serde_json::json!({"action": "open_screen"}));`
        });
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `let mut email: HashMap<String, serde_json::Value> = HashMap::new();
email.insert("to".to_string(), serde_json::json!(vec!["user@example.com"]));
email.insert("subject".to_string(), serde_json::json!({"en": "Email subject"}));
email.insert("template".to_string(), serde_json::json!({"en": "<p>Email content</p>"}));`
        });
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `let mut callback: HashMap<String, serde_json::Value> = HashMap::new();
callback.insert("query".to_string(), serde_json::json!({"userId": "{{userId}}"}));
callback.insert("headers".to_string(), serde_json::json!({"Authorization": "Bearer token"}));
callback.insert("body".to_string(), serde_json::json!({"event": "notification_sent"}));`
        });
      }

      if (hasSms) {
        sections.push({
          title: 'Input - SMS',
          code: `let mut sms: HashMap<String, serde_json::Value> = HashMap::new();
sms.insert("recipients".to_string(), serde_json::json!(vec!["+1234567890"]));
let mut sms_body: HashMap<String, serde_json::Value> = HashMap::new();
sms_body.insert("firstname".to_string(), serde_json::json!("{{firstName}}"));
sms_body.insert("lastname".to_string(), serde_json::json!("{{lastName}}"));
sms.insert("body".to_string(), serde_json::json!(sms_body));`
        });
      }

      const inputParts = [];
      inputParts.push(`input.insert("slug".to_string(), serde_json::json!("${messageTag}"));`);
      if (hasPushNotification) inputParts.push('input.insert("push_notification".to_string(), serde_json::json!(push_notification));');
      if (hasEmail) inputParts.push('input.insert("email".to_string(), serde_json::json!(email));');
      if (hasCallback) inputParts.push('input.insert("callback".to_string(), serde_json::json!(callback));');
      if (hasSms) inputParts.push('input.insert("sms".to_string(), serde_json::json!(sms));');

      sections.push({
        title: 'Execute',
        code: `let mut input: HashMap<String, serde_json::Value> = HashMap::new();
${inputParts.join('\n')}

let request = NotificationRequest {
    env: "${envSlug}".to_string(),
    product: "${productTagValue}".to_string(),
    event: "${fullTag}".to_string(),
    input,
    retries: 3,
};

ductape.processor.notification.send(&request)?;`
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


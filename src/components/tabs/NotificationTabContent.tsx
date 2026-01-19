import { useState } from 'react';
import { Bell, Mail, Webhook, FileText, Plus, Box, Activity, Loader2, CheckCircle, Eye, EyeOff, Copy, Check, MessageSquare, Code } from 'lucide-react';
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
import CodeSidebar from '@/components/CodeSidebar';

interface NotificationTabContentProps {
  data?: any;
}

export default function NotificationTabContent({ data }: NotificationTabContentProps) {
  // Show error if notifier data is incomplete and can't be fetched
  if (!data?.name && !data?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Bell className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete notifier data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the notifier from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  const notifier: IProductNotifier = data;
  const productTag = data?.productTag;
  const productName = data?.productName;
  const productLogo = data?.productLogo;
  const [selectedEnv, setSelectedEnv] = useState<string>(notifier?.envs?.[0]?.slug || '');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [selectedMessageForCode, setSelectedMessageForCode] = useState<any>(null);
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
        // @ts-ignore
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

  const handleViewCode = (message: any) => {
    setSelectedMessageForCode(message);
    setShowCodeSidebar(true);
  };

  // Generate SDK code examples for sending notifications (same as MessageTabContent)
  const generateCodeSections = (language: string, env?: string) => {
    if (!selectedMessageForCode) return [];

    const messageTag = selectedMessageForCode?.tag || 'message-tag';
    const fullTag = notifier.tag ? `${notifier.tag}:${messageTag}` : messageTag;
    const productTagValue = productTag || 'your-product-tag';
    const envSlug = env || displayNotifier?.envs?.[0]?.slug || 'prd';

    // Helper function to group fields by parent_key
    const groupByParentKey = (fields: any[]) => {
      const grouped: Record<string, any> = {};
      fields.forEach((field) => {
        const parent = field.parent_key || 'root';
        if (parent === 'root') {
          grouped[field.key] = field.value;
        } else {
          if (!grouped[parent]) grouped[parent] = {};
          grouped[parent][field.key] = field.value;
        }
      });
      return grouped;
    };

    // Helper to format as JS object
    const formatAsJsObject = (obj: any, indent = '  '): string => {
      return Object.entries(obj)
        .map(([key, value]): string => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return `${indent}${key}: {\n${formatAsJsObject(value, indent + '  ')}\n${indent}}`;
          }
          return `${indent}${key}: ${JSON.stringify(value)}`;
        })
        .join(',\n');
    };

    // Helper to format as Python dict
    const formatAsPythonDict = (obj: any, indent = '    '): string => {
      return Object.entries(obj)
        .map(([key, value]): string => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return `${indent}'${key}': {\n${formatAsPythonDict(value, indent + '    ')}\n${indent}}`;
          }
          return `${indent}'${key}': ${JSON.stringify(value)}`;
        })
        .join(',\n');
    };

    const hasPushNotification = !!selectedMessageForCode?.push_notification;
    const hasEmail = !!selectedMessageForCode?.email;
    const hasCallback = !!selectedMessageForCode?.callback;
    const hasSms = !!selectedMessageForCode?.sms;

    if (language === 'javascript') {
      const sections: any[] = [
        {
          title: 'Init Ductape',
          code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  accessKey: 'your-access-key',
});`
        }
      ];

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;
        const pushCode = hasPushData
          ? `const push_notification = {\n  device_token: '{{deviceToken}}', // Replace with the user's device token\n${formatAsJsObject(pushData)}\n};`
          : `const push_notification = {
  device_token: '{{deviceToken}}', // Replace with the user's device token
  title: { en: 'Your title here' },
  body: { en: 'Your message here' },
  data: { action: 'open_screen' }
};`;
        sections.push({ title: 'Input - Push Notification', code: pushCode });
        inputParts.push('  push_notification');
      }

      if (hasEmail) {
        const emailData = groupByParentKey(selectedMessageForCode?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;
        const emailCode = hasEmailData
          ? `const email = {\n  to: ['user@example.com'], // Replace with recipient email addresses\n${formatAsJsObject(emailData)}\n};`
          : `const email = {
  to: ['user@example.com'], // Replace with recipient email addresses
  subject: { en: 'Email subject' },
  template: { en: '<p>Email content</p>' }
};`;
        sections.push({ title: 'Input - Email', code: emailCode });
        inputParts.push('  email');
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(selectedMessageForCode?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;
        const callbackCode = hasCallbackData
          ? `const callback = {\n${formatAsJsObject(callbackData)}\n};`
          : `const callback = {
  url: '{{callbackUrl}}',
  method: 'POST',
  body: { data: '{{callbackData}}' }
};`;
        sections.push({ title: 'Input - Callback', code: callbackCode });
        inputParts.push('  callback');
      }

      if (hasSms) {
        const smsData = groupByParentKey(selectedMessageForCode?.sms_data || []);
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
        sections.push({ title: 'Input - SMS', code: smsCode });
        inputParts.push('  sms');
      }

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
      const sections: any[] = [
        {
          title: 'Init Ductape',
          code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  accessKey: 'your-access-key',
});`
        }
      ];

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;
        const pushCode = hasPushData
          ? `const push_notification = {\n  device_token: '{{deviceToken}}', // Replace with the user's device token\n${formatAsJsObject(pushData)}\n};`
          : `const push_notification = {
  device_token: '{{deviceToken}}', // Replace with the user's device token
  title: { en: 'Your title here' },
  body: { en: 'Your message here' },
  data: { action: 'open_screen' }
};`;
        sections.push({ title: 'Input - Push Notification', code: pushCode });
        inputParts.push('  push_notification');
      }

      if (hasEmail) {
        const emailData = groupByParentKey(selectedMessageForCode?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;
        const emailCode = hasEmailData
          ? `const email = {\n  to: ['user@example.com'], // Replace with recipient email addresses\n${formatAsJsObject(emailData)}\n};`
          : `const email = {
  to: ['user@example.com'], // Replace with recipient email addresses
  subject: { en: 'Email subject' },
  template: { en: '<p>Email content</p>' }
};`;
        sections.push({ title: 'Input - Email', code: emailCode });
        inputParts.push('  email');
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(selectedMessageForCode?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;
        const callbackCode = hasCallbackData
          ? `const callback = {\n${formatAsJsObject(callbackData)}\n};`
          : `const callback = {
  url: '{{callbackUrl}}',
  method: 'POST',
  body: { data: '{{callbackData}}' }
};`;
        sections.push({ title: 'Input - Callback', code: callbackCode });
        inputParts.push('  callback');
      }

      if (hasSms) {
        const smsData = groupByParentKey(selectedMessageForCode?.sms_data || []);
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
        sections.push({ title: 'Input - SMS', code: smsCode });
        inputParts.push('  sms');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
        const hasPushData = Object.keys(pushData).length > 0;
        const pushCode = hasPushData
          ? `push_notification = {\n    'device_token': '{{deviceToken}}',  # Replace with the user's device token\n${formatAsPythonDict(pushData)}\n}`
          : `push_notification = {
    'device_token': '{{deviceToken}}',  # Replace with the user's device token
    'title': { 'en': 'Your title here' },
    'body': { 'en': 'Your message here' },
    'data': { 'action': 'open_screen' }
}`;
        sections.push({ title: 'Input - Push Notification', code: pushCode });
        inputParts.push('    push_notification');
      }

      if (hasEmail) {
        const emailData = groupByParentKey(selectedMessageForCode?.email_data || []);
        const hasEmailData = Object.keys(emailData).length > 0;
        const emailCode = hasEmailData
          ? `email = {\n    'to': ['user@example.com'],  # Replace with recipient email addresses\n${formatAsPythonDict(emailData)}\n}`
          : `email = {
    'to': ['user@example.com'],  # Replace with recipient email addresses
    'subject': { 'en': 'Email subject' },
    'template': { 'en': '<p>Email content</p>' }
}`;
        sections.push({ title: 'Input - Email', code: emailCode });
        inputParts.push('    email');
      }

      if (hasCallback) {
        const callbackData = groupByParentKey(selectedMessageForCode?.callback_data || []);
        const hasCallbackData = Object.keys(callbackData).length > 0;
        const callbackCode = hasCallbackData
          ? `callback = {\n${formatAsPythonDict(callbackData)}\n}`
          : `callback = {
    'url': '{{callbackUrl}}',
    'method': 'POST',
    'body': { 'data': '{{callbackData}}' }
}`;
        sections.push({ title: 'Input - Callback', code: callbackCode });
        inputParts.push('    callback');
      }

      if (hasSms) {
        const smsData = groupByParentKey(selectedMessageForCode?.sms_data || []);
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
        sections.push({ title: 'Input - SMS', code: smsCode });
        inputParts.push('    sms');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('input.put("push_notification", pushNotification);');
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `Map<String, Object> email = new HashMap<>();
email.put("to", Arrays.asList("user@example.com"));
email.put("subject", Map.of("en", "Email subject"));
email.put("template", Map.of("en", "<p>Email content</p>"));`
        });
        inputParts.push('input.put("email", email);');
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `Map<String, Object> callback = new HashMap<>();
callback.put("query", Map.of("userId", "{{userId}}"));
callback.put("headers", Map.of("Authorization", "Bearer token"));
callback.put("body", Map.of("event", "notification_sent"));`
        });
        inputParts.push('input.put("callback", callback);');
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
        inputParts.push('input.put("sms", sms);');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('  push_notification: push_notification');
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
        inputParts.push('  email: email');
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
        inputParts.push('  callback: callback');
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
        inputParts.push('  sms: sms');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push("    'push_notification' => $pushNotification");
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
        inputParts.push("    'email' => $email");
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
        inputParts.push("    'callback' => $callback");
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
        inputParts.push("    'sms' => $sms");
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('    "push_notification" to pushNotification');
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
        inputParts.push('    "email" to email');
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
        inputParts.push('    "callback" to callback');
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
        inputParts.push('    "sms" to sms');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('    "push_notification": pushNotification,');
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
        inputParts.push('    "email": email,');
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
        inputParts.push('    "callback": callback,');
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
        inputParts.push('    "sms": sms,');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('    ["push_notification"] = pushNotification');
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
        inputParts.push('    ["email"] = email');
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
        inputParts.push('    ["callback"] = callback');
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
        inputParts.push('    ["sms"] = sms');
      }

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
      const sections: any[] = [
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

      const inputParts: string[] = [];

      if (hasPushNotification) {
        const pushData = groupByParentKey(selectedMessageForCode?.push_notification_data || []);
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
        inputParts.push('    input.insert("push_notification".to_string(), serde_json::json!(push_notification));');
      }

      if (hasEmail) {
        sections.push({
          title: 'Input - Email',
          code: `let mut email: HashMap<String, serde_json::Value> = HashMap::new();
email.insert("to".to_string(), serde_json::json!(vec!["user@example.com"]));
email.insert("subject".to_string(), serde_json::json!({"en": "Email subject"}));
email.insert("template".to_string(), serde_json::json!({"en": "<p>Email content</p>"}));`
        });
        inputParts.push('    input.insert("email".to_string(), serde_json::json!(email));');
      }

      if (hasCallback) {
        sections.push({
          title: 'Input - Callback',
          code: `let mut callback: HashMap<String, serde_json::Value> = HashMap::new();
callback.insert("query".to_string(), serde_json::json!({"userId": "{{userId}}"}));
callback.insert("headers".to_string(), serde_json::json!({"Authorization": "Bearer token"}));
callback.insert("body".to_string(), serde_json::json!({"event": "notification_sent"}));`
        });
        inputParts.push('    input.insert("callback".to_string(), serde_json::json!(callback));');
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
        inputParts.push('    input.insert("sms".to_string(), serde_json::json!(sms));');
      }

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
                <FileText className="h-5 w-5 text-blue-500" />
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
                    notification: displayNotifier,
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
                <div
                  key={message._id || idx}
                  className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        openTab({
                          id: `message-${message._id || idx}-${Date.now()}`,
                          type: 'message',
                          title: message.name,
                          itemId: message._id,
                          data: {
                            ...message,
                            notification: displayNotifier,
                            productTag,
                            notifierTag: displayNotifier.tag,
                          },
                        });
                      }}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-grey text-sm">{message.name}</span>
                      {message.tag && (
                        <Badge variant="outline" className="text-xs text-grey">{message.tag}</Badge>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      {message.email && <Mail className="h-4 w-4 text-blue-500" />}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCode(message);
                        }}
                        className="h-7 px-2 gap-1"
                      >
                        <Code className="h-3 w-3" />
                        <span className="text-xs">Code</span>
                      </Button>
                    </div>
                  </div>
                </div>
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
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
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
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
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
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
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
                    <Badge variant="outline" className="ml-auto text-grey">Active</Badge>
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

      {/* Code Sidebar */}
      {showCodeSidebar && selectedMessageForCode && (
        <CodeSidebar
          title={selectedMessageForCode.name}
          subtitle={`Send notifications using the ${notifier.tag}:${selectedMessageForCode.tag} message template`}
          tag={`${notifier.tag}:${selectedMessageForCode.tag}`}
          onClose={() => {
            setShowCodeSidebar(false);
            setSelectedMessageForCode(null);
          }}
          generateCodeSections={generateCodeSections}
          environments={displayNotifier?.envs || []}
        />
      )}
    </div>
  );
}

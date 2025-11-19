import { MessageSquare, Loader2, Server, Database, CloudCog, CheckCircle, Box, Activity, Eye, EyeOff, Layers, Plus, Code } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import CodeSidebar from '@/components/CodeSidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MessageBrokerTabContentProps {
  messageBroker: any;
}

export default function MessageBrokerTabContent({ messageBroker }: MessageBrokerTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const productTag = messageBroker?.productTag;
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<string>(messageBroker?.envs?.[0]?.slug || '');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch message broker details from SDK
  const { data: messageBrokerData, isLoading } = useQuery({
    queryKey: ['message-broker', productTag, messageBroker?.tag],
    queryFn: async () => {
      await ductape?.init(productTag)
      if (!ductape || !productTag || !messageBroker?.tag) return messageBroker;
      return await (ductape as any).messageBrokers.fetch(messageBroker.tag);
    },
    enabled: !!ductape && !!productTag && !!messageBroker?.tag,
  });

  const displayData = messageBrokerData || messageBroker;

  // Extract product info for header
  const product = messageBroker?.productName && messageBroker?.productTag ? {
    name: messageBroker.productName,
    tag: messageBroker.productTag,
    logo: messageBroker.productLogo,
  } : null;

  // Get the configuration for the selected environment
  const brokerConfig = displayData?.envs?.find((env: any) => env.slug === selectedEnv);

  const toggleShowCredential = (key: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Generate SDK code examples
  const generateCodeSections = (language: string, env?: string) => {
    const brokerTag = displayData?.tag || 'message-broker-tag';
    // const productTagValue = productTag || 'your-product-tag';
    const envSlug = env || displayData?.envs?.[0]?.slug || 'prd';

    if (language === 'typescript') {
      return [
        {
          title: 'Init Ductape',
          code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
const result = await ductape.messageBrokers.publish('${brokerTag}', {
  env: '${envSlug}',
  data: {
    eventType: 'user.created',
    payload: {
      userId: '12345',
      email: 'user@example.com',
      timestamp: new Date().toISOString()
    }
  }
});

console.log('Message published:', result);`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
await ductape.messageBrokers.subscribe('${brokerTag}', {
  env: '${envSlug}',
  handler: async (message) => {
    console.log('Received message:', message);

    // Process the message
    const { eventType, payload } = message.data;

    // Your business logic here
    switch (eventType) {
      case 'user.created':
        console.log('New user created:', payload);
        break;
      case 'order.placed':
        console.log('New order placed:', payload);
        break;
    }

    // Acknowledge the message
    return { success: true };
  }
});`,
        },
      ];
    }

    if (language === 'java') {
      return [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape;
import com.ductape.sdk.models.*;
import java.util.*;

Ductape ductape = new Ductape.Builder()
    .workspaceId("your-workspace-id")
    .userId("your-user-id")
    .privateKey("your-private-key")
    .build();`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
Map<String, Object> payload = new HashMap<>();
payload.put("userId", "12345");
payload.put("email", "user@example.com");
payload.put("timestamp", new Date().toString());

Map<String, Object> data = new HashMap<>();
data.put("eventType", "user.created");
data.put("payload", payload);

MessageRequest request = new MessageRequest.Builder()
    .brokerTag("${brokerTag}")
    .env("${envSlug}")
    .data(data)
    .build();

MessageResponse result = ductape.messageBrokers().publish(request);
System.out.println("Message published: " + result);`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
ductape.messageBrokers().subscribe("${brokerTag}", new SubscribeOptions.Builder()
    .env("${envSlug}")
    .handler((message) -> {
        System.out.println("Received message: " + message);

        Map<String, Object> data = (Map<String, Object>) message.getData();
        String eventType = (String) data.get("eventType");
        Map<String, Object> payload = (Map<String, Object>) data.get("payload");

        if ("user.created".equals(eventType)) {
            System.out.println("New user created: " + payload);
        }

        return Map.of("success", true);
    })
    .build());`,
        },
      ];
    }

    if (language === 'ruby') {
      return [
        {
          title: 'Init Ductape',
          code: `require 'ductape'

ductape = Ductape::Client.new(
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
)`,
        },
        {
          title: 'Publish Message',
          code: `# Publish a message to the broker
result = ductape.message_brokers.publish('${brokerTag}',
  env: '${envSlug}',
  data: {
    eventType: 'user.created',
    payload: {
      userId: '12345',
      email: 'user@example.com',
      timestamp: Time.now.iso8601
    }
  }
)

puts "Message published: #{result}"`,
        },
        {
          title: 'Subscribe to Messages',
          code: `# Subscribe to messages from the broker
ductape.message_brokers.subscribe('${brokerTag}',
  env: '${envSlug}',
  handler: ->(message) {
    puts "Received message: #{message}"

    event_type = message[:data][:eventType]
    payload = message[:data][:payload]

    if event_type == 'user.created'
      puts "New user created: #{payload}"
    elsif event_type == 'order.placed'
      puts "New order placed: #{payload}"
    end

    { success: true }
  }
)`,
        },
      ];
    }

    if (language === 'php') {
      return [
        {
          title: 'Init Ductape',
          code: `<?php
require_once 'vendor/autoload.php';

use Ductape\\Client;

$ductape = new Client([
    'workspace_id' => 'your-workspace-id',
    'user_id' => 'your-user-id',
    'private_key' => 'your-private-key'
]);`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
$result = $ductape->messageBrokers->publish('${brokerTag}', [
    'env' => '${envSlug}',
    'data' => [
        'eventType' => 'user.created',
        'payload' => [
            'userId' => '12345',
            'email' => 'user@example.com',
            'timestamp' => date('c')
        ]
    ]
]);

echo "Message published: " . json_encode($result);`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
$ductape->messageBrokers->subscribe('${brokerTag}', [
    'env' => '${envSlug}',
    'handler' => function($message) {
        echo "Received message: " . json_encode($message);

        $eventType = $message['data']['eventType'];
        $payload = $message['data']['payload'];

        if ($eventType === 'user.created') {
            echo "New user created: " . json_encode($payload);
        } elseif ($eventType === 'order.placed') {
            echo "New order placed: " . json_encode($payload);
        }

        return ['success' => true];
    }
]);`,
        },
      ];
    }

    if (language === 'kotlin') {
      return [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape
import com.ductape.sdk.models.*

val ductape = Ductape(
    workspaceId = "your-workspace-id",
    userId = "your-user-id",
    privateKey = "your-private-key"
)`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
val data = mapOf(
    "eventType" to "user.created",
    "payload" to mapOf(
        "userId" to "12345",
        "email" to "user@example.com",
        "timestamp" to System.currentTimeMillis()
    )
)

val request = MessageRequest(
    brokerTag = "${brokerTag}",
    env = "${envSlug}",
    data = data
)

val result = ductape.messageBrokers.publish(request)
println("Message published: $result")`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
ductape.messageBrokers.subscribe("${brokerTag}") { message ->
    println("Received message: $message")

    val eventType = message.data["eventType"] as String
    val payload = message.data["payload"] as Map<*, *>

    when (eventType) {
        "user.created" -> println("New user created: $payload")
        "order.placed" -> println("New order placed: $payload")
    }

    mapOf("success" to true)
}`,
        },
      ];
    }

    if (language === 'go') {
      return [
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
})`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
data := map[string]interface{}{
    "eventType": "user.created",
    "payload": map[string]interface{}{
        "userId":    "12345",
        "email":     "user@example.com",
        "timestamp": time.Now().Format(time.RFC3339),
    },
}

request := &ductape.MessageRequest{
    BrokerTag: "${brokerTag}",
    Env:       "${envSlug}",
    Data:      data,
}

result, err := client.MessageBrokers.Publish(request)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Message published: %v\\n", result)`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
err := client.MessageBrokers.Subscribe("${brokerTag}", &ductape.SubscribeOptions{
    Env: "${envSlug}",
    Handler: func(message *ductape.Message) (map[string]interface{}, error) {
        fmt.Printf("Received message: %v\\n", message)

        eventType := message.Data["eventType"].(string)
        payload := message.Data["payload"].(map[string]interface{})

        switch eventType {
        case "user.created":
            fmt.Printf("New user created: %v\\n", payload)
        case "order.placed":
            fmt.Printf("New order placed: %v\\n", payload)
        }

        return map[string]interface{}{"success": true}, nil
    },
})

if err != nil {
    log.Fatal(err)
}`,
        },
      ];
    }

    if (language === 'csharp') {
      return [
        {
          title: 'Init Ductape',
          code: `using Ductape.Sdk;

var ductape = new DuctapeClient(new DuctapeConfig
{
    WorkspaceId = "your-workspace-id",
    UserId = "your-user-id",
    PrivateKey = "your-private-key"
});`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
var data = new Dictionary<string, object>
{
    ["eventType"] = "user.created",
    ["payload"] = new Dictionary<string, object>
    {
        ["userId"] = "12345",
        ["email"] = "user@example.com",
        ["timestamp"] = DateTime.UtcNow.ToString("o")
    }
};

var request = new MessageRequest
{
    BrokerTag = "${brokerTag}",
    Env = "${envSlug}",
    Data = data
};

var result = await ductape.MessageBrokers.PublishAsync(request);
Console.WriteLine($"Message published: {result}");`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
await ductape.MessageBrokers.SubscribeAsync("${brokerTag}", new SubscribeOptions
{
    Env = "${envSlug}",
    Handler = async (message) =>
    {
        Console.WriteLine($"Received message: {message}");

        var eventType = message.Data["eventType"] as string;
        var payload = message.Data["payload"] as Dictionary<string, object>;

        switch (eventType)
        {
            case "user.created":
                Console.WriteLine($"New user created: {payload}");
                break;
            case "order.placed":
                Console.WriteLine($"New order placed: {payload}");
                break;
        }

        return new Dictionary<string, object> { ["success"] = true };
    }
});`,
        },
      ];
    }

    if (language === 'rust') {
      return [
        {
          title: 'Init Ductape',
          code: `use ductape_sdk::Ductape;
use std::collections::HashMap;

let ductape = Ductape::new(
    "your-workspace-id",
    "your-user-id",
    "your-private-key"
)?;`,
        },
        {
          title: 'Publish Message',
          code: `// Publish a message to the broker
let mut payload: HashMap<String, serde_json::Value> = HashMap::new();
payload.insert("userId".to_string(), serde_json::json!("12345"));
payload.insert("email".to_string(), serde_json::json!("user@example.com"));
payload.insert("timestamp".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));

let mut data: HashMap<String, serde_json::Value> = HashMap::new();
data.insert("eventType".to_string(), serde_json::json!("user.created"));
data.insert("payload".to_string(), serde_json::json!(payload));

let request = MessageRequest {
    broker_tag: "${brokerTag}".to_string(),
    env: "${envSlug}".to_string(),
    data,
};

let result = ductape.message_brokers.publish(&request)?;
println!("Message published: {:?}", result);`,
        },
        {
          title: 'Subscribe to Messages',
          code: `// Subscribe to messages from the broker
ductape.message_brokers.subscribe("${brokerTag}", SubscribeOptions {
    env: "${envSlug}".to_string(),
    handler: Box::new(|message| {
        println!("Received message: {:?}", message);

        let event_type = message.data.get("eventType")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        match event_type {
            "user.created" => {
                println!("New user created: {:?}", message.data.get("payload"));
            }
            "order.placed" => {
                println!("New order placed: {:?}", message.data.get("payload"));
            }
            _ => {}
        }

        Ok(serde_json::json!({"success": true}))
    }),
})?;`,
        },
      ];
    }

    // JavaScript examples
    return [
      {
        title: 'Init Ductape',
        code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
      },
      {
        title: 'Publish Message',
        code: `// Publish a message to the broker
const result = await ductape.messageBrokers.publish('${brokerTag}', {
  env: '${envSlug}',
  data: {
    eventType: 'user.created',
    payload: {
      userId: '12345',
      email: 'user@example.com',
      timestamp: new Date().toISOString()
    }
  }
});

console.log('Message published:', result);`,
      },
      {
        title: 'Subscribe to Messages',
        code: `// Subscribe to messages from the broker
await ductape.messageBrokers.subscribe('${brokerTag}', {
  env: '${envSlug}',
  handler: async (message) => {
    console.log('Received message:', message);

    // Process the message
    const { eventType, payload } = message.data;

    // Your business logic here
    if (eventType === 'user.created') {
      console.log('New user created:', payload);
    } else if (eventType === 'order.placed') {
      console.log('New order placed:', payload);
    }

    // Acknowledge the message
    return { success: true };
  }
});`,
      },
    ];
  };

  // Helper function to generate input message structure from data array
  const generateInputMessage = (topic: any, indent = '  '): string => {
    // Check topic's data array
    let dataArray = topic?.data;

    // If topic has a data array, use it to build the structure
    if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
      return dataArray
        .map((field: any) => `${indent}${field.key}: undefined`)
        .join(',\n');
    }

    // Otherwise, use the sample data as fallback
    const sampleData = topic?.sample || {
      userId: "{{userId}}",
      eventType: "{{eventType}}",
      timestamp: "{{timestamp}}"
    };

    // Convert sample data to undefined format
    const formatObject = (obj: any, currentIndent: string): string => {
      return Object.entries(obj)
        .map(([key, value]): string => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nested = formatObject(value, currentIndent + '  ');
            return `${currentIndent}${key}: {\n${nested}\n${currentIndent}}`;
          }
          return `${currentIndent}${key}: undefined`;
        })
        .join(',\n');
    };

    return formatObject(sampleData, indent);
  };

  // Generate topic-specific code examples
  const generateTopicCodeSections = (language: string, topic: any, env?: string) => {
    const productTagValue = productTag || 'your-product-tag';
    const envSlug = env || displayData?.envs?.[0]?.slug || 'prd';
    const topicTag = topic?.tag || topic?.name || 'topic-tag';
    const topicName = topic?.name || 'Topic Name';

    if (language === 'typescript') {
      const inputMessage = generateInputMessage(topic, '      ');

      return [
        {
          title: 'Init Ductape',
          code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `await ductape.processor.messageBroker.publish({
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  session: {
    token: 'your-session-token',
    tag: 'your-session-tag'
  },
  message: {
${inputMessage}
  }
});`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `await ductape.processor.messageBroker.subscribe({
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  callback: async (message) => {
    console.log('Received message from ${topicName}:', message);
    // Implement processing logic here
  }
});`,
        },
      ];
    }

    if (language === 'java') {
      const inputMessage = generateInputMessage(topic, '            ');
      return [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape;
import com.ductape.sdk.models.*;

Ductape ductape = new Ductape.Builder()
    .workspaceId("your-workspace-id")
    .userId("your-user-id")
    .privateKey("your-private-key")
    .build();`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `Map<String, Object> message = new HashMap<>();
${inputMessage.split('\n').map(line => line.replace(/undefined/g, 'null')).join('\n')}

TopicPublishRequest request = new TopicPublishRequest.Builder()
    .env("${envSlug}")
    .event("${topicTag}")
    .product("${productTagValue}")
    .sessionToken("your-session-token")
    .sessionTag("your-session-tag")
    .message(message)
    .build();

ductape.processor().messageBroker().publish(request);`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `ductape.processor().messageBroker().subscribe(new SubscribeRequest.Builder()
    .env("${envSlug}")
    .event("${topicTag}")
    .product("${productTagValue}")
    .callback((message) -> {
        System.out.println("Received message from ${topicName}: " + message);
        // Implement processing logic here
    })
    .build());`,
        },
      ];
    }

    if (language === 'ruby') {
      const inputMessage = generateInputMessage(topic, '    ');
      return [
        {
          title: 'Init Ductape',
          code: `require 'ductape'

ductape = Ductape::Client.new(
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
)`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `message = {
${inputMessage.replace(/undefined/g, 'nil')}
}

ductape.processor.message_broker.publish(
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  session: {
    token: 'your-session-token',
    tag: 'your-session-tag'
  },
  message: message
)`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `ductape.processor.message_broker.subscribe(
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  callback: ->(message) {
    puts "Received message from ${topicName}: #{message}"
    # Implement processing logic here
  }
)`,
        },
      ];
    }

    if (language === 'php') {
      const inputMessage = generateInputMessage(topic, '    ');
      return [
        {
          title: 'Init Ductape',
          code: `<?php
require_once 'vendor/autoload.php';

use Ductape\\Client;

$ductape = new Client([
    'workspace_id' => 'your-workspace-id',
    'user_id' => 'your-user-id',
    'private_key' => 'your-private-key'
]);`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `$message = [
${inputMessage.replace(/undefined/g, 'null')}
];

$ductape->processor->messageBroker->publish([
    'env' => '${envSlug}',
    'event' => '${topicTag}',
    'product' => '${productTagValue}',
    'session' => [
        'token' => 'your-session-token',
        'tag' => 'your-session-tag'
    ],
    'message' => $message
]);`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `$ductape->processor->messageBroker->subscribe([
    'env' => '${envSlug}',
    'event' => '${topicTag}',
    'product' => '${productTagValue}',
    'callback' => function($message) {
        echo "Received message from ${topicName}: " . json_encode($message);
        // Implement processing logic here
    }
]);`,
        },
      ];
    }

    if (language === 'kotlin') {
      const inputMessage = generateInputMessage(topic, '        ');
      return [
        {
          title: 'Init Ductape',
          code: `import com.ductape.sdk.Ductape
import com.ductape.sdk.models.*

val ductape = Ductape(
    workspaceId = "your-workspace-id",
    userId = "your-user-id",
    privateKey = "your-private-key"
)`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `val message = mapOf(
${inputMessage.replace(/undefined/g, 'null')}
)

ductape.processor.messageBroker.publish(
    TopicPublishRequest(
        env = "${envSlug}",
        event = "${topicTag}",
        product = "${productTagValue}",
        session = Session(
            token = "your-session-token",
            tag = "your-session-tag"
        ),
        message = message
    )
)`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `ductape.processor.messageBroker.subscribe(
    env = "${envSlug}",
    event = "${topicTag}",
    product = "${productTagValue}"
) { message ->
    println("Received message from ${topicName}: $message")
    // Implement processing logic here
}`,
        },
      ];
    }

    if (language === 'go') {
      const inputMessage = generateInputMessage(topic, '        ');
      return [
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
})`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `message := map[string]interface{}{
${inputMessage.replace(/undefined/g, 'nil')}
}

request := &ductape.TopicPublishRequest{
    Env:     "${envSlug}",
    Event:   "${topicTag}",
    Product: "${productTagValue}",
    Session: &ductape.Session{
        Token: "your-session-token",
        Tag:   "your-session-tag",
    },
    Message: message,
}

err := client.Processor.MessageBroker.Publish(request)
if err != nil {
    log.Fatal(err)
}`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `err := client.Processor.MessageBroker.Subscribe(&ductape.SubscribeRequest{
    Env:     "${envSlug}",
    Event:   "${topicTag}",
    Product: "${productTagValue}",
    Callback: func(message map[string]interface{}) error {
        fmt.Printf("Received message from ${topicName}: %v\\n", message)
        // Implement processing logic here
        return nil
    },
})

if err != nil {
    log.Fatal(err)
}`,
        },
      ];
    }

    if (language === 'csharp') {
      const inputMessage = generateInputMessage(topic, '        ');
      return [
        {
          title: 'Init Ductape',
          code: `using Ductape.Sdk;

var ductape = new DuctapeClient(new DuctapeConfig
{
    WorkspaceId = "your-workspace-id",
    UserId = "your-user-id",
    PrivateKey = "your-private-key"
});`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `var message = new Dictionary<string, object>
{
${inputMessage.replace(/undefined/g, 'null')}
};

var request = new TopicPublishRequest
{
    Env = "${envSlug}",
    Event = "${topicTag}",
    Product = "${productTagValue}",
    Session = new Session
    {
        Token = "your-session-token",
        Tag = "your-session-tag"
    },
    Message = message
};

await ductape.Processor.MessageBroker.PublishAsync(request);`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `await ductape.Processor.MessageBroker.SubscribeAsync(new SubscribeRequest
{
    Env = "${envSlug}",
    Event = "${topicTag}",
    Product = "${productTagValue}",
    Callback = async (message) =>
    {
        Console.WriteLine($"Received message from ${topicName}: {message}");
        // Implement processing logic here
    }
});`,
        },
      ];
    }

    if (language === 'rust') {
      const inputMessage = generateInputMessage(topic, '        ');
      return [
        {
          title: 'Init Ductape',
          code: `use ductape_sdk::Ductape;
use std::collections::HashMap;

let ductape = Ductape::new(
    "your-workspace-id",
    "your-user-id",
    "your-private-key"
)?;`,
        },
        {
          title: `Publish to ${topicName}`,
          code: `let mut message: HashMap<String, serde_json::Value> = HashMap::new();
${inputMessage.replace(/undefined/g, 'serde_json::Value::Null').replace(/:/g, '.insert(')}

let request = TopicPublishRequest {
    env: "${envSlug}".to_string(),
    event: "${topicTag}".to_string(),
    product: "${productTagValue}".to_string(),
    session: Session {
        token: "your-session-token".to_string(),
        tag: "your-session-tag".to_string(),
    },
    message,
};

ductape.processor.message_broker.publish(&request)?;`,
        },
        {
          title: `Subscribe to ${topicName}`,
          code: `ductape.processor.message_broker.subscribe(SubscribeRequest {
    env: "${envSlug}".to_string(),
    event: "${topicTag}".to_string(),
    product: "${productTagValue}".to_string(),
    callback: Box::new(|message| {
        println!("Received message from ${topicName}: {:?}", message);
        // Implement processing logic here
        Ok(())
    }),
})?;`,
        },
      ];
    }

    // JavaScript examples
    const inputMessage = generateInputMessage(topic, '      ');

    return [
      {
        title: 'Init Ductape',
        code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
      },
      {
        title: `Publish to ${topicName}`,
        code: `await ductape.processor.messageBroker.publish({
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  session: {
    token: 'your-session-token',
    tag: 'your-session-tag'
  },
  message: {
${inputMessage}
  }
});`,
      },
      {
        title: `Subscribe to ${topicName}`,
        code: `await ductape.processor.messageBroker.subscribe({
  env: '${envSlug}',
  event: '${topicTag}',
  product: '${productTagValue}',
  callback: async (message) => {
    console.log('Received message from ${topicName}:', message);
    // Implement processing logic here
  }
});`,
      },
    ];
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading message broker details...</p>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600">Message broker not found</p>
        </div>
      </div>
    );
  }

  const getBrokerTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      rabbitmq: { Icon: Database, color: 'text-blue', bgColor: 'bg-blue/10' },
      redis: { Icon: Server, color: 'text-red', bgColor: 'bg-red/10' },
      aws_sqs: { Icon: CloudCog, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
      kafka: { Icon: Server, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
      google_pubsub: { Icon: CloudCog, color: 'text-green', bgColor: 'bg-green/10' },
    };
    return iconMap[type?.toLowerCase()] || { Icon: MessageSquare, color: 'text-grey', bgColor: 'bg-grey/10' };
  };

  const getBrokerTypeName = (type: string) => {
    const nameMap: Record<string, string> = {
      rabbitmq: 'RabbitMQ',
      redis: 'Redis Pub/Sub',
      aws_sqs: 'AWS SQS',
      kafka: 'Apache Kafka',
      google_pubsub: 'Google Pub/Sub',
    };
    return nameMap[type?.toLowerCase()] || type;
  };

  // Get unique broker types
  const brokerTypes = [...new Set(displayData?.envs?.map((env: any) => getBrokerTypeName(env.type)) || [])];

  // Get topics/queues from all environments
  const allTopics = displayData?.topics || [];
  const totalTopics = allTopics.length;

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
                  <h2 className="text-xl font-bold text-grey">Message Broker for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This message broker is connected to your product and configured for its environments
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
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{displayData.tag}</span></span>
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
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
                <div className="text-2xl font-bold text-grey">{displayData.envs?.length || 0}</div>
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
                <div className="text-2xl font-bold text-grey">{brokerTypes.length}</div>
                <div className="text-sm text-grey-600">Broker Types</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green" />
                  <div className="text-sm font-medium text-grey">Active</div>
                </div>
                <div className="text-xs text-grey-600 mt-1">Message broker</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-grey-400 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-grey">{totalTopics}</div>
                <div className="text-sm text-grey-600">Topics/Queues</div>
              </div>
            </div>
          </div>
        </div>

        {/* Topics/Queues */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Topics & Queues</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                openTab({
                  id: `new-topic-${Date.now()}`,
                  type: 'new-topic',
                  title: 'New Topic',
                  itemId: 'new',
                  data: {
                    messageBroker: displayData,
                    productTag,
                    productName: messageBroker?.productName,
                    productLogo: messageBroker?.productLogo,
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

          {!allTopics || allTopics.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600 mb-1">No topics configured yet</p>
              <p className="text-xs text-grey-500">Topics and queues will appear here once configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allTopics.map((topic: any, idx: number) => (
                <div
                  key={topic._id || idx}
                  className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="font-medium text-grey text-sm">{topic.name || topic.topic || topic.queue}</span>
                      {topic.type && (
                        <Badge variant="outline" className="text-xs text-grey">{topic.type}</Badge>
                      )}
                      {topic.env && (
                        <Badge variant="outline" className="text-xs ml-2">{topic.env}</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedTopic(topic);
                        setShowCodeSidebar(true);
                      }}
                      className="flex items-center gap-1.5 text-grey hover:text-primary"
                    >
                      <Code className="h-3.5 w-3.5" />
                      <span className="text-xs">Code</span>
                    </Button>
                  </div>
                  {topic.description && (
                    <p className="text-xs text-grey-600 mt-2 ml-6">{topic.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Configuration</h2>
            {displayData.envs && displayData.envs.length > 1 && (
              <Select value={selectedEnv} onValueChange={setSelectedEnv}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {displayData.envs.map((env: any, index: number) => (
                    <SelectItem key={env._id || env.slug || index} value={env.slug}>
                      {env.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!brokerConfig ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <p className="text-sm text-grey-600">No configuration available for this environment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-grey-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const { Icon, color, bgColor } = getBrokerTypeIcon(brokerConfig.type);
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <span className="font-medium text-grey">{getBrokerTypeName(brokerConfig.type)}</span>
                        <Badge variant="outline" className="ml-auto text-grey">{brokerConfig.type}</Badge>
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-3">
                  {brokerConfig.config && Object.keys(brokerConfig.config).length > 0 ? (
                    Object.entries(brokerConfig.config).map(([key, value]: [string, any]) => {
                      // Check if this is a sensitive field
                      const isSensitive = key.toLowerCase().includes('password') ||
                                         key.toLowerCase().includes('secret') ||
                                         key.toLowerCase().includes('key') ||
                                         key.toLowerCase().includes('credentials') ||
                                         key.toLowerCase().includes('token');

                      if (isSensitive) {
                        return (
                          <div key={key}>
                            <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">{key}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type={showCredentials[key] ? 'text' : 'password'}
                                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                disabled
                                className="bg-white text-grey font-mono pr-10"
                              />
                              <button
                                onClick={() => toggleShowCredential(key)}
                                className="text-grey-600 hover:text-grey"
                              >
                                {showCredentials[key] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Display non-sensitive config
                      return (
                        <div key={key}>
                          <Label className="text-xs font-semibold text-grey uppercase tracking-wide mb-1 block">{key}</Label>
                          <Input
                            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            disabled
                            className="bg-white text-grey font-mono"
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-grey-600">No configuration details available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Message Brokers</h3>
          <p className="text-xs text-blue-800">
            Message brokers enable asynchronous communication between services. They support various messaging patterns including pub/sub, queues, and topics for reliable message delivery across distributed systems.
          </p>
        </div>
      </div>

      {/* Code Sidebar */}
      {showCodeSidebar && (
        <CodeSidebar
          title={selectedTopic ? `${selectedTopic.name || selectedTopic.topic || selectedTopic.queue} - Code Examples` : 'Message Broker - Code Examples'}
          onClose={() => {
            setShowCodeSidebar(false);
            setSelectedTopic(null);
          }}
          generateCodeSections={selectedTopic
            ? (language: string, env?: string) => generateTopicCodeSections(language, selectedTopic, env)
            : generateCodeSections
          }
          environments={displayData?.envs?.map((env: any) => ({
            slug: env.slug,
            env_name: env.slug,
          })) || []}
        />
      )}
    </div>
  );
}

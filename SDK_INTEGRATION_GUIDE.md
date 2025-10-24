# Ductape SDK Integration Guide for Workbench

## Overview

The Ductape SDK is extensively used throughout the frontend app for complex operations. The workbench must support SDK-based workflows in addition to simple HTTP requests.

## SDK Architecture

### Two Main Namespaces

1. **`ductape.app`** - For App management
   - Actions (import, validate, execute)
   - Webhooks
   - Authorization configurations
   - Variables & Constants

2. **`ductape.product`** - For Product/Integration management
   - Features (create, execute)
   - Storage (S3, Azure, GCP)
   - Databases (MySQL, PostgreSQL, MongoDB)
   - Message Brokers (RabbitMQ, SQS, Kafka)
   - Caches (Redis)
   - Jobs (Background tasks)
   - Sessions (User sessions)
   - Notifications (Email, SMS, Push)

### Execution Namespace

3. **`ductape.processor`** - For runtime execution
   - `processor.action.run()` - Execute app actions
   - `processor.feature.run()` - Execute integration features
   - `processor.sessions.*` - Session operations
   - `processor.db.execute()` - Database queries
   - `processor.notification.send()` - Send notifications
   - `processor.storage.*` - File operations
   - `processor.messageBroker.*` - Pub/sub operations

## Standard SDK Usage Pattern

### Initialization

```typescript
import { Ductape } from '@ductape/sdk';
import { EnvType } from '@ductape/sdk/dist/types';

// 1. Create SDK instance
const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  env_type: EnvType.PRODUCTION
});

// 2. Set credentials
ductape.setPublicKey('your-public-key');
ductape.setToken('your-auth-token');

// 3. Initialize context
await ductape.app.init('app-tag');
// OR
await ductape.product.init('product-tag');
```

### Execution Pattern

```typescript
// For App Actions
const result = await ductape.processor.action.run({
  app: 'app-tag',
  action: 'action-tag',
  input: {
    // action input parameters
  }
});

// For Product Features
const result = await ductape.processor.feature.run({
  product: 'product-tag',
  feature: 'feature-tag',
  input: {
    // feature input parameters
  },
  session: { // Optional
    tag: 'session-tag',
    token: 'session-token'
  }
});
```

## Real Examples from Frontend App

### Example 1: Storage Management

```typescript
// File: src/components/integrations/storages.tsx

const ductape = useDuctape({
  workspace_id: integration?.workspace_id,
  user_id: user?._id,
  token: user?.auth_token,
  public_key: user?.public_key,
  type: 'product'
});

// Initialize product
await ductape.init(integration.tag);

// List all storages
const storages = await ductape.storage.fetchAll();

// Create new storage
const storage = await ductape.storage.create({
  name: 'My S3 Bucket',
  tag: 'my-s3-bucket',
  envs: [{
    slug: 'production',
    type: 'AWS',
    bucketName: 'my-bucket',
    accessKeyId: 'AKIA...',
    secretAccessKey: 'secret...',
    region: 'us-east-1'
  }]
});
```

### Example 2: Database Operations

```typescript
// File: src/components/integrations/databases.tsx

await ductape.init(integration.tag);

// Create database connection
const database = await ductape.databases.create({
  name: 'Main Database',
  tag: 'main-db',
  type: 'PostgreSQL',
  envs: [{
    slug: 'production',
    connection_url: 'postgresql://user:pass@host:5432/dbname'
  }]
});

// Execute query via processor
const result = await ductape.processor.db.execute({
  database: 'main-db',
  query: 'SELECT * FROM users WHERE id = $1',
  params: [userId]
});
```

### Example 3: Action Import (Postman/OpenAPI)

```typescript
// File: src/components/apps/get-started/step-one.tsx

const ductape = useDuctape({
  workspace_id: app.workspace_id,
  user_id: user._id,
  token: user.auth_token,
  public_key: user.public_key,
  type: 'app'
});

// Get actions importer
const importer = await ductape.actions;

// Import from Postman
const result = await importer.import({
  file: fileBuffer as unknown as Buffer,
  type: ImportDocsTypes.postmanV21,
  version: '0.0.1',
  appTag: app.tag,
  updateIfExists: true
});
```

### Example 4: Session Management

```typescript
// File: src/pages/integrations/integration/session.tsx

await ductape.init(integration.tag);

// Start session
const { token, refreshToken } = await ductape.processor.sessions.start({
  product: integration.tag,
  session: 'user-session',
  user: {
    id: 'user-123',
    email: 'user@example.com'
  },
  meta: {
    // custom metadata
  }
});

// Decrypt session
const sessionData = await ductape.processor.sessions.decrypt({
  product: integration.tag,
  session: 'user-session',
  token: sessionToken
});

// Refresh session
const newTokens = await ductape.processor.sessions.refresh({
  product: integration.tag,
  session: 'user-session',
  refreshToken: refreshToken
});
```

### Example 5: Feature Execution

```typescript
// File: src/components/integrations/feature-builder.tsx

await ductape.product.init(integration.tag);

// Create feature
await ductape.product.features.create({
  name: 'Process Payment',
  tag: 'process-payment',
  description: 'Process customer payment',
  inputs: {
    amount: { type: 'number', required: true },
    customerId: { type: 'string', required: true }
  }
});

// Execute feature
const result = await ductape.processor.feature.run({
  product: integration.tag,
  feature: 'process-payment',
  input: {
    amount: 100.00,
    customerId: 'cus_123456'
  },
  session: {
    tag: 'user-session',
    token: 'session-token'
  }
});
```

## Workbench Implementation Plan

### 1. Add SDK Request Type

```typescript
// src/types/index.ts

export type RequestType = 'http' | 'sdk';

export interface SdkRequestConfig {
  requestType: 'action' | 'feature';
  app_tag?: string;        // For actions
  product_tag?: string;    // For features
  tag: string;             // Action/feature tag
  input: Record<string, any>;
  session?: {
    tag: string;
    token: string;
  };
}

export interface EndpointRequest {
  // ... existing fields
  requestType: RequestType;
  sdkConfig?: SdkRequestConfig;
}
```

### 2. Update Request Panel

Add toggle for HTTP vs SDK request:

```typescript
// src/components/RequestPanel.tsx

const [requestType, setRequestType] = useState<RequestType>('http');

// UI
<Tabs value={requestType} onValueChange={setRequestType}>
  <TabsList>
    <TabsTrigger value="http">HTTP Request</TabsTrigger>
    <TabsTrigger value="sdk">SDK Request</TabsTrigger>
  </TabsList>

  <TabsContent value="http">
    {/* Existing HTTP request UI */}
  </TabsContent>

  <TabsContent value="sdk">
    {/* New SDK request UI */}
    <SdkRequestPanel />
  </TabsContent>
</Tabs>
```

### 3. Create SDK Request Panel Component

```typescript
// src/components/SdkRequestPanel.tsx

export function SdkRequestPanel() {
  return (
    <div className="space-y-4">
      {/* Request Type Selector */}
      <Select value={requestConfig.requestType}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="action">App Action</SelectItem>
          <SelectItem value="feature">Product Feature</SelectItem>
        </SelectContent>
      </Select>

      {/* App/Product Tag Input */}
      {requestConfig.requestType === 'action' ? (
        <Input placeholder="App Tag" value={sdkConfig.app_tag} />
      ) : (
        <Input placeholder="Product Tag" value={sdkConfig.product_tag} />
      )}

      {/* Action/Feature Tag */}
      <Input
        placeholder={`${requestConfig.requestType} tag`}
        value={sdkConfig.tag}
      />

      {/* Input JSON */}
      <label>Input</label>
      <textarea
        placeholder='{\n  "key": "value"\n}'
        value={JSON.stringify(sdkConfig.input, null, 2)}
        className="font-mono"
      />

      {/* Optional Session */}
      <Checkbox>Include Session</Checkbox>
      {includeSession && (
        <>
          <Input placeholder="Session Tag" />
          <Input placeholder="Session Token" />
        </>
      )}
    </div>
  );
}
```

### 4. Enhance Code Generator

Update to generate SDK code:

```typescript
// src/components/CodeGenerator.tsx

const generateTypeScriptCode = () => {
  if (request.requestType === 'http') {
    // Existing HTTP code generation
    return generateHttpCode();
  } else {
    // New SDK code generation
    return generateSdkCode();
  }
};

const generateSdkCode = () => {
  const { sdkConfig } = currentRequest;

  return `
import { Ductape, EnvType } from '@ductape/sdk';

// Initialize Ductape SDK
const ductape = new Ductape({
  workspace_id: process.env.DUCTAPE_WORKSPACE_ID,
  user_id: process.env.DUCTAPE_USER_ID,
  env_type: EnvType.PRODUCTION
});

ductape.setPublicKey(process.env.DUCTAPE_PUBLIC_KEY);
ductape.setToken(process.env.DUCTAPE_AUTH_TOKEN);

async function execute${sdkConfig.requestType}() {
  try {
    ${sdkConfig.requestType === 'action' ? `
    // Initialize app
    await ductape.app.init('${sdkConfig.app_tag}');

    // Execute action
    const result = await ductape.processor.action.run({
      app: '${sdkConfig.app_tag}',
      action: '${sdkConfig.tag}',
      input: ${JSON.stringify(sdkConfig.input, null, 6)}
    });
    ` : `
    // Initialize product
    await ductape.product.init('${sdkConfig.product_tag}');

    // Execute feature
    const result = await ductape.processor.feature.run({
      product: '${sdkConfig.product_tag}',
      feature: '${sdkConfig.tag}',
      input: ${JSON.stringify(sdkConfig.input, null, 6)}${sdkConfig.session ? `,
      session: ${JSON.stringify(sdkConfig.session, null, 6)}` : ''}
    });
    `}

    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Execute
execute${sdkConfig.requestType}();
  `.trim();
};
```

### 5. Add SDK Response Handling

When "Send" is clicked for SDK requests:

```typescript
const handleSdkRequest = async () => {
  // Note: In workbench, we'll simulate the response
  // In production, this would use real SDK

  const mockResponse = {
    success: true,
    data: {
      // Simulated response based on request type
      message: `${sdkConfig.requestType} executed successfully`,
      result: {
        // Mock result data
      }
    },
    metadata: {
      executionTime: 245,
      processId: 'proc_' + Date.now()
    }
  };

  setResponse(currentRequest.id, {
    requestId: currentRequest.id,
    response: {
      status: 200,
      statusText: 'OK',
      data: mockResponse,
      time: 245,
      size: JSON.stringify(mockResponse).length
    },
    timestamp: new Date()
  });
};
```

## Benefits of SDK Integration in Workbench

1. **Test SDK Workflows** - Developers can test app actions and product features
2. **Generate Production Code** - Get ready-to-use SDK code
3. **Validate Inputs** - Test input structures before deployment
4. **Session Testing** - Test session-based features
5. **Multi-language Support** - Generate SDK code in TypeScript, Python, Go, Java
6. **Complete Workflows** - Test entire integration workflows end-to-end

## Next Steps

1. Add SDK request type to types
2. Create SDK request panel component
3. Update request panel with HTTP/SDK toggle
4. Enhance code generator for SDK
5. Add workspace context integration
6. Implement SDK response simulation
7. Add examples/templates for common SDK operations

## Reference Links

- SDK Documentation: [Link to SDK docs]
- Example Apps: See ductape-frontend-app `/src/components/apps/`
- Example Products: See ductape-frontend-app `/src/components/integrations/`

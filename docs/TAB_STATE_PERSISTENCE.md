# Tab State Persistence Guide

This guide explains how to implement tab state persistence in workbench tab components to prevent data loss when users switch tabs or reload the page.

## Overview

The tab state persistence system uses localStorage with LZ-string compression to store tab state efficiently. It handles two types of tabs differently:

1. **Large Resource Tabs** (App, Product): Only stores minimal metadata (_id, name, tag, logo). Full data is refreshed from the API when tab is reopened.
2. **Form/Editor Tabs** (Request Builder, Feature Builder, etc.): Stores complete form state to preserve user input.

## How It Works

- State is automatically saved when:
  - Form data changes (debounced 1 second)
  - User switches to another tab
  - Page is about to unload
  - Component unmounts
- State is deleted when tab is closed
- Old states (>7 days) are automatically cleaned up on app initialization

## Basic Usage

### 1. Import the Hook

```typescript
import { useTabState } from '@/hooks/useTabState';
import { useWorkbenchStore } from '@/stores/workbench-store';
```

### 2. Use in Your Tab Component

```typescript
interface YourTabContentProps {
  // Tab component props
}

export default function YourTabContent(props: YourTabContentProps) {
  const activeTabId = useWorkbenchStore(state => state.activeTabId);
  const tabs = useWorkbenchStore(state => state.tabs);

  // Find current tab
  const currentTab = tabs.find(t => t.id === activeTabId);

  // Your component state
  const [formData, setFormData] = useState({
    field1: '',
    field2: '',
    // ... other form fields
  });

  const [otherState, setOtherState] = useState(/* ... */);

  // Use the tab state hook
  const { loadSavedState, saveState, handleScroll } = useTabState(
    currentTab?.id || '',              // Tab ID
    currentTab?.type || 'your-type',   // Tab type
    currentTab?.title || 'Your Tab',   // Tab title
    { someData: 'value' },             // Main data (lightweight for this tab)
    formData,                          // Form state to persist
    currentTab?.itemId                 // Optional: item ID
  );

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadSavedState();

    if (savedState?.formState) {
      setFormData(savedState.formState);
    }

    // Restore scroll position if needed
    if (savedState?.scrollPosition && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = savedState.scrollPosition;
    }
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll} // Track scroll position
    >
      {/* Your component JSX */}
    </div>
  );
}
```

## Examples

### Example 1: Request Builder (Form with Complex State)

```typescript
export default function RequestBuilder({ itemId }: RequestBuilderProps) {
  const activeTabId = useWorkbenchStore(state => state.activeTabId);
  const tabs = useWorkbenchStore(state => state.tabs);
  const currentTab = tabs.find(t => t.id === activeTabId);

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [params, setParams] = useState<KeyValue[]>([]);
  const [response, setResponse] = useState(null);

  // Combine all form state
  const formState = {
    method,
    url,
    headers,
    body,
    params,
    response,
  };

  const { loadSavedState } = useTabState(
    currentTab?.id || '',
    'request-builder',
    currentTab?.title || 'Request Builder',
    { itemId }, // Lightweight data
    formState,  // Complete form state
    itemId
  );

  // Restore state on mount
  useEffect(() => {
    const savedState = loadSavedState();

    if (savedState?.formState) {
      const saved = savedState.formState;
      setMethod(saved.method || 'GET');
      setUrl(saved.url || '');
      setHeaders(saved.headers || []);
      setBody(saved.body || '');
      setParams(saved.params || []);
      setResponse(saved.response || null);
    }
  }, []);

  // Component JSX...
}
```

### Example 2: App Tab (Large Resource - Minimal Storage)

```typescript
export default function AppTabContent({ appId }: AppTabContentProps) {
  const activeTabId = useWorkbenchStore(state => state.activeTabId);
  const tabs = useWorkbenchStore(state => state.tabs);
  const currentTab = tabs.find(t => t.id === activeTabId);
  const { user } = useAuth();

  // Query for app data
  const { data: app, isLoading, refetch } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => appServices.fetchApp({
      app_id: appId,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!appId && !!user?._id,
  });

  const [activeSection, setActiveSection] = useState('overview');

  // For large resources, only store minimal data + UI state
  const lightweightData = {
    _id: app?._id,
    app_name: app?.app_name,
    tag: app?.tag,
    logo: app?.logo,
  };

  const formState = {
    activeSection,
    // Other UI state that should be preserved
  };

  const { loadSavedState } = useTabState(
    currentTab?.id || '',
    'app',
    currentTab?.title || app?.app_name || 'App',
    lightweightData,  // Minimal data (automatically handled for 'app' type)
    formState,        // UI state
    appId
  );

  // Restore UI state on mount
  useEffect(() => {
    const savedState = loadSavedState();

    if (savedState?.formState) {
      setActiveSection(savedState.formState.activeSection || 'overview');
    }

    // Note: Full app data is fetched fresh via react-query
    // We don't restore it from localStorage
  }, []);

  // Component JSX...
}
```

### Example 3: Product Tab (Large Resource with Form State)

```typescript
export default function ProductTabContent({ productId }: ProductTabContentProps) {
  const activeTabId = useWorkbenchStore(state => state.activeTabId);
  const tabs = useWorkbenchStore(state => state.tabs);
  const currentTab = tabs.find(t => t.id === activeTabId);
  const { user, currentWorkspaceId } = useAuth();

  // Query for product data
  const { data: product, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productServices.fetchProduct({
      product_id: productId,
      user_id: user?._id || '',
      public_key: user?.public_key || '',
      workspace_id: currentWorkspaceId || '',
    }),
    enabled: !!productId && !!user?._id,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const lightweightData = {
    _id: product?._id,
    name: product?.name,
    tag: product?.tag,
    logo: product?.logo,
  };

  const formState = {
    activeTab,
    editingIntegration,
    showCreateModal,
  };

  const { loadSavedState } = useTabState(
    currentTab?.id || '',
    'product',
    currentTab?.title || product?.name || 'Product',
    lightweightData,
    formState,
    productId
  );

  useEffect(() => {
    const savedState = loadSavedState();

    if (savedState?.formState) {
      setActiveTab(savedState.formState.activeTab || 'overview');
      setEditingIntegration(savedState.formState.editingIntegration || null);
      setShowCreateModal(savedState.formState.showCreateModal || false);
    }
  }, []);

  // Component JSX...
}
```

## Best Practices

1. **Keep Data Lightweight**: For 'app' and 'product' tabs, only store minimal data. Full data should be fetched from API.

2. **Combine Form State**: Create a single formState object containing all form fields to make restoration easier.

3. **Restore on Mount**: Use `useEffect` with empty dependency array to restore state when component mounts.

4. **Don't Store Sensitive Data**: The storage is compressed but not encrypted. Don't store passwords or tokens.

5. **Handle Loading States**: When restoring state, account for the fact that API data may not be loaded yet.

6. **Track Scroll Position**: Use the `handleScroll` callback on scrollable containers to preserve scroll position.

7. **Manual Save on Submit**: Call `saveState()` manually before critical operations like form submission.

## Storage Limits

- LocalStorage limit: ~5-10MB depending on browser
- LZ-string compression reduces storage by ~60-80%
- Large resources (app/product) store only ~100-200 bytes
- Form states typically store 1-5KB
- Old states (>7 days) are automatically cleaned up

## Debugging

Check stored tab states in browser console:

```javascript
// Get all tab metadata
import { getTabMetadataIndex, getTabStorageStats } from '@/lib/tab-state-manager';

console.log(getTabMetadataIndex());
console.log(getTabStorageStats());
```

## Migration Guide

For existing tab components without state persistence:

1. Add `useTabState` hook
2. Identify what state should be persisted (form fields, UI state, etc.)
3. Separate large API data from UI state
4. Add restoration logic in useEffect
5. Test by switching tabs and reloading page

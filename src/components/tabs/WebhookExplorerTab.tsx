import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Zap,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Globe,
  Code,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  BarChart3,
  Send,
  RefreshCw,
  Search,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  Package,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { cn, getLast7DaysNormalized } from '@/lib/utils';
import { IWebhook, IWebhookEvent } from '@/types/webhook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import DetailsSidebar from '@/components/DetailsSidebar';
import CodeSidebar from '@/components/CodeSidebar';
import { fetchLogs } from '@/services/logsServices';
import appServices from '@/services/appServices';
import { saveTabState, getTabState } from '@/lib/tab-state-manager';

interface WebhookExplorerTabProps {
  tabId: string;
  webhook: IWebhook & {
    appTag?: string;
    appName?: string;
    appLogo?: string;
    productTag?: string;
    productName?: string;
    productId?: string;
    app?: {
      _id?: string;
      tag?: string;
      app_name?: string;
      logo?: string;
    };
  };
}

type ViewMode = 'overview' | 'environments' | 'events';

interface WebhookExplorerPersistedState {
  viewMode: ViewMode;
  searchQuery: string;
  selectedEventId: string | null;
}

// Component to fetch and display webhook metrics for a specific environment
function WebhookEnvMetrics({
  webhookTag,
  appTag,
  env,
  productTag,
}: {
  webhookTag: string;
  appTag: string;
  env: string;
  productTag?: string;
}) {
  const { user, currentWorkspaceId } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['webhook-env-metrics', webhookTag, appTag, env],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }

      // Fetch webhook logs for this environment
      const response = await fetchLogs(
        {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          public_key: user.public_key,
        },
        {
          type: 'webhook',
          parent_tag: webhookTag,
          app_env: env,
          groupBy: 'week',
          limit: 100,
        }
      );

      // Calculate metrics from logs
      const logs = response.data?.logs?.data || [];
      const successCount = logs.filter((l: any) => l.status === 'success').length;
      const failedCount = logs.filter((l: any) => l.status === 'fail').length;
      const totalCount = logs.length;

      return {
        totalRequests: totalCount,
        successfulRequests: successCount,
        failedRequests: failedCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      };
    },
    enabled: !!webhookTag && !!env && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-grey-50 rounded-lg border border-grey-200">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <p className="text-xs text-grey-600 mb-1">{['Total', 'Success', 'Failed', 'Rate'][i]}</p>
            <p className="text-lg font-semibold text-grey-400">...</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-grey-50 rounded-lg border">
      <div>
        <p className="text-xs text-grey-600 mb-1">Total Requests</p>
        <p className="text-lg font-semibold text-grey">{metricsData?.totalRequests || 0}</p>
      </div>
      <div>
        <p className="text-xs text-grey-600 mb-1">Successful</p>
        <p className="text-lg font-semibold text-green">{metricsData?.successfulRequests || 0}</p>
      </div>
      <div>
        <p className="text-xs text-grey-600 mb-1">Failed</p>
        <p className="text-lg font-semibold text-red">{metricsData?.failedRequests || 0}</p>
      </div>
      <div>
        <p className="text-xs text-grey-600 mb-1">Success Rate</p>
        <p
          className={cn(
            'text-lg font-semibold',
            (metricsData?.successRate || 0) >= 90
              ? 'text-green'
              : (metricsData?.successRate || 0) >= 70
              ? 'text-orange-500'
              : 'text-red'
          )}
        >
          {metricsData?.successRate || 0}%
        </p>
      </div>
    </div>
  );
}

// Global metrics component for overview
function WebhookGlobalMetrics({
  webhookTag,
  appTag,
}: {
  webhookTag: string;
  appTag: string;
}) {
  const { user, currentWorkspaceId } = useAuth();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['webhook-global-metrics', webhookTag, appTag],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?._id || !user?.public_key) {
        throw new Error('Missing auth parameters');
      }

      // Fetch all webhook logs for this webhook
      const response = await fetchLogs(
        {
          workspace_id: currentWorkspaceId,
          user_id: user._id,
          public_key: user.public_key,
        },
        {
          type: 'webhook',
          parent_tag: webhookTag,
          groupBy: 'week',
          limit: 500,
        }
      );

      // Calculate metrics from logs
      const logs = response.data?.logs?.data || [];
      const successCount = logs.filter((l: any) => l.status === 'success').length;
      const failedCount = logs.filter((l: any) => l.status === 'fail').length;
      const totalCount = logs.length;

      // Calculate daily activity for last 7 days
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyActivity: Array<{ day: string; requests: number; successful: number; failed: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStr = days[date.getDay()];
        const dayLogs = logs.filter((l: any) => {
          const logDate = new Date(l.timestamp || l.created_at);
          return (
            logDate.getDate() === date.getDate() &&
            logDate.getMonth() === date.getMonth() &&
            logDate.getFullYear() === date.getFullYear()
          );
        });
        dailyActivity.push({
          day: dayStr,
          requests: dayLogs.length,
          successful: dayLogs.filter((l: any) => l.status === 'success').length,
          failed: dayLogs.filter((l: any) => l.status === 'fail').length,
        });
      }

      return {
        totalRequests: totalCount,
        successfulRequests: successCount,
        failedRequests: failedCount,
        successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
        dailyActivity,
      };
    },
    enabled: !!webhookTag && !!currentWorkspaceId && !!user?._id && !!user?.public_key,
  });

  return { metricsData, isLoading };
}

export default function WebhookExplorerTab({ tabId, webhook }: WebhookExplorerTabProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const hasRestoredStateRef = useRef(false);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New event form state
  const [eventName, setEventName] = useState('');
  const [eventTag, setEventTag] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSelector, setEventSelector] = useState('');
  const [eventSample, setEventSample] = useState('{}');

  // Guard: Check for incomplete webhook data
  if (!webhook?.name || !webhook?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Webhook className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete webhook data</p>
          <p className="text-sm text-grey-500">
            Please close this tab and reopen the webhook from the app.
          </p>
        </div>
      </div>
    );
  }

  // Extract app/product info
  const app = webhook?.app;
  const appName = webhook?.appName || app?.app_name;
  const appTag = webhook?.appTag || app?.tag || '';
  const appLogo = webhook?.appLogo || app?.logo;
  const productTag = webhook?.productTag;
  const productName = webhook?.productName;
  const productId = webhook?.productId;

  // Fetch app data to get environments from the app version
  const { data: appData, isLoading: isLoadingApp } = useQuery({
    queryKey: ['app', app?._id || appTag],
    queryFn: () => appServices.fetchApp({
      app_id: app?._id || '',
      user_id: user?._id || '',
      public_key: user?.public_key || '',
    }),
    enabled: !!(app?._id || appTag) && !!user?._id && !!user?.public_key,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get the current app and its version
  const currentApp = appData?.data || app;
  const versions = (currentApp && 'versions' in currentApp) ? (currentApp as any).versions : null;
  const selectedVersion = versions?.find((v: any) => v.latest) ||
    (versions && versions.length > 0 ? versions[0] : null);

  // Get environments from the app version (not from webhook)
  const appEnvironments = selectedVersion?.envs || [];

  // Restore state from tab state manager on mount
  useEffect(() => {
    if (hasRestoredStateRef.current) return;

    const savedState = getTabState(tabId);
    if (savedState?.data) {
      const persistedState = savedState.data as WebhookExplorerPersistedState;

      if (persistedState.viewMode) {
        setViewMode(persistedState.viewMode);
      }

      if (persistedState.searchQuery) {
        setSearchQuery(persistedState.searchQuery);
      }

      if (persistedState.selectedEventId) {
        setSelectedEventId(persistedState.selectedEventId);
      }
    }

    hasRestoredStateRef.current = true;
  }, [tabId]);

  // Save state to tab state manager when data changes
  useEffect(() => {
    if (!hasRestoredStateRef.current) return;

    const persistedState: WebhookExplorerPersistedState = {
      viewMode,
      searchQuery,
      selectedEventId,
    };

    saveTabState(
      tabId,
      'webhook-explorer',
      `${webhook.name}`,
      persistedState,
      undefined,
      `${webhook.tag}`
    );
  }, [tabId, webhook.name, webhook.tag, viewMode, searchQuery, selectedEventId]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  });

  // Auto-generate tag and description from name
  const handleEventNameChange = (value: string) => {
    setEventName(value);
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    setEventTag(sanitized);
    setEventDescription(value);
  };

  // Reset form
  const resetForm = () => {
    setEventName('');
    setEventTag('');
    setEventDescription('');
    setEventSelector('');
    setEventSample('{}');
  };

  // Parse sample payload and extract selector options
  const sampleValidation = useMemo(() => {
    if (!eventSample || eventSample.trim() === '' || eventSample.trim() === '{}') {
      return { isValid: true, error: null, selectorOptions: [] as string[] };
    }

    try {
      const sample = JSON.parse(eventSample);
      const options: string[] = [];

      const traverse = (obj: any, path: string = '', parentIsArray: boolean = false) => {
        if (typeof obj !== 'object' || obj === null) return;
        if (parentIsArray) return;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const isArray = Array.isArray(value);
          const isObject = typeof value === 'object' && value !== null && !isArray;

          if (!isObject && !isArray) {
            options.push(currentPath);
          }

          if (isObject && !isArray) {
            traverse(value, currentPath, false);
          }
        }
      };

      traverse(sample);
      return { isValid: true, error: null, selectorOptions: options };
    } catch (error: any) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
        selectorOptions: [] as string[],
      };
    }
  }, [eventSample]);

  // Create event mutation
  const { mutateAsync: createEvent, isPending: isCreatingEvent } = useMutation({
    mutationFn: async (payload: any) => {
      if (!ductape) throw new Error('Ductape not initialized');

      let parsedSample;
      try {
        parsedSample = JSON.parse(payload.sample);
      } catch (e) {
        throw new Error('Invalid JSON in sample payload');
      }

      const formattedSelector = payload.selector
        ? `$Event{${payload.selector.split('.').join('}{')}}}`
        : '';

      const appTagValue = typeof appTag === 'string' ? appTag : '';
      if (!appTagValue) throw new Error('App tag not found');

      await (ductape as any).app.init(appTagValue);

      const eventData = await (ductape as any).webhooks.events.create({
        name: payload.name,
        tag: `${webhook.tag}:${payload.tag}`,
        description: payload.description,
        selector: formattedSelector,
        sample: parsedSample,
      });

      return eventData;
    },
    onSuccess: () => {
      const appId = app?._id;
      if (appId) {
        queryClient.invalidateQueries({ queryKey: ['app', appId] });
      }
      if (appTag) {
        queryClient.invalidateQueries({ queryKey: ['app', appTag] });
      }
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Event created successfully!');
      setShowNewEventDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event');
    },
  });

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !eventTag.trim() || !eventSelector.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    await createEvent({
      name: eventName,
      tag: eventTag,
      description: eventDescription,
      selector: eventSelector,
      sample: eventSample,
    });
  };

  // Use events from webhook prop
  const events: IWebhookEvent[] = (webhook as any)?.events || [];

  // Find selected event
  const selectedEvent = events?.find((event) => event._id === selectedEventId);

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.tag.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  // Count events with single vs multi selectors
  const selectorStats = useMemo(() => {
    let singleSelector = 0;
    let multiSelector = 0;
    events.forEach((event) => {
      const selectorStr = (event as any).selector || '';
      const selectors = selectorStr
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (selectors.length > 1) {
        multiSelector++;
      } else if (selectors.length === 1) {
        singleSelector++;
      }
    });
    return { singleSelector, multiSelector };
  }, [events]);

  // Format selector for display
  const formatSelector = (sel: string) => {
    const matches = sel.match(/\{([^}]+)\}/g);
    if (!matches) return sel;
    return matches.map((m) => m.slice(1, -1)).join('.');
  };

  // Get global metrics
  const { metricsData: globalMetrics, isLoading: isLoadingMetrics } = WebhookGlobalMetrics({
    webhookTag: webhook.tag,
    appTag,
  });

  // View webhook activity/logs
  const handleViewActivity = () => {
    openTab({
      id: `logs-webhook-${webhook.tag}-${Date.now()}`,
      type: 'logs',
      title: `${webhook.name} - Logs`,
      itemId: webhook.tag,
      data: {
        type: 'webhook',
        parent_tag: webhook.tag,
        app_tag: appTag,
      },
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['webhook-global-metrics', webhook.tag] });
    await queryClient.invalidateQueries({ queryKey: ['webhook-env-metrics', webhook.tag] });
    toast.success('Metrics refreshed');
    setIsRefreshing(false);
  };

  // Generate SDK code examples
  const generateCodeSections = (language: string, env: string = 'production') => {
    const sections: Array<{ title: string; code: string }> = [];

    if (language === 'typescript') {
      sections.push({
        title: 'Initialize SDK',
        code: `import { Ductape } from '@ductape/sdk';

const ductape = new Ductape({
  workspace_id: 'your_workspace_id',
  user_id: 'your_user_id',
  token: 'your_auth_token',
  public_key: 'your_public_key'
});

// Initialize app
await ductape.app.init('${appTag}');`,
      });

      sections.push({
        title: 'Register Webhook Endpoint',
        code: `// Register your endpoint to receive webhook events
const registration = await ductape.webhooks.register({
  tag: '${webhook.tag}',
  env: '${env}',
  url: 'https://your-api.com/webhooks/receive',
  method: 'POST'
});

console.log('Webhook registered:', registration);`,
      });

      sections.push({
        title: 'Handle Incoming Webhooks',
        code: `// Example Express.js handler for incoming webhooks
app.post('/webhooks/receive', async (req, res) => {
  const payload = req.body;
  const eventType = payload.event; // Use your selector field

  switch(eventType) {
${events
  .slice(0, 3)
  .map((e) => `    case '${e.tag}':\n      // Handle ${e.name}\n      break;`)
  .join('\n')}
    default:
      console.log('Unknown event:', eventType);
  }

  res.status(200).json({ received: true });
});`,
      });
    } else if (language === 'javascript') {
      sections.push({
        title: 'Initialize SDK',
        code: `const { Ductape } = require('@ductape/sdk');

const ductape = new Ductape({
  workspace_id: 'your_workspace_id',
  user_id: 'your_user_id',
  token: 'your_auth_token',
  public_key: 'your_public_key'
});

// Initialize app
await ductape.app.init('${appTag}');`,
      });

      sections.push({
        title: 'Register Webhook Endpoint',
        code: `// Register your endpoint to receive webhook events
const registration = await ductape.webhooks.register({
  tag: '${webhook.tag}',
  env: '${env}',
  url: 'https://your-api.com/webhooks/receive',
  method: 'POST'
});

console.log('Webhook registered:', registration);`,
      });
    } else if (language === 'python') {
      sections.push({
        title: 'Initialize SDK',
        code: `from ductape import Ductape

ductape = Ductape(
    workspace_id='your_workspace_id',
    user_id='your_user_id',
    token='your_auth_token',
    public_key='your_public_key'
)

# Initialize app
ductape.app.init('${appTag}')`,
      });

      sections.push({
        title: 'Register Webhook Endpoint',
        code: `# Register your endpoint to receive webhook events
registration = ductape.webhooks.register({
    'tag': '${webhook.tag}',
    'env': '${env}',
    'url': 'https://your-api.com/webhooks/receive',
    'method': 'POST'
})

print('Webhook registered:', registration)`,
      });
    }

    return sections;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background-tertiary">
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-grey-400 flex flex-col flex-shrink-0 transition-all duration-300',
          isSidebarCollapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="h-5 w-5 text-blue flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-grey text-sm truncate">{webhook.name}</h2>
                <p className="text-xs text-grey-600 truncate font-mono">{webhook.tag}</p>
              </div>
            )}
          </div>

          {/* Search - only show when expanded */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* App Context */}
          {appName && (
            <div className="mb-4">
              <button
                onClick={() => {
                  if (app?._id) {
                    openTab({
                      id: `app-${app._id}`,
                      type: 'app',
                      title: appName || 'App',
                      itemId: app._id,
                      data: {
                        _id: app._id,
                        app_name: appName,
                        tag: appTag,
                      },
                    });
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg bg-blue/5 border border-blue/20 hover:bg-blue/10 transition-colors group',
                  isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
                )}
                title={isSidebarCollapsed ? appName : undefined}
              >
                <div className="w-7 h-7 rounded-md bg-blue/10 flex items-center justify-center flex-shrink-0">
                  {appLogo ? (
                    <img src={appLogo} alt={appName} className="w-full h-full rounded-md object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-blue" />
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-grey-500">App</p>
                      <p className="text-sm font-medium text-grey truncate">{appName}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-grey-400 group-hover:text-blue transition-colors" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Overview Link */}
          <div className="mb-2">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'w-full flex items-center gap-2 rounded-md text-sm transition-colors',
                isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2',
                viewMode === 'overview'
                  ? 'bg-blue/10 text-blue'
                  : 'text-grey hover:bg-background-secondary'
              )}
              title={isSidebarCollapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'overview' ? 'text-blue' : 'text-grey-600'
                )}
              />
              {!isSidebarCollapsed && <span className="flex-1 text-left font-medium">Overview</span>}
            </button>
          </div>

          {/* Environments Link */}
          <div className="mb-2">
            <button
              onClick={() => setViewMode('environments')}
              className={cn(
                'w-full flex items-center gap-2 rounded-md text-sm transition-colors',
                isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2',
                viewMode === 'environments'
                  ? 'bg-blue/10 text-blue'
                  : 'text-grey hover:bg-background-secondary'
              )}
              title={isSidebarCollapsed ? 'Environments' : undefined}
            >
              <Globe
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'environments' ? 'text-blue' : 'text-grey-600'
                )}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">Environments</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      viewMode === 'environments'
                        ? 'bg-blue/20 text-blue'
                        : 'bg-background-secondary text-grey-600'
                    )}
                  >
                    {appEnvironments?.length || 0}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Events Link */}
          <div className="mb-4">
            <button
              onClick={() => setViewMode('events')}
              className={cn(
                'w-full flex items-center gap-2 rounded-md text-sm transition-colors',
                isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2',
                viewMode === 'events'
                  ? 'bg-blue/10 text-blue'
                  : 'text-grey hover:bg-background-secondary'
              )}
              title={isSidebarCollapsed ? 'Events' : undefined}
            >
              <Zap
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  viewMode === 'events' ? 'text-blue' : 'text-grey-600'
                )}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">Events</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      viewMode === 'events'
                        ? 'bg-blue/20 text-blue'
                        : 'bg-background-secondary text-grey-600'
                    )}
                  >
                    {events.length}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Status */}
          {!isSidebarCollapsed && (
            <div className="mt-4 px-2">
              <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2">
                Status
              </div>
              <div
                className={cn(
                  'h-9 px-3 flex items-center gap-2 rounded-md border text-sm font-medium',
                  webhook.active
                    ? 'bg-green/10 text-green border-green/20'
                    : 'bg-grey-100 text-grey-600 border-grey-200'
                )}
              >
                <div
                  className={cn('w-2 h-2 rounded-full', webhook.active ? 'bg-green' : 'bg-grey-400')}
                />
                {webhook.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <div className="flex-shrink-0 p-2 border-t border-grey-400">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-grey-600 hover:bg-background-secondary hover:text-blue transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-white">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center">
                  <Webhook className="h-6 w-6 text-blue" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-grey">{webhook.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-grey-600 font-mono">{webhook.tag}</code>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        webhook.active ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey-600'
                      )}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-border text-grey-600 hover:text-grey hover:bg-background-secondary"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowCodeSidebar(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled
                >
                  <Code className="h-4 w-4" />
                  View Code
                </Button>
                <Button onClick={handleViewActivity} variant="outline" size="sm" className="gap-2" disabled>
                  <Activity className="h-4 w-4" />
                  View Logs
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'overview' ? (
          <div className="flex-1 overflow-auto p-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Requests */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue" />
                  </div>
                  {globalMetrics && globalMetrics.totalRequests > 0 && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-green">
                      <TrendingUp className="h-3 w-3" />
                      Active
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-grey mb-1">
                  {isLoadingMetrics ? '...' : globalMetrics?.totalRequests || 0}
                </div>
                <div className="text-xs text-grey-600 font-medium">Total Requests (7 days)</div>
              </div>

              {/* Success Rate */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green" />
                  </div>
                </div>
                <div
                  className={cn(
                    'text-2xl font-bold mb-1',
                    (globalMetrics?.successRate || 0) >= 90
                      ? 'text-green'
                      : (globalMetrics?.successRate || 0) >= 70
                      ? 'text-orange-500'
                      : 'text-red'
                  )}
                >
                  {isLoadingMetrics ? '...' : `${globalMetrics?.successRate || 0}%`}
                </div>
                <div className="text-xs text-grey-600 font-medium">Success Rate</div>
              </div>

              {/* Events */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{events.length}</div>
                <div className="text-xs text-grey-600 font-medium">Total Events</div>
              </div>

              {/* Environments */}
              <div className="bg-white rounded-lg border border-grey-300 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-grey mb-1">{appEnvironments?.length || 0}</div>
                <div className="text-xs text-grey-600 font-medium">Environments</div>
              </div>
            </div>

            {/* Activity Timeline (7 Days) - last 7 days with 0 for no activity */}
            <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-grey">Activity Timeline (7 Days)</h2>
                {isLoadingMetrics && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
              </div>
              {isLoadingMetrics ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-4 bg-grey-200 rounded animate-pulse" />
                      <div className="flex-1 h-8 bg-grey-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const normalized = getLast7DaysNormalized(globalMetrics?.dailyActivity ?? [], (d: any) => d.requests ?? 0);
                    const maxActivity = Math.max(...normalized.map((d) => d.value), 1);
                    return normalized.map((day) => {
                      const percentage = maxActivity > 0 ? (day.value / maxActivity) * 100 : 0;
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <div className="w-12 text-xs font-medium text-grey-600">{day.date}</div>
                          <div className="flex-1 h-8 bg-grey-100 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="absolute inset-0 flex items-center px-3">
                              <span className="text-xs font-semibold text-white drop-shadow-sm">
                                {day.value.toLocaleString()} requests
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Environment Endpoints with Metrics */}
            {appEnvironments && appEnvironments.length > 0 && (
              <div className="space-y-4 mb-6">
                <h2 className="text-lg font-semibold text-grey">Environment Endpoints</h2>
                {appEnvironments.map((env, index) => {
                  const webhookUrl =
                    (env as any).registration_url ||
                    (env as any).webhook_url ||
                    `https://api.ductape.app/webhooks/${appTag}/${webhook.tag}/${env.slug}`;

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-primary" />
                          <h3 className="text-base font-semibold text-grey">
                            {env.slug.toUpperCase()}
                          </h3>
                          <span className="px-2 py-0.5 bg-green/10 text-green rounded text-xs font-medium">
                            {env.method || 'POST'}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleCopy(webhookUrl, 'URL')}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {copiedText === webhookUrl ? (
                            <Check className="h-3 w-3 text-green" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Copy URL
                        </Button>
                      </div>

                      <code className="block text-xs text-grey font-mono break-all bg-grey-50 px-3 py-2 rounded border border-grey-200 mb-4">
                        {webhookUrl}
                      </code>

                      {/* Environment Metrics */}
                      <WebhookEnvMetrics
                        webhookTag={webhook.tag}
                        appTag={appTag}
                        env={env.slug}
                        productTag={productTag}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selector Stats */}
            <div className="bg-white rounded-lg border border-grey-300 p-6 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-blue" />
                <h2 className="text-lg font-semibold text-grey">Event Selectors</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-grey-50 rounded-lg">
                  <span className="text-sm text-grey-700 font-medium">Single Selector</span>
                  <span className="text-lg font-bold text-grey">{selectorStats.singleSelector}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-grey-50 rounded-lg">
                  <span className="text-sm text-grey-700 font-medium">Multi Selector</span>
                  <span className="text-lg font-bold text-grey">{selectorStats.multiSelector}</span>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-lg border border-border shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-grey">Events</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('events')}
                  className="text-blue hover:text-blue/80 text-xs"
                >
                  View All Events
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {events.length === 0 ? (
                  <div className="px-5 py-8 text-center text-grey-500 text-sm">No events found</div>
                ) : (
                  events.slice(0, 5).map((event) => {
                    const selectorStr = (event as any).selector || '';
                    const selectors = selectorStr
                      .split(',')
                      .map((s: string) => s.trim())
                      .filter(Boolean);
                    const isMultiSelector = selectors.length > 1;

                    return (
                      <div
                        key={event._id}
                        onClick={() => {
                          setSelectedEventId(event._id);
                          setViewMode('events');
                        }}
                        className="px-5 py-3 flex items-center justify-between hover:bg-background-secondary transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                            <Zap className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-grey">{event.name}</p>
                            <p className="text-xs text-grey-500 font-mono">
                              {webhook.tag}:{event.tag}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isMultiSelector && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue/10 text-blue">
                              {selectors.length} selectors
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-grey-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'environments' ? (
          /* Environments View */
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Environments Header */}
              <div className="bg-white rounded-lg border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h1 className="text-xl font-bold text-grey">Environments</h1>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                      >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                      </Button>
                    </div>
                    <p className="text-sm text-grey-600">
                      {appEnvironments?.length || 0} {(appEnvironments?.length || 0) === 1 ? 'environment' : 'environments'} configured for this webhook
                    </p>
                  </div>
                </div>
              </div>

              {/* Environment List */}
              {!appEnvironments || appEnvironments.length === 0 ? (
                <div className="bg-white rounded-lg border border-border p-8">
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-grey-100 mb-4">
                      <Globe className="h-8 w-8 text-grey-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-grey mb-2">No environments configured</h3>
                    <p className="text-sm text-grey-500 text-center max-w-sm">
                      Environments define where webhook events are sent. Configure environments in the app settings.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-grey">Environment Endpoints</h2>
                  {appEnvironments.map((env: any, index: number) => {
                    // Check if this environment has a registered webhook (from config)
                    const envConfig = (webhook as any).config?.find(
                      (c: any) => c.appEnv === env.slug || c.productEnv === env.slug
                    );
                    const isRegistered = !!envConfig;
                    const registeredUrl = envConfig?.url;

                    // Generate webhook URL
                    const webhookUrl =
                      registeredUrl ||
                      (env as any).registration_url ||
                      (env as any).webhook_url ||
                      `https://api.ductape.app/webhooks/${appTag}/${webhook.tag}/${env.slug}`;

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg border border-border p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                env.slug === 'production' || env.slug === 'prd'
                                  ? 'bg-red/10'
                                  : env.slug === 'staging' || env.slug === 'stg'
                                  ? 'bg-orange-500/10'
                                  : 'bg-blue/10'
                              )}
                            >
                              <Globe
                                className={cn(
                                  'h-5 w-5',
                                  env.slug === 'production' || env.slug === 'prd'
                                    ? 'text-red'
                                    : env.slug === 'staging' || env.slug === 'stg'
                                    ? 'text-orange-500'
                                    : 'text-blue'
                                )}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-grey">
                                  {env.slug}
                                </h3>
                                {/* Registration Status - only show when product context exists */}
                                {productTag && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1',
                                      isRegistered
                                        ? 'bg-green/10 text-green'
                                        : 'bg-grey-100 text-grey-500'
                                    )}
                                  >
                                    {isRegistered ? (
                                      <>
                                        <CheckCircle className="h-3 w-3" />
                                        Registered
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="h-3 w-3" />
                                        Not Registered
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                              {env.description && (
                                <p className="text-xs text-grey-500 mt-0.5">{env.description}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCopy(webhookUrl, 'URL')}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {copiedText === webhookUrl ? (
                              <Check className="h-3 w-3 text-green" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy URL
                          </Button>
                        </div>

                        {/* Webhook URL */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-grey-600">Webhook Endpoint</Label>
                            {env.base_url && (
                              <span className="text-xs text-grey-400">Base: {env.base_url}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 bg-background-secondary border border-border rounded-lg px-3 py-2">
                            <span className="px-2 py-0.5 bg-green/10 text-green rounded text-xs font-medium">
                              POST
                            </span>
                            <code className="flex-1 text-xs text-grey font-mono break-all">
                              {webhookUrl}
                            </code>
                          </div>
                        </div>

                        {/* Registration Details - only show when registered */}
                        {productTag && isRegistered && envConfig && (
                          <div className="mb-4 p-3 bg-green/5 border border-green/10 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green" />
                              <span className="text-sm font-medium text-green">Webhook Registered</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-grey-500">Callback URL:</span>
                                <p className="font-mono text-grey truncate">{envConfig.url || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-grey-500">Method:</span>
                                <p className="font-mono text-grey">{envConfig.method || 'POST'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Not Registered Notice - only show when product context exists and not registered */}
                        {productTag && !isRegistered && (
                          <div className="mb-4 p-3 bg-background-secondary border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-4 w-4 text-grey-400" />
                              <span className="text-sm font-medium text-grey-600">Not Registered</span>
                            </div>
                            <p className="text-xs text-grey-500">
                              Register this webhook to receive events in this environment. Use the SDK to register your callback URL.
                            </p>
                          </div>
                        )}

                        {/* Environment Metrics */}
                        <WebhookEnvMetrics
                          webhookTag={webhook.tag}
                          appTag={appTag}
                          env={env.slug}
                          productTag={productTag}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Events View */
          <div className="flex-1 overflow-auto p-6">
            {/* Events Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-grey">
                Webhook Events ({filteredEvents.length})
              </h2>
              <Button onClick={() => setShowNewEventDialog(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-grey-300">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-primary/10">
                    <Zap className="h-10 w-10 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                  <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
                </div>
                <h3 className="text-lg font-semibold text-grey mb-2">
                  {searchQuery ? 'No events match your search' : 'No events yet'}
                </h3>
                <p className="text-sm text-grey-500 text-center max-w-sm mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Events define how incoming webhook payloads are identified and routed.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowNewEventDialog(true)} className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    Create your first event
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((event) => {
                  const selectorStr = (event as any).selector || '';
                  const selectors = selectorStr
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  const isMultiSelector = selectors.length > 1;
                  const selectorValue = (event as any).selectorValue;

                  return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedEventId(event._id)}
                      className={cn(
                        'bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
                        selectedEventId === event._id
                          ? 'border-primary shadow-sm'
                          : 'border-grey-300 hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-grey truncate">{event.name}</h3>
                          <p className="text-xs text-grey-500 font-mono truncate">
                            {webhook.tag}:{event.tag}
                          </p>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs text-grey-600 mb-3 line-clamp-2">{event.description}</p>
                      )}

                      {selectorStr && (
                        <div className="flex flex-wrap gap-1">
                          {selectors.slice(0, 2).map((sel: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-grey-100 text-grey-600 font-mono"
                            >
                              {formatSelector(sel)}
                              {!isMultiSelector &&
                                selectorValue &&
                                typeof selectorValue !== 'object' && (
                                  <span className="text-green ml-1">= {String(selectorValue)}</span>
                                )}
                            </span>
                          ))}
                          {selectors.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-grey-100 text-grey-600">
                              +{selectors.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {isMultiSelector && (
                        <div className="mt-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue/10 text-blue">
                            {selectors.length} selectors
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Details Sidebar */}
      {selectedEvent && (
        <DetailsSidebar
          title="Event Details"
          subtitle={selectedEvent.name}
          icon={<Zap className="h-5 w-5 text-primary" />}
          onClose={() => setSelectedEventId(null)}
        >
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-semibold text-grey mb-2 block">Event Name</Label>
              <p className="text-sm text-grey">{selectedEvent.name}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-grey">Event Tag</Label>
                <Button
                  onClick={() => handleCopy(`${webhook.tag}:${selectedEvent.tag}`, 'Event tag')}
                  variant="outline"
                  size="sm"
                  className="gap-2 h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Input
                value={`${webhook.tag}:${selectedEvent.tag}`}
                readOnly
                className="font-mono text-sm bg-grey-50"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-grey mb-2 block">Description</Label>
              <p className="text-sm text-grey">{selectedEvent.description || 'No description'}</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-grey mb-2 block">Event Selector</Label>
              <Input
                value={`${selectedEvent.selector}${
                  selectedEvent.selectorValue
                    ? ` = ${
                        typeof selectedEvent.selectorValue === 'object'
                          ? JSON.stringify(selectedEvent.selectorValue)
                          : selectedEvent.selectorValue
                      }`
                    : ''
                }`}
                readOnly
                className="font-mono text-sm bg-grey-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-grey">Sample Payload</Label>
                <Button
                  onClick={() =>
                    handleCopy(
                      typeof selectedEvent.sample === 'string'
                        ? selectedEvent.sample
                        : JSON.stringify(selectedEvent.sample, null, 2),
                      'Sample payload'
                    )
                  }
                  variant="outline"
                  size="sm"
                  className="gap-2 h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={
                  typeof selectedEvent.sample === 'string'
                    ? selectedEvent.sample
                    : JSON.stringify(selectedEvent.sample, null, 2)
                }
                readOnly
                className="font-mono text-sm bg-grey-50 resize-none"
                rows={Math.min(
                  10,
                  (typeof selectedEvent.sample === 'string'
                    ? selectedEvent.sample
                    : JSON.stringify(selectedEvent.sample, null, 2)
                  ).split('\n').length
                )}
              />
            </div>
          </div>
        </DetailsSidebar>
      )}

      {/* Code Sidebar */}
      {showCodeSidebar && (
        <CodeSidebar
          title={webhook.name}
          subtitle={`Integrate the ${webhook.tag} webhook`}
          tag={webhook.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={appEnvironments?.map((e) => ({ slug: e.slug })) || []}
        />
      )}

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new event to the {webhook.name} channel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="event-name" className="required">
                Event Name
              </Label>
              <Input
                id="event-name"
                placeholder="e.g., New Transaction"
                value={eventName}
                onChange={(e) => handleEventNameChange(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="event-tag" className="required">
                Event Tag
              </Label>
              <Input
                id="event-tag"
                placeholder="e.g., new_transaction"
                value={eventTag}
                onChange={(e) =>
                  setEventTag(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, '_')
                      .replace(/_+/g, '_')
                  )
                }
                className="mt-2 font-mono"
              />
              <p className="text-xs text-grey-600 mt-1">
                Combined tag:{' '}
                <code className="text-primary">{webhook.tag}:{eventTag || 'event_tag'}</code>
              </p>
            </div>

            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Describe when this event is triggered..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="mt-2"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="event-sample" className="required">
                  Sample Payload (JSON)
                </Label>
                {eventSample && eventSample.trim() !== '{}' && eventSample.trim() !== '' && (
                  <div className="flex items-center gap-1.5">
                    {sampleValidation.isValid ? (
                      <>
                        <Check className="h-4 w-4 text-green" />
                        <span className="text-xs text-green font-medium">Valid</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red" />
                        <span className="text-xs text-red font-medium">Invalid</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Textarea
                id="event-sample"
                placeholder='{"event": "new-transaction", "transaction_id": "123"}'
                value={eventSample}
                onChange={(e) => setEventSample(e.target.value)}
                className={cn(
                  'mt-2 font-mono text-xs min-h-[150px]',
                  eventSample && eventSample.trim() !== '{}' && eventSample.trim() !== ''
                    ? sampleValidation.isValid
                      ? 'border-green focus:border-green'
                      : 'border-red focus:border-red'
                    : ''
                )}
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="event-selector" className="required">
                Event Selector
              </Label>
              <Select value={eventSelector} onValueChange={setEventSelector}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a field from sample payload" />
                </SelectTrigger>
                <SelectContent>
                  {!sampleValidation.isValid ? (
                    <div className="px-2 py-1.5 text-sm text-grey-600">Invalid JSON</div>
                  ) : sampleValidation.selectorOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-grey-600">No fields available</div>
                  ) : (
                    sampleValidation.selectorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {eventSelector && (
                <p className="text-xs text-grey-600 mt-1">
                  Selector:{' '}
                  <code className="text-primary">{`$Event{${eventSelector.split('.').join('}{')}\}`}</code>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewEventDialog(false);
                resetForm();
              }}
              disabled={isCreatingEvent}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={isCreatingEvent} className="gap-2">
              {isCreatingEvent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

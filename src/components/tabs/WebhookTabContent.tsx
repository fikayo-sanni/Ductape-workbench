import { useState, useMemo } from "react";
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
  Clock,
  Filter,
  BarChart3,
  Send,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { IWebhook, IWebhookEvent } from "@/types/webhook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDuctape } from "@/hooks/useDuctape";
import { useAuth } from "@/store/useAuth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import DetailsSidebar from "@/components/DetailsSidebar";
import CodeSidebar from "@/components/CodeSidebar";
import { fetchLogs } from "@/services/logsServices";

interface WebhookTabContentProps {
  webhook: IWebhook;
}

// Component to fetch and display webhook metrics for a specific environment
function WebhookEnvMetrics({
  webhookTag,
  appTag,
  env,
  productTag
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
    <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-grey-50 rounded-lg border border-grey-200">
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
        <p className={cn(
          "text-lg font-semibold",
          (metricsData?.successRate || 0) >= 90 ? "text-green" :
          (metricsData?.successRate || 0) >= 70 ? "text-orange-500" : "text-red"
        )}>
          {metricsData?.successRate || 0}%
        </p>
      </div>
    </div>
  );
}

export default function WebhookTabContent({ webhook }: WebhookTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { openTab } = useWorkbenchStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);

  // New event form state
  const [eventName, setEventName] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventSelector, setEventSelector] = useState("");
  const [eventSample, setEventSample] = useState("{}");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || "",
    user_id: user?._id || "",
    token: user?.auth_token || "",
    public_key: user?.public_key || "",
    type: "app",
  });

  // Auto-generate tag and description from name
  const handleEventNameChange = (value: string) => {
    setEventName(value);
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    setEventTag(sanitized);
    setEventDescription(value);
  };

  // Reset form
  const resetForm = () => {
    setEventName("");
    setEventTag("");
    setEventDescription("");
    setEventSelector("");
    setEventSample("{}");
  };

  // Parse sample payload and extract selector options
  const sampleValidation = useMemo(() => {
    if (!eventSample || eventSample.trim() === '' || eventSample.trim() === '{}') {
      return { isValid: true, error: null, selectorOptions: [] as string[] };
    }

    try {
      const sample = JSON.parse(eventSample);
      const options: string[] = [];

      const traverse = (obj: any, path: string = "", parentIsArray: boolean = false) => {
        if (typeof obj !== "object" || obj === null) return;
        if (parentIsArray) return;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const isArray = Array.isArray(value);
          const isObject = typeof value === "object" && value !== null && !isArray;

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
      if (!ductape) throw new Error("Ductape not initialized");

      let parsedSample;
      try {
        parsedSample = JSON.parse(payload.sample);
      } catch (e) {
        throw new Error("Invalid JSON in sample payload");
      }

      const formattedSelector = payload.selector
        ? `$Event{${payload.selector.split(".").join("}{")}}`
        : "";

      const appTagValue = (webhook as any)?.appTag || (webhook as any)?.app?.tag;
      if (!appTagValue) throw new Error("App tag not found");

      const eventData = await (ductape as any).webhooks.events.create(appTagValue,{
        name: payload.name,
        tag: `${webhook.tag}:${payload.tag}`,
        description: payload.description,
        selector: formattedSelector,
        sample: parsedSample,
      });

      return eventData;
    },
    onSuccess: () => {
      const appTagValue = (webhook as any)?.appTag || (webhook as any)?.app?.tag;
      const appId = (webhook as any)?.app?._id;
      if (appId) {
        queryClient.invalidateQueries({ queryKey: ["app", appId] });
      }
      if (appTagValue) {
        queryClient.invalidateQueries({ queryKey: ["app", appTagValue] });
      }
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      toast.success("Event created successfully!");
      setShowNewEventDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create event");
    },
  });

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !eventTag.trim() || !eventSelector.trim()) {
      toast.error("Please fill in all required fields");
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

  // Extract app/product info
  const app = (webhook as any)?.app;
  const appName = (webhook as any)?.appName || app?.app_name;
  const appTag = (webhook as any)?.appTag || app?.tag;
  const appLogo = (webhook as any)?.appLogo || app?.logo;
  const productTag = (webhook as any)?.productTag;

  // Count events with single vs multi selectors
  const selectorStats = useMemo(() => {
    let singleSelector = 0;
    let multiSelector = 0;
    events.forEach((event) => {
      const selectorStr = (event as any).selector || '';
      const selectors = selectorStr.split(',').map((s: string) => s.trim()).filter(Boolean);
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
    return matches.map(m => m.slice(1, -1)).join('.');
  };

  // Open event in new tab
  const handleViewEvent = (event: IWebhookEvent) => {
    setSelectedEventId(event._id);
  };

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

  // Open in explorer tab
  const handleOpenInExplorer = () => {
    openTab({
      id: `webhook-explorer-${webhook.tag}-${Date.now()}`,
      type: 'webhook-explorer',
      title: `${webhook.name}`,
      itemId: webhook.tag,
      data: {
        ...webhook,
        appTag,
        appName,
        appLogo,
        productTag,
        app,
      },
    });
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
${events.slice(0, 3).map(e => `    case '${e.tag}':\n      // Handle ${e.name}\n      break;`).join('\n')}
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
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue/10 flex items-center justify-center flex-shrink-0">
              <Webhook className="h-6 w-6 text-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-grey">{webhook.name}</h1>
                <div className="flex gap-2">
                  <Button onClick={handleOpenInExplorer} variant="outline" size="sm" className="gap-2" disabled>
                    <ExternalLink className="h-4 w-4" />
                    Open in Explorer
                  </Button>
                  <Button onClick={() => setShowCodeSidebar(true)} variant="outline" size="sm" className="gap-2" disabled>
                    <Code className="h-4 w-4" />
                    View Code
                  </Button>
                  <Button onClick={handleViewActivity} variant="outline" size="sm" className="gap-2" disabled>
                    <Activity className="h-4 w-4" />
                    View Logs
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600">Tag: <span className="font-mono">{webhook.tag}</span></span>
                {webhook.active !== undefined && (
                  <>
                    <span className="text-grey-400">•</span>
                    <span className={cn(
                      "text-sm font-medium flex items-center gap-1.5",
                      webhook.active ? "text-green" : "text-grey-600"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", webhook.active ? "bg-green" : "bg-grey-400")} />
                      {webhook.active ? "Active" : "Inactive"}
                    </span>
                  </>
                )}
              </div>
              {webhook.description && (
                <p className="text-sm text-grey-600">{webhook.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-grey">Events</h3>
            </div>
            <p className="text-2xl font-bold text-grey">{events.length}</p>
            <p className="text-xs text-grey-500">Total configured</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-5 w-5 text-blue" />
              <h3 className="text-sm font-semibold text-grey">Single Selector</h3>
            </div>
            <p className="text-2xl font-bold text-grey">{selectorStats.singleSelector}</p>
            <p className="text-xs text-grey-500">Simple events</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-semibold text-grey">Multi Selector</h3>
            </div>
            <p className="text-2xl font-bold text-grey">{selectorStats.multiSelector}</p>
            <p className="text-xs text-grey-500">Complex events</p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-green" />
              <h3 className="text-sm font-semibold text-grey">Environments</h3>
            </div>
            <p className="text-2xl font-bold text-grey">{webhook.envs?.length || 0}</p>
            <p className="text-xs text-grey-500">Configured</p>
          </div>
        </div>

        {/* Environment Endpoints with Metrics */}
        {webhook.envs && webhook.envs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-grey">Environment Endpoints</h2>
            {webhook.envs.map((env, index) => {
              const webhookUrl = (env as any).registration_url ||
                (env as any).webhook_url ||
                `https://api.ductape.app/webhooks/${appTag}/${webhook.tag}/${env.slug}`;

              return (
                <div key={index} className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="text-base font-semibold text-grey">{env.slug.toUpperCase()}</h3>
                      <span className="px-2 py-0.5 bg-green/10 text-green rounded text-xs font-medium">
                        {env.method || 'POST'}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleCopy(webhookUrl, "URL")}
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

        {/* Events Section */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Webhook Events ({events.length})</h2>
            <Button onClick={() => setShowNewEventDialog(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-primary/10">
                  <Zap className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
              </div>
              <h3 className="text-lg font-semibold text-grey mb-2">No events yet</h3>
              <p className="text-sm text-grey-500 text-center max-w-sm mb-6">
                Events define how incoming webhook payloads are identified and routed.
              </p>
              <Button onClick={() => setShowNewEventDialog(true)} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Create your first event
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const selectorStr = (event as any).selector || '';
                const selectors = selectorStr.split(',').map((s: string) => s.trim()).filter(Boolean);
                const isMultiSelector = selectors.length > 1;
                const selectorValue = (event as any).selectorValue;

                return (
                  <div
                    key={event._id}
                    onClick={() => handleViewEvent(event)}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-grey truncate">{event.name}</h3>
                        {isMultiSelector && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue/10 text-blue">
                            {selectors.length} selectors
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-grey-500 font-mono">{webhook.tag}:{event.tag}</p>
                      {selectorStr && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectors.slice(0, 2).map((sel: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-grey-100 text-grey-600 font-mono">
                              {formatSelector(sel)}
                              {!isMultiSelector && selectorValue && typeof selectorValue !== 'object' && (
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
                    </div>

                    <ArrowRight className="h-4 w-4 text-grey-400" />
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Info Box */}
        <div className="bg-blue/5 border border-blue/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">About Webhook Channels</h3>
          <p className="text-xs text-grey-600">
            Webhook channels provide a single point of registration for multiple events. Partners can register their endpoint once and receive notifications for all configured events. Events are identified using the <code className="bg-blue/10 px-1 rounded">webhook:event</code> tag format and routed based on event selectors.
          </p>
        </div>
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
                  onClick={() => handleCopy(`${webhook.tag}:${selectedEvent.tag}`, "Event tag")}
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
                value={`${selectedEvent.selector}${selectedEvent.selectorValue ? ` = ${typeof selectedEvent.selectorValue === 'object' ? JSON.stringify(selectedEvent.selectorValue) : selectedEvent.selectorValue}` : ''}`}
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
                      typeof selectedEvent.sample === "string"
                        ? selectedEvent.sample
                        : JSON.stringify(selectedEvent.sample, null, 2),
                      "Sample payload"
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
                  typeof selectedEvent.sample === "string"
                    ? selectedEvent.sample
                    : JSON.stringify(selectedEvent.sample, null, 2)
                }
                readOnly
                className="bg-grey-50 resize-none"
                rows={Math.min(10, (typeof selectedEvent.sample === "string" ? selectedEvent.sample : JSON.stringify(selectedEvent.sample, null, 2)).split('\n').length)}
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
          environments={webhook.envs?.map(e => ({ slug: e.slug })) || []}
        />
      )}

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Add a new event to the {webhook.name} channel</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="event-name" className="required">Event Name</Label>
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
              <Label htmlFor="event-tag" className="required">Event Tag</Label>
              <Input
                id="event-tag"
                placeholder="e.g., new_transaction"
                value={eventTag}
                onChange={(e) =>
                  setEventTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_"))
                }
                className="mt-2 font-mono"
              />
              <p className="text-xs text-grey-600 mt-1">
                Combined tag: <code className="text-primary">{webhook.tag}:{eventTag || "event_tag"}</code>
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
                <Label htmlFor="event-sample" className="required">Sample Payload (JSON)</Label>
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
                  "mt-2 min-h-[150px]",
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
              <Label htmlFor="event-selector" className="required">Event Selector</Label>
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
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {eventSelector && (
                <p className="text-xs text-grey-600 mt-1">
                  Selector: <code className="text-primary">{`$Event{${eventSelector.split(".").join("}{")}\}`}</code>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => { setShowNewEventDialog(false); resetForm(); }} disabled={isCreatingEvent}>
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

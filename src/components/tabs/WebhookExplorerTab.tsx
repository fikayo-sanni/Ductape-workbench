import { useState, useMemo, useEffect, useRef } from 'react';
import { Webhook, Code, Activity, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import CodeSidebar from '@/components/CodeSidebar';
import { IWebhook, IWebhookEvent } from '@/types/webhook';
import appServices from '@/services/appServices';
import { saveTabState, getTabState } from '@/lib/tab-state-manager';
import { WebhookExplorerSidebar } from '@/components/webhook-explorer/WebhookExplorerSidebar';
import { WebhookExplorerOverview } from '@/components/webhook-explorer/WebhookExplorerOverview';
import { WebhookExplorerEnvironments } from '@/components/webhook-explorer/WebhookExplorerEnvironments';
import { WebhookExplorerEventPanel } from '@/components/webhook-explorer/WebhookExplorerEventPanel';
import { WebhookExplorerCreateEventDialog } from '@/components/webhook-explorer/WebhookExplorerCreateEventDialog';
import { useWebhookGlobalMetrics } from '@/components/webhook-explorer/WebhookExplorerMetrics';
import { WebhookExplorerViewMode } from '@/components/webhook-explorer/utils';

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

interface WebhookExplorerPersistedState {
  viewMode: WebhookExplorerViewMode;
  searchQuery: string;
  selectedEventId: string | null;
}

function WebhookExplorerIncomplete() {
  return (
    <div className="h-full flex items-center justify-center bg-grey-100">
      <div className="text-center">
        <Webhook className="h-12 w-12 text-grey-400 mx-auto mb-3" />
        <p className="text-grey-600 mb-2">Incomplete webhook data</p>
        <p className="text-sm text-grey-500">Close this tab and reopen the webhook from the app.</p>
      </div>
    </div>
  );
}

function WebhookExplorerTabBody({ tabId, webhook }: WebhookExplorerTabProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const hasRestoredStateRef = useRef(false);

  const [viewMode, setViewMode] = useState<WebhookExplorerViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [eventName, setEventName] = useState('');
  const [eventTag, setEventTag] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSelector, setEventSelector] = useState('');
  const [eventSample, setEventSample] = useState('{}');

  const app = webhook?.app;
  const appName = webhook?.appName || app?.app_name;
  const appTag = webhook?.appTag || app?.tag || '';
  const appLogo = webhook?.appLogo || app?.logo;
  const productTag = webhook?.productTag;

  const { data: appData } = useQuery({
    queryKey: ['app', app?._id || appTag],
    queryFn: () =>
      appServices.fetchApp({
        app_id: app?._id || '',
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!(app?._id || appTag) && !!user?._id && !!user?.public_key,
    staleTime: 1000 * 60 * 5,
  });

  const currentApp = appData?.data || app;
  const versions = currentApp && 'versions' in currentApp ? (currentApp as { versions?: unknown[] }).versions : null;
  const selectedVersion =
    (versions as Array<{ latest?: boolean; envs?: unknown[] }> | null)?.find((v) => v.latest) ||
    (versions && (versions as unknown[]).length > 0 ? (versions as unknown[])[0] : null);
  const appEnvironments = (selectedVersion as { envs?: Array<{ slug: string }> })?.envs || [];

  useEffect(() => {
    if (hasRestoredStateRef.current) return;
    const savedState = getTabState(tabId);
    if (savedState?.data) {
      const persistedState = savedState.data as WebhookExplorerPersistedState;
      if (persistedState.viewMode) setViewMode(persistedState.viewMode);
      if (persistedState.searchQuery) setSearchQuery(persistedState.searchQuery);
      if (persistedState.selectedEventId) setSelectedEventId(persistedState.selectedEventId);
    }
    hasRestoredStateRef.current = true;
  }, [tabId]);

  useEffect(() => {
    if (!hasRestoredStateRef.current) return;
    saveTabState(tabId, 'webhook-explorer', `${webhook.name}`, {
      viewMode,
      searchQuery,
      selectedEventId,
    } as WebhookExplorerPersistedState, undefined, `${webhook.tag}`);
  }, [tabId, webhook.name, webhook.tag, viewMode, searchQuery, selectedEventId]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied`);
    setTimeout(() => setCopiedText(null), 2000);
  };

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

  const resetForm = () => {
    setEventName('');
    setEventTag('');
    setEventDescription('');
    setEventSelector('');
    setEventSample('{}');
  };

  const sampleValidation = useMemo(() => {
    if (!eventSample || eventSample.trim() === '' || eventSample.trim() === '{}') {
      return { isValid: true, error: null, selectorOptions: [] as string[] };
    }
    try {
      const sample = JSON.parse(eventSample);
      const options: string[] = [];
      const traverse = (obj: unknown, path: string = '', parentIsArray: boolean = false) => {
        if (typeof obj !== 'object' || obj === null) return;
        if (parentIsArray) return;
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          const currentPath = path ? `${path}.${key}` : key;
          const isArray = Array.isArray(value);
          const isObject = typeof value === 'object' && value !== null && !isArray;
          if (!isObject && !isArray) options.push(currentPath);
          if (isObject && !isArray) traverse(value, currentPath, false);
        }
      };
      traverse(sample);
      return { isValid: true, error: null, selectorOptions: options };
    } catch (error: unknown) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
        selectorOptions: [] as string[],
      };
    }
  }, [eventSample]);

  const { mutateAsync: createEvent, isPending: isCreatingEvent } = useMutation({
    mutationFn: async (payload: {
      name: string;
      tag: string;
      description: string;
      selector: string;
      sample: string;
    }) => {
      if (!ductape) throw new Error('Ductape not initialized');
      const parsedSample = JSON.parse(payload.sample);
      const formattedSelector = payload.selector
        ? `$Event{${payload.selector.split('.').join('}{')}}`
        : '';
      const appTagValue = typeof appTag === 'string' ? appTag : '';
      if (!appTagValue) throw new Error('App tag not found');
      const client = ductape as {
        init: (t: string) => Promise<void>;
        webhooks: { events: { create: (t: string, d: unknown) => Promise<unknown> } };
      };
      await client.init(appTagValue);
      return client.webhooks.events.create(appTagValue, {
        name: payload.name,
        tag: `${webhook.tag}:${payload.tag}`,
        description: payload.description,
        selector: formattedSelector,
        sample: parsedSample,
      });
    },
    onSuccess: () => {
      if (app?._id) queryClient.invalidateQueries({ queryKey: ['app', app._id] });
      if (appTag) queryClient.invalidateQueries({ queryKey: ['app', appTag] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Event created');
      setShowNewEventDialog(false);
      resetForm();
    },
    onError: (error: { message?: string }) => {
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

  const events: IWebhookEvent[] = (webhook as { events?: IWebhookEvent[] })?.events || [];
  const selectedEvent = events.find((e) => e._id === selectedEventId);

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

  const selectorStats = useMemo(() => {
    let singleSelector = 0;
    let multiSelector = 0;
    events.forEach((event) => {
      const selectorStr = (event as { selector?: string }).selector || '';
      const count = selectorStr.split(',').map((s) => s.trim()).filter(Boolean).length;
      if (count > 1) multiSelector++;
      else if (count === 1) singleSelector++;
    });
    return { singleSelector, multiSelector };
  }, [events]);

  const { metricsData: globalMetrics, isLoading: isLoadingMetrics } = useWebhookGlobalMetrics(
    webhook.tag,
    appTag
  );

  const handleViewActivity = () => {
    openTab({
      id: `logs-webhook-${webhook.tag}-${Date.now()}`,
      type: 'logs',
      title: `${webhook.name} - Logs`,
      itemId: webhook.tag,
      data: { type: 'webhook', parent_tag: webhook.tag, app_tag: appTag },
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['webhook-global-metrics', webhook.tag] });
    await queryClient.invalidateQueries({ queryKey: ['webhook-env-metrics', webhook.tag] });
    toast.success('Metrics refreshed');
    setIsRefreshing(false);
  };

  const generateCodeSections = (language: string, env: string = 'production') => {
    const sections: Array<{ title: string; code: string }> = [];
    if (language === 'typescript' || language === 'javascript') {
      const isTs = language === 'typescript';
      sections.push({
        title: 'Initialize SDK',
        code: `${isTs ? "import { Ductape } from '@ductape/sdk';\n\n" : ''}const ductape = new Ductape({ /* config */ });
await ductape.app.init('${appTag}');`,
      });
      sections.push({
        title: 'Register endpoint',
        code: `await ductape.webhooks.register({
  tag: '${webhook.tag}',
  env: '${env}',
  url: 'https://your-api.com/webhooks/receive',
  method: 'POST'
});`,
      });
    }
    return sections;
  };

  const openAppTab = () => {
    if (app?._id) {
      openTab({
        id: `app-${app._id}`,
        type: 'app',
        title: appName || 'App',
        itemId: app._id,
        data: { _id: app._id, app_name: appName, tag: appTag },
      });
    }
  };

  const handleViewModeChange = (mode: WebhookExplorerViewMode) => {
    setViewMode(mode);
    if (mode === 'events' && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0]._id);
    }
  };

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setViewMode('events');
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      <WebhookExplorerSidebar
        webhookName={webhook.name}
        webhookTag={webhook.tag}
        webhookActive={!!webhook.active}
        appName={appName}
        appLogo={appLogo}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenApp={openAppTab}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        eventsCount={events.length}
        envsCount={appEnvironments.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredEvents={filteredEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
        onAddEvent={() => setShowNewEventDialog(true)}
        fullWebhookTag={webhook.tag}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex-shrink-0 h-12 border-b border-grey-300 bg-white px-4 flex items-center justify-between gap-3">
          <p className="text-sm text-grey-600 truncate">
            {viewMode === 'overview' && 'Dashboard'}
            {viewMode === 'events' && (selectedEvent ? selectedEvent.name : 'Events')}
            {viewMode === 'environments' && 'Environments'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {viewMode === 'events' && (
              <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setShowNewEventDialog(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add event
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowCodeSidebar(true)}
              disabled
            >
              <Code className="h-3.5 w-3.5" />
              Code
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleViewActivity}
              disabled
            >
              <Activity className="h-3.5 w-3.5" />
              Logs
            </Button>
          </div>
        </div>

        {viewMode === 'overview' && (
          <WebhookExplorerOverview
            webhookTag={webhook.tag}
            appTag={appTag}
            productTag={productTag}
            events={events}
            appEnvironments={appEnvironments}
            globalMetrics={globalMetrics}
            isLoadingMetrics={isLoadingMetrics}
            selectorStats={selectorStats}
            copiedText={copiedText}
            onCopy={handleCopy}
            onViewAllEvents={() => {
              setViewMode('events');
              if (events.length > 0) setSelectedEventId(events[0]._id);
            }}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {viewMode === 'environments' && (
          <WebhookExplorerEnvironments
            webhookTag={webhook.tag}
            appTag={appTag}
            productTag={productTag}
            appEnvironments={appEnvironments}
            webhookConfig={(webhook as { config?: unknown[] }).config as Array<{
              appEnv?: string;
              productEnv?: string;
              url?: string;
              method?: string;
            }>}
            copiedText={copiedText}
            onCopy={handleCopy}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}

        {viewMode === 'events' && (
          <WebhookExplorerEventPanel
            webhookTag={webhook.tag}
            selectedEvent={selectedEvent}
            onAddEvent={() => setShowNewEventDialog(true)}
            onCopy={handleCopy}
            searchQuery={searchQuery}
            hasEvents={events.length > 0}
          />
        )}
      </div>

      {showCodeSidebar && (
        <CodeSidebar
          title={webhook.name}
          subtitle={`Integrate ${webhook.tag}`}
          tag={webhook.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={appEnvironments.map((e) => ({ slug: e.slug }))}
        />
      )}

      <WebhookExplorerCreateEventDialog
        open={showNewEventDialog}
        onOpenChange={setShowNewEventDialog}
        webhookName={webhook.name}
        webhookTag={webhook.tag}
        eventName={eventName}
        eventTag={eventTag}
        eventDescription={eventDescription}
        eventSelector={eventSelector}
        eventSample={eventSample}
        onEventNameChange={handleEventNameChange}
        onEventTagChange={(v) =>
          setEventTag(v.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_'))
        }
        onEventDescriptionChange={setEventDescription}
        onEventSelectorChange={setEventSelector}
        onEventSampleChange={setEventSample}
        sampleValidation={sampleValidation}
        isCreating={isCreatingEvent}
        onCreate={handleCreateEvent}
        onCancel={() => {
          setShowNewEventDialog(false);
          resetForm();
        }}
      />
    </div>
  );
}

export default function WebhookExplorerTab(props: WebhookExplorerTabProps) {
  const { webhook } = props;
  if (!webhook?.name || !webhook?.tag) {
    return <WebhookExplorerIncomplete />;
  }
  return <WebhookExplorerTabBody {...props} />;
}

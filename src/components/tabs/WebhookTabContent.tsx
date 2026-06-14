import { useState, useMemo } from 'react';
import { Code, Activity, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { IWebhook, IWebhookEvent } from '@/types/webhook';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import CodeSidebar from '@/components/CodeSidebar';
import WebhookRegistrationPanel from '@/components/webhooks/WebhookRegistrationPanel';
import { WebhookExplorerSidebar } from '@/components/webhook-explorer/WebhookExplorerSidebar';
import { WebhookTabOverview } from '@/components/webhook-explorer/WebhookTabOverview';
import { WebhookExplorerEnvironments } from '@/components/webhook-explorer/WebhookExplorerEnvironments';
import { WebhookExplorerEventPanel } from '@/components/webhook-explorer/WebhookExplorerEventPanel';
import { WebhookExplorerCreateEventDialog } from '@/components/webhook-explorer/WebhookExplorerCreateEventDialog';
import { WebhookExplorerViewMode } from '@/components/webhook-explorer/utils';

export type WebhookViewMode = 'internal' | 'product' | 'readonly';

interface WebhookTabContentProps {
  webhook: IWebhook;
  mode?: WebhookViewMode;
  productTag?: string;
  accessTag?: string;
  productEnvs?: Array<{ slug: string; env_name?: string }>;
}

export default function WebhookTabContent({
  webhook,
  mode = 'readonly',
  productTag: productTagProp,
  accessTag,
  productEnvs = [],
}: WebhookTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { openTab } = useWorkbenchStore();

  const [viewMode, setViewMode] = useState<WebhookExplorerViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);

  const [eventName, setEventName] = useState('');
  const [eventTag, setEventTag] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSelector, setEventSelector] = useState('');
  const [eventSample, setEventSample] = useState('{}');

  const canManageDefinitions = mode === 'internal';
  const canRegister = mode === 'product' && Boolean(productTagProp && accessTag);
  const isReadOnly = mode === 'readonly';

  const app = (webhook as { app?: { _id?: string; tag?: string; app_name?: string; logo?: string } }).app;
  const appName = (webhook as { appName?: string }).appName || app?.app_name;
  const appTag = (webhook as { appTag?: string }).appTag || app?.tag;
  const appLogo = (webhook as { appLogo?: string }).appLogo || app?.logo;
  const productTag = productTagProp || (webhook as { productTag?: string }).productTag;

  const modeBadge = isReadOnly
    ? { label: 'View only', className: 'bg-grey-100 text-grey-600' }
    : canManageDefinitions
      ? { label: 'Internal', className: 'bg-blue/10 text-blue' }
      : canRegister
        ? { label: 'Product', className: 'bg-primary/10 text-primary' }
        : undefined;

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
      const appTagValue = appTag || '';
      if (!appTagValue) throw new Error('App tag not found');
      const client = ductape as {
        webhooks: { events: { create: (t: string, d: unknown) => Promise<unknown> } };
      };
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

  const events: IWebhookEvent[] = webhook.events || [];
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
      const count = (event.selector || '').split(',').map((s) => s.trim()).filter(Boolean).length;
      if (count > 1) multiSelector++;
      else if (count === 1) singleSelector++;
    });
    return { singleSelector, multiSelector };
  }, [events]);

  const appEnvironments = (webhook.envs || []).map((e) => ({
    slug: e.slug,
    registration_url: e.registration_url,
    webhook_url: e.registration_url,
    method: e.method,
  }));

  const handleViewActivity = () => {
    openTab({
      id: `logs-webhook-${webhook.tag}-${Date.now()}`,
      type: 'logs',
      title: `${webhook.name} - Logs`,
      itemId: webhook.tag,
      data: { type: 'webhook', parent_tag: webhook.tag, app_tag: appTag },
    });
  };

  const handleOpenInExplorer = () => {
    openTab({
      id: `webhook-explorer-${webhook.tag}`,
      type: 'webhook-explorer',
      title: webhook.name,
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

  const generateCodeSections = (language: string, env: string = 'production') => {
    const sections: Array<{ title: string; code: string }> = [];
    if (language === 'typescript' || language === 'javascript') {
      sections.push({
        title: 'Register endpoint',
        code: `await ductape.product.init('${productTag || 'your_product'}');
const proxyUrl = await ductape.product.apps.webhooks.generateLink({
  product: '${productTag || 'your_product'}',
  access_tag: '${accessTag || 'your_access_tag'}',
  webhook_tag: '${webhook.tag}',
  env: '${env}',
  url: 'https://your-api.com/webhooks/receive',
  method: 'POST'
});`,
      });
    }
    return sections;
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
    <div className="h-full flex min-h-0 overflow-hidden bg-grey-100">
      <WebhookExplorerSidebar
        webhookName={webhook.name}
        webhookTag={webhook.tag}
        webhookActive={!!webhook.active}
        appName={appName}
        appLogo={appLogo}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        eventsCount={events.length}
        envsCount={webhook.envs?.length || 0}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredEvents={filteredEvents}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
        onAddEvent={() => setShowNewEventDialog(true)}
        fullWebhookTag={webhook.tag}
        modeBadge={modeBadge}
        canAddEvent={canManageDefinitions}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-shrink-0 h-12 border-b border-grey-300 bg-white px-4 flex items-center justify-between gap-3">
          <p className="text-sm text-grey-600 truncate">
            {viewMode === 'overview' && 'Overview'}
            {viewMode === 'events' && (selectedEvent ? selectedEvent.name : 'Events')}
            {viewMode === 'environments' && 'Environments'}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {viewMode === 'events' && canManageDefinitions && (
              <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setShowNewEventDialog(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add event
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleOpenInExplorer}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Explorer
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
          <WebhookTabOverview
            webhook={webhook}
            appTag={appTag}
            productTag={productTag}
            events={events}
            selectorStats={selectorStats}
            copiedText={copiedText}
            onCopy={handleCopy}
            onViewAllEvents={() => {
              setViewMode('events');
              if (events.length > 0) setSelectedEventId(events[0]._id);
            }}
            onViewEnvironments={() => setViewMode('environments')}
            onSelectEvent={handleSelectEvent}
            registrationPanel={
              canRegister ? (
                <WebhookRegistrationPanel
                  webhookTag={webhook.tag}
                  webhookName={webhook.name}
                  productTag={productTag!}
                  accessTag={accessTag!}
                  productEnvs={productEnvs}
                  appEnvSlugs={webhook.envs?.map((e) => e.slug) ?? []}
                />
              ) : undefined
            }
          />
        )}

        {viewMode === 'environments' && (
          <WebhookExplorerEnvironments
            webhookTag={webhook.tag}
            appTag={appTag || ''}
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
            isRefreshing={false}
            onRefresh={() => {}}
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
          environments={webhook.envs?.map((e) => ({ slug: e.slug })) || []}
        />
      )}

      {canManageDefinitions && (
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
      )}
    </div>
  );
}

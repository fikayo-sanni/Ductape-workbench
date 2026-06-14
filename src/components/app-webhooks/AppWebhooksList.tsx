import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Webhook,
  Plus,
  Upload,
  ChevronDown,
  Trash2,
  Loader2,
  Link2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { IWebhook, IWebhookEvent } from '@/types/webhook';
import type { WebhookViewMode } from '@/components/tabs/WebhookTabContent';
import { EventSampleSidebar } from './EventSampleSidebar';
import { WebhookRegistrationSidebar } from './WebhookRegistrationSidebar';
import { getFullEventTag } from './event-sample';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { useProductWebhookRegistrations } from '@/hooks/useProductWebhookRegistrations';
import { getWebhookRegistrationSummary } from '@/utils/productWebhookRegistration';
import toast from 'react-hot-toast';

interface AppWebhooksListProps {
  webhooks: IWebhook[];
  app: {
    _id: string;
    tag: string;
    workspace_id?: string;
  };
  onAddEvents: (webhook: IWebhook) => void;
  mode: WebhookViewMode;
  productTag?: string;
  accessTag?: string;
  productEnvs?: Array<{ slug: string; env_name?: string }>;
  onCreate: () => void;
  onImport: () => void;
}

export function AppWebhooksList({
  webhooks,
  app,
  onAddEvents,
  mode,
  productTag,
  accessTag,
  productEnvs = [],
  onCreate,
  onImport,
}: AppWebhooksListProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const ductape = useDuctape({
    workspace_id: app.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as {
    init: (tag: string) => Promise<void>;
    webhooks: {
      delete: (appTag: string, tag: string) => Promise<void>;
      events: { delete: (appTag: string, eventTag: string) => Promise<void> };
    };
  } | null;

  const [sample, setSample] = useState<{ webhook: IWebhook; event: IWebhookEvent } | null>(
    null
  );
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [webhookToDelete, setWebhookToDelete] = useState<IWebhook | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{
    webhook: IWebhook;
    event: IWebhookEvent;
  } | null>(null);

  const count = webhooks.length;
  const canManage = mode === 'internal';
  const canRegister = mode === 'product' && Boolean(productTag && accessTag);
  const [registrationWebhook, setRegistrationWebhook] = useState<IWebhook | null>(null);

  const { data: productRegistrations, isLoading: loadingRegistrations } =
    useProductWebhookRegistrations(productTag, accessTag, canRegister);

  const registrationByTag = new Map(
    (productRegistrations ?? []).map((row) => [row.tag, row.config])
  );

  const invalidateApp = () => {
    queryClient.invalidateQueries({ queryKey: ['app', app._id] });
    queryClient.invalidateQueries({ queryKey: ['app', app.tag] });
    queryClient.invalidateQueries({ queryKey: ['webhooks'] });
  };

  const { mutate: deleteWebhook, isPending: isDeletingWebhook } = useMutation({
    mutationFn: async (tag: string) => {
      if (!ductape) throw new Error('Ductape not initialized');
      await ductape.init(app.tag);
      await ductape.webhooks.delete(app.tag, tag);
    },
    onSuccess: () => {
      invalidateApp();
      setWebhookToDelete(null);
      setSample(null);
      toast.success('Webhook deleted');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete webhook');
    },
  });

  const { mutate: deleteEvent, isPending: isDeletingEvent } = useMutation({
    mutationFn: async ({
      webhookTag,
      event,
    }: {
      webhookTag: string;
      event: IWebhookEvent;
    }) => {
      if (!ductape) throw new Error('Ductape not initialized');
      await ductape.init(app.tag);
      const eventTag = getFullEventTag(webhookTag, event);
      await ductape.webhooks.events.delete(app.tag, eventTag);
    },
    onSuccess: () => {
      invalidateApp();
      setEventToDelete(null);
      setSample(null);
      toast.success('Event deleted');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete event');
    },
  });

  const eventsForWebhook = (webhook: IWebhook) => webhook.events || [];

  const toggleExpanded = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const openAddEvents = (webhook: IWebhook, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSample(null);
    setRegistrationWebhook(null);
    onAddEvents(webhook);
  };

  const openRegistration = (webhook: IWebhook, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSample(null);
    setRegistrationWebhook(webhook);
  };

  const confirmDeleteWebhook = () => {
    if (webhookToDelete?.tag) {
      deleteWebhook(webhookToDelete.tag);
    }
  };

  const confirmDeleteEvent = () => {
    if (eventToDelete) {
      deleteEvent({
        webhookTag: eventToDelete.webhook.tag,
        event: eventToDelete.event,
      });
    }
  };

  return (
    <>
      <div className="h-full overflow-auto bg-grey-50">
        <div className="bg-white border-b border-grey-300 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-blue-500/10">
                  <Webhook className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-grey">Webhooks</h1>
                  <p className="text-sm text-grey-500">
                    {canRegister
                      ? 'Register a consumer endpoint for each webhook to receive events via this product.'
                      : `${count} ${count === 1 ? 'webhook' : 'webhooks'} configured`}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={onImport} className="gap-2 shadow-sm">
                    <Upload className="h-4 w-4" />
                    Import JSON
                  </Button>
                  <Button onClick={onCreate} className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    Add Webhook
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {mode === 'product' && !accessTag && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {!productTag
                ? 'Open this app from a product’s Connected Apps list to register webhooks.'
                : 'Could not resolve the product connection for this app. Confirm the app is connected to the product, then open it again from the product.'}
            </div>
          )}
          {canRegister && accessTag && productEnvs.length === 0 && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No product environments are mapped to this app yet. Configure environment
              mappings on the product’s connected app settings, then return here to set
              consumer endpoints.
            </div>
          )}
          {count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {webhooks.map((webhook) => {
                const events = eventsForWebhook(webhook);
                const isExpanded = expandedTags.has(webhook.tag);
                const hasEvents = events.length > 0;
                const displayName = webhook.name || webhook.tag;
                const isRegistering =
                  registrationWebhook?.tag === webhook.tag;
                const regSummary = canRegister
                  ? getWebhookRegistrationSummary(
                      registrationByTag.get(webhook.tag),
                      productEnvs
                    )
                  : null;

                return (
                  <div
                    key={webhook._id || webhook.tag}
                    className={cn(
                      'bg-white rounded-lg border overflow-hidden hover:shadow-md transition-all',
                      isRegistering
                        ? 'border-primary ring-1 ring-primary/20'
                        : 'border-grey-400 hover:border-primary'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/10">
                          <Webhook className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-grey truncate">
                              {displayName}
                            </h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {canManage && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-grey-500 hover:text-red"
                                  aria-label={`Delete webhook ${displayName}`}
                                  onClick={() => setWebhookToDelete(webhook)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {hasEvents ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(webhook.tag)}
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 flex items-center gap-1',
                                    'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                  )}
                                  aria-expanded={isExpanded}
                                >
                                  {events.length} {events.length === 1 ? 'event' : 'events'}
                                  <ChevronDown
                                    className={cn(
                                      'h-3 w-3 transition-transform',
                                      !isExpanded && '-rotate-90'
                                    )}
                                  />
                                </button>
                              ) : (
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0',
                                    'bg-gray-100 text-gray-600 border-gray-200',
                                    'dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                  )}
                                >
                                  No events
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-grey-500 truncate">{webhook.tag}</p>
                          {webhook.description && (
                            <p className="text-xs text-grey-600 mt-1.5 line-clamp-2">
                              {webhook.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {(isExpanded || !hasEvents) && (
                      <div className="border-t border-grey-300">
                        {hasEvents && isExpanded && (
                          <ul className="divide-y divide-grey-100">
                            {events.map((event) => (
                              <li key={event._id || `${webhook.tag}:${event.tag}`}>
                                <div className="flex items-stretch">
                                  <button
                                    type="button"
                                    onClick={() => setSample({ webhook, event })}
                                    className="flex-1 text-left px-4 py-2.5 hover:bg-grey-50 transition-colors min-w-0"
                                  >
                                    <p className="text-xs font-medium text-grey truncate">
                                      {event.name}
                                    </p>
                                    <p className="text-[11px] text-grey-500 font-mono truncate mt-0.5">
                                      {getFullEventTag(webhook.tag, event)}
                                    </p>
                                  </button>
                                  {canManage && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto px-3 rounded-none text-grey-500 hover:text-red hover:bg-grey-50"
                                      aria-label={`Delete event ${event.name}`}
                                      onClick={() =>
                                        setEventToDelete({ webhook, event })
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        {canManage && (
                          <div className="px-4 py-2.5 bg-grey-50/80">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5 h-8 text-xs"
                              onClick={(e) => openAddEvents(webhook, e)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Event
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {canRegister && productEnvs.length > 0 && (
                      <div className="border-t border-grey-300 px-4 py-3 bg-grey-50/50 space-y-2">
                        {loadingRegistrations ? (
                          <p className="text-xs text-grey-500 flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Checking registration status…
                          </p>
                        ) : regSummary ? (
                          <p className="text-xs text-grey-600 flex items-center gap-1.5">
                            {regSummary.fullyRegistered ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                Registered in all {regSummary.total} environments
                              </>
                            ) : regSummary.anyRegistered ? (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                                {regSummary.registered} of {regSummary.total} environments
                                registered
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-grey-500 flex-shrink-0" />
                                Not registered for this product yet
                              </>
                            )}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          variant={
                            regSummary?.fullyRegistered ? 'outline' : 'default'
                          }
                          size="sm"
                          className="w-full gap-2 h-9 text-sm font-medium"
                          onClick={(e) => openRegistration(webhook, e)}
                        >
                          <Link2 className="h-4 w-4" />
                          {loadingRegistrations
                            ? 'Configure endpoints'
                            : regSummary?.fullyRegistered
                              ? 'Manage endpoints'
                              : regSummary?.anyRegistered
                                ? `Finish setup (${regSummary.registered}/${regSummary.total})`
                                : 'Set up endpoints'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-500/10">
                  <Webhook className="h-12 w-12 text-blue-500" />
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-grey-200" />
                <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-grey-300" />
                <div className="absolute top-1/2 -right-6 w-2 h-2 rounded-full bg-grey-200" />
              </div>
              <h3 className="text-xl font-semibold text-grey mb-2">No webhooks yet</h3>
              <p className="text-grey-500 text-center max-w-md mb-6 leading-relaxed">
                Define webhooks and events so products can subscribe to real-time updates from
                your app.
              </p>
              {canManage && (
                <Button onClick={onCreate} className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Create your first webhook
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {registrationWebhook && canRegister && productTag && accessTag && (
        <WebhookRegistrationSidebar
          webhook={registrationWebhook}
          productTag={productTag}
          accessTag={accessTag}
          productEnvs={productEnvs}
          onClose={() => setRegistrationWebhook(null)}
        />
      )}

      {sample && (
        <EventSampleSidebar
          webhookTag={sample.webhook.tag}
          webhookName={sample.webhook.name}
          event={sample.event}
          onClose={() => setSample(null)}
          onAddEvents={
            canManage ? () => onAddEvents(sample.webhook) : undefined
          }
          onDeleteEvent={
            canManage
              ? () => setEventToDelete({ webhook: sample.webhook, event: sample.event })
              : undefined
          }
        />
      )}

      <Dialog open={!!webhookToDelete} onOpenChange={(open) => !open && setWebhookToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red" />
              </div>
              <div>
                <DialogTitle className="text-grey">Delete webhook</DialogTitle>
                <DialogDescription>This action cannot be undone</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-grey-600 py-2">
            Delete <strong>{webhookToDelete?.name || webhookToDelete?.tag}</strong> (
            <span className="font-mono text-xs">{webhookToDelete?.tag}</span>)? All events on
            this webhook will be removed from the app definition.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWebhookToDelete(null)}
              disabled={isDeletingWebhook}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteWebhook}
              disabled={isDeletingWebhook}
              className="gap-2"
            >
              {isDeletingWebhook ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete webhook
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red" />
              </div>
              <div>
                <DialogTitle className="text-grey">Delete event</DialogTitle>
                <DialogDescription>This action cannot be undone</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-grey-600 py-2">
            Delete event <strong>{eventToDelete?.event.name}</strong> (
            <span className="font-mono text-xs">
              {eventToDelete
                ? getFullEventTag(eventToDelete.webhook.tag, eventToDelete.event)
                : ''}
            </span>
            )?
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEventToDelete(null)}
              disabled={isDeletingEvent}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteEvent}
              disabled={isDeletingEvent}
              className="gap-2"
            >
              {isDeletingEvent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete event
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

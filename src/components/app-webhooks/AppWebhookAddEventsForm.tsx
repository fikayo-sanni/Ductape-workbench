import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  XCircle,
  Save,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { IWebhook } from '@/types/webhook';

interface WebhookEventDraft {
  id: string;
  name: string;
  tag: string;
  description: string;
  selectors: string[];
  sample: string;
  isExpanded: boolean;
}

interface AppWebhookAddEventsFormProps {
  webhook: IWebhook;
  app: {
    _id: string;
    tag: string;
    app_name?: string;
    workspace_id?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

function validateEventSample(sample: string) {
  if (!sample || sample.trim() === '' || sample.trim() === '{}') {
    return { isValid: true, error: null, selectorOptions: [] as string[] };
  }
  try {
    const parsed = JSON.parse(sample);
    const options: string[] = [];
    const traverse = (obj: unknown, path: string = '') => {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          options.push(currentPath);
        } else {
          traverse(value, currentPath);
        }
      }
    };
    traverse(parsed);
    return { isValid: true, error: null, selectorOptions: options };
  } catch (error: unknown) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
      selectorOptions: [] as string[],
    };
  }
}

export function AppWebhookAddEventsForm({
  webhook,
  app,
  onCancel,
  onSuccess,
}: AppWebhookAddEventsFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const webhookTag = webhook.tag;

  const [events, setEvents] = useState<WebhookEventDraft[]>([
    {
      id: `event-${Date.now()}`,
      name: '',
      tag: '',
      description: '',
      selectors: [],
      sample: '{}',
      isExpanded: true,
    },
  ]);

  const ductape = useDuctape({
    workspace_id: app.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as {
    init: (tag: string) => Promise<void>;
    webhooks: {
      events: { create: (appTag: string, data: unknown) => Promise<unknown> };
    };
  } | null;

  const addEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: '',
        tag: '',
        description: '',
        selectors: [],
        sample: '{}',
        isExpanded: true,
      },
    ]);
  };

  const updateEvent = (id: string, updates: Partial<WebhookEventDraft>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.id !== id)));
  };

  const handleEventNameChange = (id: string, value: string) => {
    const sanitizedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    updateEvent(id, { name: value, tag: sanitizedTag, description: value });
  };

  const areEventsValid = events.every((event) => {
    if (!event.name.trim() || !event.tag.trim()) return false;
    const validation = validateEventSample(event.sample);
    if (!validation.isValid) return false;
    if (validation.selectorOptions.length === 0) return false;
    if (event.selectors.length === 0) return false;
    return true;
  });

  const { mutateAsync: saveEvents, isPending } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Ductape not initialized');
      await ductape.init(app.tag);

      const validEvents = events.filter(
        (e) => e.name.trim() && e.tag.trim() && e.selectors.length > 0
      );

      const errors: string[] = [];
      let created = 0;

      for (const event of validEvents) {
        let parsedSample = {};
        try {
          parsedSample = JSON.parse(event.sample);
        } catch {
          parsedSample = {};
        }
        const formattedSelectors = event.selectors.map(
          (sel) => `$Event{${sel.split('.').join('}{')}}`
        );
        try {
          await ductape.webhooks.events.create(app.tag, {
            name: event.name,
            tag: `${webhookTag}:${event.tag}`,
            description: event.description,
            selector: formattedSelectors.join(','),
            sample: parsedSample,
          });
          created += 1;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Create failed';
          errors.push(`${event.name || event.tag}: ${msg}`);
        }
      }

      return { created, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['app', app._id] });
      queryClient.invalidateQueries({ queryKey: ['app', app.tag] });
      if (result.errors.length > 0) {
        toast.error(
          `Created ${result.created} event(s). ${result.errors.length} failed.`
        );
      } else {
        toast.success(
          `Created ${result.created} ${result.created === 1 ? 'event' : 'events'}`
        );
      }
      if (result.created > 0) {
        onSuccess();
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to create events');
    },
  });

  const handleSave = async () => {
    if (events.length === 0) {
      toast.error('Add at least one event');
      return;
    }
    if (!areEventsValid) {
      toast.error(
        'Each event needs a name, tag, sample payload with fields, and at least one selector'
      );
      return;
    }
    await saveEvents();
  };

  return (
    <div className="h-full overflow-auto bg-grey-50">
      <div className="bg-white border-b border-grey-300 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-10 w-10 p-0 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-blue-500/10">
              <Zap className="h-6 w-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-grey">Add events</h1>
              <p className="text-sm text-grey-500 truncate">
                {webhook.name || webhookTag}{' '}
                <span className="font-mono text-xs">({webhookTag})</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 md:px-6 md:py-6">
        <div className="bg-white rounded-lg border border-grey-400 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-grey">Events</h2>
              <p className="text-xs text-grey-600 mt-1">
                Add one or more events for this webhook. Each needs a sample payload and
                selectors.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addEvent} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>

          <div className="space-y-4">
            {events.map((event, index) => {
              const validation = validateEventSample(event.sample);
              return (
                <div key={event.id} className="border border-grey-300 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 bg-grey-50 cursor-pointer"
                    onClick={() =>
                      updateEvent(event.id, { isExpanded: !event.isExpanded })
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-grey truncate">
                        {event.name || `Event ${index + 1}`}
                      </span>
                      {event.tag && (
                        <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono truncate">
                          {webhookTag}:{event.tag}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {events.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEvent(event.id);
                          }}
                          className="h-7 w-7 p-0 text-grey-500 hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {event.isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-grey-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-grey-500" />
                      )}
                    </div>
                  </div>

                  {event.isExpanded && (
                    <div className="p-4 space-y-4">
                      <div>
                        <Label className="required text-xs">Event Name</Label>
                        <Input
                          placeholder="e.g., Payment completed"
                          value={event.name}
                          onChange={(e) => handleEventNameChange(event.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="required text-xs">Event Tag</Label>
                        <Input
                          placeholder="e.g., payment_completed"
                          value={event.tag}
                          onChange={(e) =>
                            updateEvent(event.id, {
                              tag: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, '_')
                                .replace(/_+/g, '_'),
                            })
                          }
                          className="mt-1 font-mono"
                        />
                        <p className="text-xs text-grey-500 mt-1">
                          Full tag:{' '}
                          <code className="text-primary">
                            {webhookTag}:{event.tag || 'event_tag'}
                          </code>
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          placeholder="Describe when this event fires..."
                          value={event.description}
                          onChange={(e) =>
                            updateEvent(event.id, { description: e.target.value })
                          }
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">Sample Payload (JSON)</Label>
                          {event.sample &&
                            event.sample.trim() !== '{}' &&
                            event.sample.trim() !== '' && (
                              <div className="flex items-center gap-1">
                                {validation.isValid ? (
                                  <>
                                    <Check className="h-3 w-3 text-green" />
                                    <span className="text-xs text-green">Valid</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 text-red" />
                                    <span className="text-xs text-red">Invalid</span>
                                  </>
                                )}
                              </div>
                            )}
                        </div>
                        <Textarea
                          placeholder='{"order_id": "123", "status": "paid"}'
                          value={event.sample}
                          onChange={(e) => updateEvent(event.id, { sample: e.target.value })}
                          className={cn(
                            'mt-1 font-mono',
                            event.sample &&
                              event.sample.trim() !== '{}' &&
                              event.sample.trim() !== '' &&
                              (validation.isValid ? 'border-green' : 'border-red')
                          )}
                          rows={4}
                        />
                      </div>
                      {validation.isValid && validation.selectorOptions.length > 0 && (
                        <div>
                          <Label className="text-xs">Event Selectors</Label>
                          <p className="text-xs text-grey-500 mb-2">
                            Select fields that identify this event in the payload.
                          </p>
                          <div className="mt-1 border border-grey-300 rounded-lg max-h-48 overflow-y-auto">
                            {validation.selectorOptions.map((option) => {
                              const isSelected = event.selectors.includes(option);
                              return (
                                <div
                                  key={option}
                                  onClick={() => {
                                    const newSelectors = isSelected
                                      ? event.selectors.filter((s) => s !== option)
                                      : [...event.selectors, option];
                                    updateEvent(event.id, { selectors: newSelectors });
                                  }}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-grey-200 last:border-b-0',
                                    isSelected ? 'bg-primary/5' : 'hover:bg-grey-50'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                                      isSelected
                                        ? 'border-primary bg-primary'
                                        : 'border-grey-400'
                                    )}
                                  >
                                    {isSelected && (
                                      <Check className="h-2.5 w-2.5 text-white" />
                                    )}
                                  </div>
                                  <code className="text-sm font-mono text-grey">{option}</code>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" size="sm" onClick={addEvent} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-grey-300">
            <Button variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !areEventsValid} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save events
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Webhook,
  Save,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  Link2,
  XCircle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { cn } from '@/lib/utils';

interface WebhookEvent {
  id: string;
  name: string;
  tag: string;
  description: string;
  selector: string;
  sample: string;
  isExpanded: boolean;
}

interface InlineWebhookFormProps {
  app: {
    _id: string;
    app_name: string;
    tag: string;
    logo?: string;
    versions?: Array<{
      latest?: boolean;
      envs?: Array<{ slug: string; env_name?: string }>;
    }>;
    envs?: Array<{ slug: string; env_name?: string }>;
    workspace_id?: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export default function InlineWebhookForm({ app, onCancel, onSuccess }: InlineWebhookFormProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Get available environments from the app
  const availableEnvs = app?.versions?.find((v) => v.latest)?.envs || app?.envs || [];

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: app?.workspace_id || currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'app',
  }) as any;

  // Form state
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEnvSlugs, setSelectedEnvSlugs] = useState<string[]>(
    availableEnvs.map((e: any) => e.slug)
  );
  const [events, setEvents] = useState<WebhookEvent[]>([]);

  // Helper to add a new event
  const addEvent = () => {
    const newEvent: WebhookEvent = {
      id: `event-${Date.now()}`,
      name: '',
      tag: '',
      description: '',
      selector: '',
      sample: '{}',
      isExpanded: true,
    };
    setEvents([...events, newEvent]);
  };

  // Helper to update an event
  const updateEvent = (id: string, updates: Partial<WebhookEvent>) => {
    setEvents(events.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  // Helper to remove an event
  const removeEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  // Helper to toggle event expansion
  const toggleEventExpanded = (id: string) => {
    setEvents(events.map((e) => (e.id === id ? { ...e, isExpanded: !e.isExpanded } : e)));
  };

  // Auto-generate event tag from name
  const handleEventNameChange = (id: string, value: string) => {
    const sanitizedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    updateEvent(id, { name: value, tag: sanitizedTag, description: value });
  };

  // Validate event sample JSON
  const validateEventSample = (sample: string) => {
    if (!sample || sample.trim() === '' || sample.trim() === '{}') {
      return { isValid: true, error: null, selectorOptions: [] as string[] };
    }
    try {
      const parsed = JSON.parse(sample);
      const options: string[] = [];
      const traverse = (obj: any, path: string = '') => {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value !== 'object' || value === null) {
            options.push(currentPath);
          } else if (!Array.isArray(value)) {
            traverse(value, currentPath);
          }
        }
      };
      traverse(parsed);
      return { isValid: true, error: null, selectorOptions: options };
    } catch (error: any) {
      return { isValid: false, error: error.message, selectorOptions: [] as string[] };
    }
  };

  // Toggle environment selection
  const toggleEnvSlug = (slug: string) => {
    if (selectedEnvSlugs.includes(slug)) {
      setSelectedEnvSlugs(selectedEnvSlugs.filter((s) => s !== slug));
    } else {
      setSelectedEnvSlugs([...selectedEnvSlugs, slug]);
    }
  };

  // Auto-generate tag and description from name
  const handleNameChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    setName(value);
    setTag(sanitized);
    // Generate a proper description sentence
    if (value.trim()) {
      setDescription(`Webhook channel for ${value.toLowerCase()} events and notifications.`);
    } else {
      setDescription('');
    }
  };

  // Create webhook mutation
  const { mutateAsync: createWebhook, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      if (!ductape) throw new Error('Ductape not initialized');

      await ductape.init(app.tag);

      // Prepare valid events
      const validEvents = events.filter((e) => e.name.trim() && e.tag.trim());
      const formattedEvents = validEvents.map((event) => {
        // Parse sample JSON
        let parsedSample = {};
        try {
          parsedSample = JSON.parse(event.sample);
        } catch {
          // Use empty object if invalid
        }

        // Format selector: convert "field.subfield" to "$Event{field}{subfield}"
        const formattedSelector = event.selector
          ? `$Event{${event.selector.split('.').join('}{')}}`
          : '';

        return {
          name: event.name,
          tag: `${tag}:${event.tag}`,
          description: event.description,
          selector: formattedSelector,
          sample: parsedSample,
        };
      });

      // Use createWithEvents to create webhook and events in one orchestrated call
      const webhookData = await ductape.webhooks.createWithEvents(app.tag, {
        name,
        tag,
        description,
        envs: selectedEnvSlugs.map((slug: string) => ({ slug })),
        events: formattedEvents,
      });

      return webhookData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      queryClient.invalidateQueries({ queryKey: ['app', app?._id] });

      toast.success('Webhook created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create webhook');
    },
  });

  // Validate all events have required fields
  const areEventsValid = events.every((event) => {
    if (!event.name.trim() || !event.tag.trim()) return false;
    if (event.sample && event.sample.trim() !== '{}' && event.sample.trim() !== '' && !event.selector) {
      return false;
    }
    const validation = validateEventSample(event.sample);
    return validation.isValid;
  });

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error('Please enter name and tag');
      return;
    }

    if (selectedEnvSlugs.length === 0) {
      toast.error('Please select at least one environment');
      return;
    }

    if (events.length > 0 && !areEventsValid) {
      toast.error('Please complete all event fields correctly');
      return;
    }

    await createWebhook();
  };

  const isFormComplete = name.trim().length > 0 && tag.trim().length > 0 && selectedEnvSlugs.length > 0;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-grey-500 hover:text-grey -ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue/10">
                <Webhook className="h-6 w-6 text-blue" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">Create New Webhook</h1>
                <p className="text-sm text-grey-600">
                  Adding to {app.app_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">
                Webhook Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Payment Notifications"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-2"
                autoFocus
              />
              <p className="text-xs text-grey-600 mt-1">A friendly name for this webhook</p>
            </div>

            <div>
              <Label htmlFor="tag" className="required">
                Tag
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="tag"
                  placeholder="e.g., payment_notifications"
                  value={tag}
                  onChange={(e) =>
                    setTag(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, '_')
                        .replace(/_+/g, '_')
                    )
                  }
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={() => handleNameChange(name)} size="sm">
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600 mt-1">
                Unique identifier (auto-generated from name)
              </p>
            </div>

            <div>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Optional description for this webhook"
                label="Description"
              />
            </div>
          </div>
        </div>

        {/* Environments Section */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-grey">Environments</h2>
              <p className="text-xs text-grey-600">
                Select which environments should have webhook endpoints. Ductape will generate unique URLs for each.
              </p>
            </div>
          </div>

          {availableEnvs.length > 0 ? (
            <div className="space-y-2">
              {availableEnvs.map((env: any) => (
                <div
                  key={env.slug}
                  onClick={() => toggleEnvSlug(env.slug)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    selectedEnvSlugs.includes(env.slug)
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-300 hover:border-grey-400'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      selectedEnvSlugs.includes(env.slug) ? 'border-primary bg-primary' : 'border-grey-400'
                    )}
                  >
                    {selectedEnvSlugs.includes(env.slug) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-grey">{env.env_name || env.slug}</span>
                    <span className="text-xs text-grey-500 ml-2 font-mono">{env.slug}</span>
                  </div>
                  {selectedEnvSlugs.includes(env.slug) && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Link2 className="h-3 w-3" />
                      <span>URL will be generated</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-grey-50 rounded-lg border border-dashed border-grey-300">
              <Globe className="h-8 w-8 text-grey-400 mx-auto mb-2" />
              <p className="text-sm text-grey-600">No environments configured for this app</p>
              <p className="text-xs text-grey-500 mt-1">Add environments to the app first</p>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-lg font-semibold text-grey">Events (Optional)</h2>
                <p className="text-xs text-grey-600">
                  Define events that this webhook will emit. You can add more events later.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addEvent} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-6 bg-grey-50 rounded-lg border border-dashed border-grey-300">
              <Zap className="h-8 w-8 text-grey-400 mx-auto mb-2" />
              <p className="text-sm text-grey-600">No events defined yet</p>
              <p className="text-xs text-grey-500 mt-1">Events can be added now or later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => {
                const validation = validateEventSample(event.sample);
                return (
                  <div key={event.id} className="border border-grey-300 rounded-lg overflow-hidden">
                    {/* Event Header */}
                    <div
                      className="flex items-center justify-between p-3 bg-grey-50 cursor-pointer"
                      onClick={() => toggleEventExpanded(event.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-grey">{event.name || `Event ${index + 1}`}</span>
                        {event.tag && (
                          <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">
                            {tag}:{event.tag}
                          </code>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
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
                        {event.isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-grey-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-grey-500" />
                        )}
                      </div>
                    </div>

                    {/* Event Form */}
                    {event.isExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Event Name */}
                        <div>
                          <Label className="required text-xs">Event Name</Label>
                          <Input
                            placeholder="e.g., New Transaction"
                            value={event.name}
                            onChange={(e) => handleEventNameChange(event.id, e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        {/* Event Tag */}
                        <div>
                          <Label className="required text-xs">Event Tag</Label>
                          <Input
                            placeholder="e.g., new_transaction"
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
                            Full tag: <code className="text-primary">{tag}:{event.tag || 'event_tag'}</code>
                          </p>
                        </div>

                        {/* Event Description */}
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            placeholder="Describe when this event is triggered..."
                            value={event.description}
                            onChange={(e) => updateEvent(event.id, { description: e.target.value })}
                            className="mt-1"
                            rows={2}
                          />
                        </div>

                        {/* Sample Payload */}
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
                            placeholder='{"event": "new-transaction", "transaction_id": "123"}'
                            value={event.sample}
                            onChange={(e) => updateEvent(event.id, { sample: e.target.value })}
                            className={cn(
                              'mt-1 font-mono',
                              event.sample &&
                                event.sample.trim() !== '{}' &&
                                event.sample.trim() !== ''
                                ? validation.isValid
                                  ? 'border-green focus:border-green'
                                  : 'border-red focus:border-red'
                                : ''
                            )}
                            rows={4}
                          />
                        </div>

                        {/* Event Selector */}
                        {validation.isValid && validation.selectorOptions.length > 0 && (
                          <div>
                            <Label className="text-xs">Event Selector</Label>
                            <Select
                              value={event.selector}
                              onValueChange={(val) => updateEvent(event.id, { selector: val })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a field from sample" />
                              </SelectTrigger>
                              <SelectContent>
                                {validation.selectorOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {event.selector && (
                              <p className="text-xs text-grey-500 mt-1">
                                Selector:{' '}
                                <code className="text-primary">
                                  {`$Event{${event.selector.split('.').join('}{')}}`}
                                </code>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions at bottom of events section */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-grey-400">
            <Button variant="outline" onClick={onCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isCreating || !isFormComplete} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Webhook
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

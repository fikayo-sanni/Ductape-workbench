import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Webhook,
  Loader2,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  Link2,
  XCircle,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { useAuth } from "@/store/useAuth";
import { useWorkbenchStore } from "@/stores/workbench-store";
import { useDuctape } from "@/hooks/useDuctape";
import { MarkdownEditor } from "../ui/markdown-editor";
import { useTabState, getInitialTabState } from '@/hooks/useTabState';
import { cn } from "@/lib/utils";

interface NewWebhookTabContentProps {
  tabId: string;
  data?: any;
}

export default function NewWebhookTabContent({
  tabId,
  data,
}: NewWebhookTabContentProps) {
  const { closeTab, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  const app = data?.app || null;
  const product = data?.product || null;

  // Get available environments from the app
  const availableEnvs = app?.versions?.find((v: any) => v.latest)?.envs || app?.envs || [];

  // Restore saved state
  const savedTabState = getInitialTabState(tabId, null as any);

  const [name, setName] = useState(savedTabState?.name || "");
  const [tag, setTag] = useState(savedTabState?.tag || "");
  const [description, setDescription] = useState(savedTabState?.description || "");
  const [active] = useState(true); // Always active by default

  // Environment slugs for the webhook (Generate a link type)
  const [selectedEnvSlugs, setSelectedEnvSlugs] = useState<string[]>(
    savedTabState?.selectedEnvSlugs || availableEnvs.map((e: any) => e.slug)
  );

  // Events to create with the webhook
  interface WebhookEvent {
    id: string;
    name: string;
    tag: string;
    description: string;
    selector: string;
    sample: string;
    isExpanded: boolean;
  }
  const [events, setEvents] = useState<WebhookEvent[]>(savedTabState?.events || []);
  const [showEventsSection, setShowEventsSection] = useState(savedTabState?.showEventsSection || false);

  // Persist tab state automatically
  useTabState(
    tabId,
    'new-webhook',
    name || 'New Webhook Channel',
    {},
    { name, tag, description, selectedEnvSlugs, events, showEventsSection }
  );

  // Helper to add a new event
  const addEvent = () => {
    const newEvent: WebhookEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: "",
      tag: "",
      description: "",
      selector: "",
      sample: "{}",
      isExpanded: true,
    };
    setEvents([...events, newEvent]);
    setShowEventsSection(true);
  };

  // Helper to update an event
  const updateEvent = (id: string, updates: Partial<WebhookEvent>) => {
    setEvents(events.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  // Helper to remove an event
  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  // Helper to toggle event expansion
  const toggleEventExpanded = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, isExpanded: !e.isExpanded } : e));
  };

  // Auto-generate event tag from name
  const handleEventNameChange = (id: string, value: string) => {
    const sanitizedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
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
      const traverse = (obj: any, path: string = "") => {
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return;
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value !== "object" || value === null) {
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
      setSelectedEnvSlugs(selectedEnvSlugs.filter(s => s !== slug));
    } else {
      setSelectedEnvSlugs([...selectedEnvSlugs, slug]);
    }
  };

  // Initialize Ductape SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || "",
    user_id: user?._id || "",
    token: user?.auth_token || "",
    public_key: user?.public_key || "",
    type: app ? "app" : "product",
  }) as any;

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-fill description
    setDescription(value);
    // Auto-generate tag
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    setTag(sanitized);
  };

  const formatEventsForCreate = (webhookTag: string, eventsToFormat: WebhookEvent[]) => {
    return eventsToFormat
      .filter((e) => e.name.trim() && e.tag.trim() && e.selector)
      .map((event) => {
        let parsedSample = {};
        try {
          parsedSample = JSON.parse(event.sample);
        } catch {
          // Use empty object if invalid
        }

        const formattedSelector = `$Event{${event.selector.split('.').join('}{')}}`;

        return {
          name: event.name,
          tag: `${webhookTag}:${event.tag}`,
          description: event.description,
          selector: formattedSelector,
          sample: parsedSample,
        };
      });
  };

  const { mutateAsync: createWebhook, isPending: isCreating } = useMutation({
    mutationFn: async (payload: any) => {
      if (!ductape) throw new Error("Ductape not initialized");

      const contextTag = app ? app.tag : product?.tag;
      if (!contextTag) throw new Error("App or Product tag not found");

      await ductape.init(contextTag);

      const formattedEvents = formatEventsForCreate(payload.tag, payload.events || []);

      return ductape.webhooks.createWithEvents(contextTag, {
        name: payload.name,
        tag: payload.tag,
        description: payload.description,
        envs: payload.envs.map((slug: string) => ({ slug })),
        events: formattedEvents,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });

      const eventErrors = result?.eventErrors || [];
      const createdCount = result?.events?.length || 0;

      if (eventErrors.length > 0) {
        toast.error(
          `Webhook created with ${createdCount} event(s). ${eventErrors.length} event(s) failed — check sample payload and selector fields.`
        );
      } else {
        toast.success("Webhook Channel created successfully!");
      }

      closeTab(tabId);

      // Open/focus the app tab and refresh its content
      const appId = app?._id;
      const appTabId = `app-${appId}`;

      // Invalidate all app-related queries to refresh the content
      queryClient.invalidateQueries({ queryKey: ["app"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.refetchQueries({ queryKey: ["app", appId] });

      openTab({
        id: appTabId,
        type: "app",
        title: app?.app_name || "App",
        itemId: appId,
        data: {
          appId: appId,
          appName: app?.app_name,
          appTag: app?.tag,
          appLogo: app?.logo,
          refresh: true, // Signal to refresh the tab content
        },
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create webhook");
    },
  });

  // Check if all steps are complete
  const isFormComplete =
    name.trim().length > 0 &&
    tag.trim().length > 0 &&
    selectedEnvSlugs.length > 0;

  // Validate all events have required fields
  const areEventsValid = events.every(event => {
    if (!event.name.trim() || !event.tag.trim()) return false;

    const validation = validateEventSample(event.sample);
    if (!validation.isValid) return false;
    if (validation.selectorOptions.length === 0) return false;
    if (!event.selector) return false;

    return true;
  });

  const handleSave = async () => {
    if (!name.trim() || !tag.trim()) {
      toast.error("Please enter name and tag");
      return;
    }

    if (selectedEnvSlugs.length === 0) {
      toast.error("Please select at least one environment");
      return;
    }

    if (events.length > 0 && !areEventsValid) {
      toast.error("Each event needs a name, tag, sample payload with fields, and a selector");
      return;
    }

    await createWebhook({
      name,
      tag,
      description,
      active,
      envs: selectedEnvSlugs,
      events,
    });
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Product/App Context */}
        {(product || app) && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {(app?.logo || product?.logo) ? (
                  <img
                    src={app?.logo || product?.logo}
                    alt={app?.app_name || product?.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  (app?.app_name || product?.name)?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Creating webhook channel for {app?.app_name || product?.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {app?.tag || product?.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This webhook channel will be automatically connected to your {app ? 'app' : 'product'} and configured for its environments
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Webhook className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-grey">
                Create New Webhook Channel
              </h1>
              <p className="text-sm text-grey-600">
                {product?.name
                  ? `Adding to ${product.name}`
                  : app
                  ? `Adding to ${app.app_name}`
                  : "Configure webhook channel endpoints for your integration"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-6">
          {/* Webhook Channel Name */}
          <div>
            <Label htmlFor="name" className="required">
              Webhook Channel Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., User Registration Webhook Channel"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-2"
              autoFocus
            />
            <p className="text-xs text-grey-600 mt-1">A descriptive name for this webhook channel</p>
          </div>

          {/* Tag */}
          <div>
            <Label htmlFor="tag" className="required">
              Tag
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tag"
                placeholder="e.g., user_registration"
                value={tag}
                onChange={(e) =>
                  setTag(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "_")
                      .replace(/_+/g, "_")
                  )
                }
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleNameChange(name)}
                size="sm"
              >
                Auto-generate
              </Button>
            </div>
            <p className="text-xs text-grey-600 mt-1">
              Auto-generated from name (lowercase, underscores only)
            </p>
          </div>

          {/* Description */}
          <div>
            <MarkdownEditor
              value={description}
              onChange={(e) => setDescription(e)}
              placeholder="Optional description for this webhook channel"
              label="Description"
            />
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
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedEnvSlugs.includes(env.slug)
                      ? "border-primary bg-primary/5"
                      : "border-grey-300 hover:border-grey-400"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    selectedEnvSlugs.includes(env.slug)
                      ? "border-primary bg-primary"
                      : "border-grey-400"
                  )}>
                    {selectedEnvSlugs.includes(env.slug) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEvent}
              className="gap-1"
            >
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
                  <div
                    key={event.id}
                    className="border border-grey-300 rounded-lg overflow-hidden"
                  >
                    {/* Event Header */}
                    <div
                      className="flex items-center justify-between p-3 bg-grey-50 cursor-pointer"
                      onClick={() => toggleEventExpanded(event.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-grey">
                          {event.name || `Event ${index + 1}`}
                        </span>
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
                                  .replace(/[^a-z0-9_]/g, "_")
                                  .replace(/_+/g, "_"),
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
                            {event.sample && event.sample.trim() !== '{}' && event.sample.trim() !== '' && (
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
                              "mt-1 font-mono text-xs",
                              event.sample && event.sample.trim() !== '{}' && event.sample.trim() !== ''
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
                                Selector: <code className="text-primary">$Event&#123;{event.selector.split(".").join("}{")}&#125;</code>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEvent}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey-400">
          <Button
            type="button"
            variant="outline"
            onClick={() => closeTab(tabId)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isCreating || !isFormComplete}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Webhook Channel
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

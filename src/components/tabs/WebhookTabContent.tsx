import { useState, useMemo } from "react";
import {
  Webhook,
  Copy,
  Check,
  Info,
  Zap,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
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
import DetailsSidebar from "@/components/DetailsSidebar";

interface WebhookTabContentProps {
  webhook: IWebhook;
}

export default function WebhookTabContent({ webhook }: WebhookTabContentProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);

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
    // Auto-generate tag
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    setEventTag(sanitized);
    // Auto-generate description
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

  // Parse sample payload and extract selector options with aggressive validation
  const sampleValidation = useMemo(() => {
    // Skip validation for empty or default JSON
    if (!eventSample || eventSample.trim() === '' || eventSample.trim() === '{}') {
      return { isValid: true, error: null, selectorOptions: [] as string[] };
    }

    try {
      const sample = JSON.parse(eventSample);
      const options: string[] = [];

      const traverse = (
        obj: any,
        path: string = "",
        parentIsArray: boolean = false
      ) => {
        if (typeof obj !== "object" || obj === null) return;
        // Skip array children
        if (parentIsArray) return;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const isArray = Array.isArray(value);
          const isObject =
            typeof value === "object" && value !== null && !isArray;

          // Only add non-object, non-array keys
          if (!isObject && !isArray) {
            options.push(currentPath);
          }

          // Traverse nested objects
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

      // Parse sample JSON
      let parsedSample;
      try {
        parsedSample = JSON.parse(payload.sample);
      } catch (e) {
        throw new Error("Invalid JSON in sample payload");
      }

      // Format selector: convert "field.subfield" to "$Event{field}{subfield}"
      const formattedSelector = payload.selector
        ? `$Event{${payload.selector.split(".").join("}{")}}`
        : "";

      // Assuming we have app context from webhook
      const appTag = (webhook as any)?.appTag || (webhook as any)?.app?.tag;
      if (!appTag) throw new Error("App tag not found");

      await (ductape as any).init(appTag);

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
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["webhook", webhook.tag] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events", webhook.tag] });
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

  // Fetch events using SDK
  const { data: events = [] } = useQuery({
    queryKey: ["webhook-events", webhook.tag],
    queryFn: async () => {
      if (!ductape) throw new Error("Ductape not initialized");

      const appTag = (webhook as any)?.appTag || (webhook as any)?.app?.tag;
      if (!appTag) throw new Error("App tag not found");

      await (ductape as any).init(appTag);
      const eventsData = await (ductape as any).webhooks.events.fetchAll(webhook.tag);

      return eventsData as IWebhookEvent[];
    },
    enabled: !!ductape && !!webhook.tag,
  });

  // Find selected event from fetched events
  const selectedEvent = events?.find(
    (event) => event._id === selectedEventId
  );

  // Extract app/product info for context header
  const app = (webhook as any)?.app;
  const appName = (webhook as any)?.appName || app?.app_name;
  const appTag = (webhook as any)?.appTag || app?.tag;
  const appLogo = (webhook as any)?.appLogo || app?.logo;

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* App Context Header */}
          {(appName || app) && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                  {appLogo ? (
                    <img
                      src={appLogo}
                      alt={appName}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    appName?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-grey">Webhook Channel for {appName}</h2>
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                      {appTag}
                    </span>
                  </div>
                  <p className="text-sm text-grey-600">
                    This webhook channel is connected to your app and configured for its environments
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
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Webhook className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-grey">{webhook.name}</h1>
                  
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-grey-600">
                    Tag: <span className="font-mono">{webhook.tag}</span>
                  </span>
                  {webhook.active !== undefined && (
                    <>
                      <span className="text-grey-400">•</span>
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center gap-1.5",
                          webhook.active ? "text-green" : "text-grey-600"
                        )}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            webhook.active ? "bg-green" : "bg-grey-400"
                          )}
                        />
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

          {/* Environments */}
          {webhook.envs && webhook.envs.length > 0 && (
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-grey mb-1">
                Registration Endpoints
              </h2>
              <p className="text-xs text-grey-600 mb-4">
                Partners can register their webhook endpoint using these URLs to
                receive event notifications
              </p>
              <div className="space-y-3">
                {webhook.envs.map((env, index) => (
                  <div
                    key={index}
                    className="border border-grey-300 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-medium text-grey">
                        {env.slug.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                        {env.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-grey font-mono break-all bg-grey-50 px-3 py-2 rounded">
                        {env.registration_url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(env.registration_url, "Registration URL")
                        }
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        {copiedText === env.registration_url ? (
                          <Check className="h-3 w-3 text-green" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events List */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">
                Events ({events.length})
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewEventDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                <p className="text-sm text-grey-600 mb-1">
                  No events configured yet
                </p>
                <p className="text-xs text-grey-500">
                  Events will appear here once configured
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event._id}
                    className="w-full p-3 rounded-lg border border-grey-400 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-medium text-grey text-sm">
                          {event.name}
                        </span>
                        <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">
                          {`${webhook.tag}:${event.tag}`}
                        </code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEventId(event._id)}
                        className="flex items-center gap-1.5 text-grey hover:text-primary"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span className="text-xs">Details</span>
                      </Button>
                    </div>
                    {event.description && (
                      <p className="text-xs text-grey-600 mt-2 ml-6">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Webhook Channels</h3>
            <p className="text-xs text-blue-800">
              Webhook channels provide a single point of registration for multiple events. Partners can register their endpoint once and receive notifications for all configured events. Events are identified using the <code className="bg-blue-100 px-1 rounded">webhook:event</code> tag format and routed based on event selectors.
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
                <Label className="text-sm font-semibold text-grey mb-2 block">
                  Event Name
                </Label>
                <p className="text-sm text-grey">
                  {selectedEvent.name}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-grey">
                    Event Tag
                  </Label>
                  <Button
                    onClick={() =>
                      handleCopy(
                        `${webhook.tag}:${selectedEvent.tag}`,
                        "Event tag"
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
                <Input
                  value={`${webhook.tag}:${selectedEvent.tag}`}
                  readOnly
                  className="font-mono text-sm bg-grey-50"
                />
                <p className="text-xs text-grey-500 mt-2">
                  Use this tag to identify the event in your code
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-grey mb-2 block">
                  Description
                </Label>
                <p className="text-sm text-grey">{selectedEvent.description}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold text-grey mb-2 block">
                  Event Selector
                </Label>
                <Input
                  value={`${selectedEvent.selector}${selectedEvent.selectorValue ? ` = ${selectedEvent.selectorValue}` : ''}`}
                  readOnly
                  className="font-mono text-sm bg-grey-50"
                />
                <p className="text-xs text-grey-500 mt-2">
                  The key path used to identify this event type from incoming
                  payloads. Example:{" "}
                  <code className="text-primary">$Event&#123;event&#125;</code>{" "}
                  maps to the "event" field.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-grey">
                    Sample Payload
                  </Label>
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
                  value={typeof selectedEvent.sample === "string"
                    ? selectedEvent.sample
                    : JSON.stringify(selectedEvent.sample, null, 2)}
                  readOnly
                  className="font-mono text-sm bg-grey-50 resize-none"
                  rows={(typeof selectedEvent.sample === "string"
                    ? selectedEvent.sample
                    : JSON.stringify(selectedEvent.sample, null, 2)).split('\n').length}
                />
                <p className="text-xs text-grey-500 mt-2">
                  Example payload structure that will be sent when this event is
                  triggered
                </p>
              </div>
            </div>
        </DetailsSidebar>
      )}

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new event to the {webhook.name} webhook channel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Name */}
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
              <p className="text-xs text-grey-600 mt-1">
                A descriptive name for this event
              </p>
            </div>

            {/* Event Tag */}
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
                      .replace(/[^a-z0-9_]/g, "_")
                      .replace(/_+/g, "_")
                  )
                }
                className="mt-2 font-mono"
              />
              <p className="text-xs text-grey-600 mt-1">
                Will be combined with webhook tag:{" "}
                <code className="text-primary">
                  {webhook.tag}:{eventTag || "event_tag"}
                </code>
              </p>
            </div>

            {/* Description */}
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

            {/* Sample Payload */}
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
                        <span className="text-xs text-green font-medium">Valid JSON</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red" />
                        <span className="text-xs text-red font-medium">Invalid JSON</span>
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
                  "mt-2 font-mono text-xs min-h-[150px]",
                  eventSample && eventSample.trim() !== '{}' && eventSample.trim() !== ''
                    ? sampleValidation.isValid
                      ? 'border-green focus:border-green focus:ring-green'
                      : 'border-red focus:border-red focus:ring-red'
                    : ''
                )}
                rows={6}
              />
              {!sampleValidation.isValid && eventSample && eventSample.trim() !== '{}' && eventSample.trim() !== '' && (
                <p className="text-xs text-red mt-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {sampleValidation.error}
                </p>
              )}
              {sampleValidation.isValid && sampleValidation.selectorOptions.length === 0 && eventSample.trim() !== '{}' && eventSample.trim() !== '' && (
                <p className="text-xs text-orange-600 mt-1">
                  Warning: No valid selector fields found. Add non-object, non-array fields.
                </p>
              )}
              {(!eventSample || eventSample.trim() === '' || eventSample.trim() === '{}') && (
                <p className="text-xs text-grey-600 mt-1">
                  Example payload structure in JSON format
                </p>
              )}
            </div>

            {/* Selector */}
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
                    <div className="px-2 py-1.5 text-sm text-grey-600">
                      Invalid JSON in sample payload
                    </div>
                  ) : sampleValidation.selectorOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-grey-600">
                      No valid fields available. Add a valid sample payload first.
                    </div>
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
                  Preview:{" "}
                  <code className="text-primary">
                    $Event&#123;{eventSelector.split(".").join("}{")}&#125;
                  </code>
                </p>
              )}
              {!eventSelector && (
                <p className="text-xs text-grey-600 mt-1">
                  Select a field from the sample payload to identify this event type
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
            <Button
              onClick={handleCreateEvent}
              disabled={isCreatingEvent}
              className="gap-2"
            >
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

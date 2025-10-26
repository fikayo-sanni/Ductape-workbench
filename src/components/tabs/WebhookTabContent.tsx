import { useState } from 'react';
import { Webhook, ChevronRight, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { IWebhook, IWebhookEvent } from '@/types/webhook';

interface WebhookTabContentProps {
  webhook: IWebhook;
}

export default function WebhookTabContent({ webhook }: WebhookTabContentProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedEvent = webhook.events?.find(
    (event) => event._id === selectedEventId
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const events: IWebhookEvent[] = webhook?.events || [];

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-grey-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Webhook className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-grey">{webhook.name}</h1>
                  {webhook.active !== undefined && (
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        webhook.active
                          ? 'bg-green/10 text-green'
                          : 'bg-grey-400 text-grey-600'
                      )}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-grey-600 mb-3">{webhook.tag}</p>
                {webhook.description && (
                  <p className="text-grey-600">{webhook.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Environments */}
          {webhook.envs && webhook.envs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Environments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhook.envs.map((env, index) => (
                    <div
                      key={index}
                      className="p-4 border border-grey-400 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-grey">
                          {env.slug.toUpperCase()}
                        </h3>
                        <span className="px-2 py-1 bg-grey-100 rounded text-xs font-medium">
                          {env.method}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-grey-600 mb-1">Registration URL</p>
                        <p className="text-sm text-grey font-mono break-all">
                          {env.registration_url}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Events ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Webhook className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                  <p className="text-sm text-grey-600 mb-2">No events configured yet</p>
                  <p className="text-xs text-grey-500">
                    Events are triggered by the webhook and send data to your configured endpoints
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <button
                      key={event._id}
                      onClick={() => setSelectedEventId(event._id)}
                      className={cn(
                        'w-full p-4 rounded-lg border transition-colors text-left',
                        'hover:border-primary hover:bg-primary/5',
                        selectedEventId === event._id
                          ? 'border-primary bg-primary/10'
                          : 'border-grey-400 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Webhook className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-grey">
                              {event.name}
                            </h3>
                            <p className="text-xs text-grey-600 mt-1">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                                {`${webhook.tag}:${event.tag}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-5 w-5 transition-transform',
                            selectedEventId === event._id && 'rotate-90'
                          )}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Side Panel - Event Details */}
      {selectedEvent && (
        <div className="w-[400px] border-l border-grey-400 bg-white overflow-auto">
          <div className="p-6 space-y-6">
            {/* Close Button */}
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEventId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Event Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs text-grey-600 font-medium mb-2">Event Name</h3>
                <p className="text-sm font-semibold text-grey">{selectedEvent.name}</p>
              </div>

              <div>
                <h3 className="text-xs text-grey-600 font-medium mb-2">Tag</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">
                    {`${webhook.tag}:${selectedEvent.tag}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${webhook.tag}:${selectedEvent.tag}`, 'Tag')}
                    className="h-6 w-6 p-0"
                  >
                    {copiedText === `${webhook.tag}:${selectedEvent.tag}` ? (
                      <Check className="h-3 w-3 text-green" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-xs text-grey-600 font-medium mb-2">Description</h3>
                <p className="text-sm text-grey">{selectedEvent.description}</p>
              </div>

              <div>
                <h3 className="text-xs text-grey-600 font-medium mb-2">Selector</h3>
                <p className="text-sm text-grey font-mono">
                  {selectedEvent.selector}
                  {selectedEvent.selectorValue && ` = ${selectedEvent.selectorValue}`}
                </p>
              </div>

              <div>
                <h3 className="text-xs text-grey-600 font-medium mb-2">Sample Payload</h3>
                <div className="mt-2 p-4 bg-grey-100 rounded-lg border border-grey-400">
                  <pre className="text-xs text-grey font-mono overflow-x-auto whitespace-pre-wrap break-words">
                    <code>
                      {typeof selectedEvent.sample === 'string'
                        ? selectedEvent.sample
                        : JSON.stringify(selectedEvent.sample, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


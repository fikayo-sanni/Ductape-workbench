import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CodeSidebar from '@/components/CodeSidebar';
import { IWebhookEvent } from '@/types/webhook';
import { formatSelector, parseEventSelectors } from '@/components/webhook-explorer/utils';
import { getEventSampleText, getFullEventTag } from './event-sample';
import toast from 'react-hot-toast';

interface EventSampleSidebarProps {
  webhookTag: string;
  webhookName?: string;
  event: IWebhookEvent;
  onClose: () => void;
  onAddEvents?: () => void;
  onDeleteEvent?: () => void;
}

function EventDetailsFields({
  event,
  fullTag,
}: {
  event: IWebhookEvent;
  fullTag: string;
}) {
  const selectorStr = (event as { selector?: string }).selector || '';
  const selectors = parseEventSelectors(selectorStr);
  const selectorValue = (event as { selectorValue?: unknown }).selectorValue;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-grey-700">Full tag</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 h-7 px-2 text-xs"
            onClick={() => copy(fullTag, 'Event tag')}
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        <Input value={fullTag} readOnly className="font-mono text-sm bg-grey-50" />
      </div>

      <div>
        <Label className="text-sm font-semibold text-grey-700 mb-2 block">Selectors</Label>
        {selectors.length === 0 ? (
          <p className="text-sm text-grey-500">No selectors configured</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectors.map((sel, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-grey-100 border border-grey-200 text-xs font-mono text-grey-700"
              >
                {formatSelector(sel)}
                {selectors.length === 1 &&
                  selectorValue != null &&
                  typeof selectorValue !== 'object' && (
                    <span className="text-green font-sans font-medium">= {String(selectorValue)}</span>
                  )}
              </span>
            ))}
          </div>
        )}
        {selectors.length > 1 && selectorValue != null && typeof selectorValue === 'object' && (
          <pre className="mt-2 text-xs font-mono bg-grey-50 border border-grey-200 rounded-md p-2 overflow-auto max-h-32">
            {JSON.stringify(selectorValue, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function EventSampleSidebar({
  webhookTag,
  webhookName,
  event,
  onClose,
  onAddEvents,
  onDeleteEvent,
}: EventSampleSidebarProps) {
  const fullTag = getFullEventTag(webhookTag, event);
  const sampleText = getEventSampleText(event);

  return (
    <CodeSidebar
      panelTitle="Event details"
      title={event.name}
      subtitle={
        event.description ||
        (webhookName ? `Webhook · ${webhookName}` : undefined)
      }
      tag={fullTag}
      onClose={onClose}
      additionalControls={
        <>
          <EventDetailsFields event={event} fullTag={fullTag} />
          {(onAddEvents || onDeleteEvent) && (
            <div className="flex flex-col gap-2">
              {onAddEvents && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={onAddEvents}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add events
                </Button>
              )}
              {onDeleteEvent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-red border-red/30 hover:bg-red/5 hover:text-red"
                  onClick={onDeleteEvent}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete event
                </Button>
              )}
            </div>
          )}
        </>
      }
      staticSections={[{ title: 'Sample payload', code: sampleText }]}
    />
  );
}

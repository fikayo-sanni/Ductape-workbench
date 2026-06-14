import { Zap, Copy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IWebhookEvent } from '@/types/webhook';
import { formatSelector, parseEventSelectors } from './utils';

interface WebhookExplorerEventPanelProps {
  webhookTag: string;
  selectedEvent: IWebhookEvent | undefined;
  onAddEvent: () => void;
  onCopy: (text: string, label: string) => void;
  searchQuery: string;
  hasEvents: boolean;
  /** App tab uses primary/purple; explorer uses amber */
  accent?: 'app' | 'explorer';
}

export function WebhookExplorerEventPanel({
  webhookTag,
  selectedEvent,
  onAddEvent,
  onCopy,
  searchQuery,
  hasEvents,
  accent = 'explorer',
}: WebhookExplorerEventPanelProps) {
  const emptyIconClass =
    accent === 'app'
      ? 'bg-purple-500/10 border-purple-500/20'
      : 'bg-amber-500/10 border-amber-500/20';
  const emptyZapClass = accent === 'app' ? 'text-purple-600' : 'text-amber-600';
  const listHint =
    accent === 'app'
      ? 'Choose an event from the list on the left.'
      : 'Choose an event from the list to view its selector and sample payload.';

  if (!selectedEvent) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-grey-50/50">
        <div className="text-center max-w-sm">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4',
              emptyIconClass
            )}
          >
            <Zap className={cn('h-8 w-8', emptyZapClass)} />
          </div>
          <h3 className="text-base font-semibold text-grey mb-1">
            {searchQuery ? 'No matching events' : hasEvents ? 'Select an event' : 'No events yet'}
          </h3>
          <p className="text-sm text-grey-500 mb-5">
            {searchQuery
              ? 'Try a different search term.'
              : hasEvents
                ? listHint
                : 'Events define how incoming payloads are identified and routed.'}
          </p>
          {!searchQuery && (
            <Button type="button" onClick={onAddEvent} className="gap-2">
              <Plus className="h-4 w-4" />
              {hasEvents ? 'Add event' : 'Create first event'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const selectorStr = (selectedEvent as { selector?: string }).selector || '';
  const selectors = parseEventSelectors(selectorStr);
  const selectorValue = (selectedEvent as { selectorValue?: unknown }).selectorValue;
  const sampleText =
    typeof selectedEvent.sample === 'string'
      ? selectedEvent.sample
      : JSON.stringify(selectedEvent.sample, null, 2);

  return (
    <div className="flex-1 overflow-auto bg-grey-50/30">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-grey">{selectedEvent.name}</h2>
            <code className="text-sm font-mono text-grey-500 mt-0.5 block">
              {webhookTag}:{selectedEvent.tag}
            </code>
            {selectedEvent.description && (
              <p className="text-sm text-grey-600 mt-2">{selectedEvent.description}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-grey-300 bg-white p-5 shadow-sm space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-grey-600 uppercase tracking-wide">Full tag</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onCopy(`${webhookTag}:${selectedEvent.tag}`, 'Event tag')}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
            <Input value={`${webhookTag}:${selectedEvent.tag}`} readOnly className="font-mono text-sm bg-grey-50" />
          </div>

          <div>
            <Label className="text-xs font-semibold text-grey-600 uppercase tracking-wide mb-2 block">
              Selectors
            </Label>
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
              <pre className="mt-2 text-xs font-mono bg-grey-50 border border-grey-200 rounded-md p-2 overflow-auto">
                {JSON.stringify(selectorValue, null, 2)}
              </pre>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-grey-600 uppercase tracking-wide">Sample payload</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onCopy(sampleText, 'Sample payload')}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
            <Textarea
              value={sampleText}
              readOnly
              className="font-mono text-xs bg-grey-50 resize-none min-h-[200px]"
              rows={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

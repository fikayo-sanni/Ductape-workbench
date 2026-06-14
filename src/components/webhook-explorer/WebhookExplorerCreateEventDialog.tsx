import { Check, XCircle, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface WebhookExplorerCreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookName: string;
  webhookTag: string;
  eventName: string;
  eventTag: string;
  eventDescription: string;
  eventSelector: string;
  eventSample: string;
  onEventNameChange: (value: string) => void;
  onEventTagChange: (value: string) => void;
  onEventDescriptionChange: (value: string) => void;
  onEventSelectorChange: (value: string) => void;
  onEventSampleChange: (value: string) => void;
  sampleValidation: {
    isValid: boolean;
    selectorOptions: string[];
  };
  isCreating: boolean;
  onCreate: () => void;
  onCancel: () => void;
}

export function WebhookExplorerCreateEventDialog({
  open,
  onOpenChange,
  webhookName,
  webhookTag,
  eventName,
  eventTag,
  eventDescription,
  eventSelector,
  eventSample,
  onEventNameChange,
  onEventTagChange,
  onEventDescriptionChange,
  onEventSelectorChange,
  onEventSampleChange,
  sampleValidation,
  isCreating,
  onCreate,
  onCancel,
}: WebhookExplorerCreateEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>Add a new event to {webhookName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="event-name" className="required">
              Event name
            </Label>
            <Input
              id="event-name"
              placeholder="e.g., New Transaction"
              value={eventName}
              onChange={(e) => onEventNameChange(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="event-tag" className="required">
              Event tag
            </Label>
            <Input
              id="event-tag"
              placeholder="e.g., new_transaction"
              value={eventTag}
              onChange={(e) => onEventTagChange(e.target.value)}
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-grey-500 mt-1">
              Full tag: <code className="text-primary">{webhookTag}:{eventTag || 'event_tag'}</code>
            </p>
          </div>

          <div>
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => onEventDescriptionChange(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="event-sample" className="required">
                Sample payload (JSON)
              </Label>
              {eventSample && eventSample.trim() !== '{}' && eventSample.trim() !== '' && (
                <span className="flex items-center gap-1 text-xs">
                  {sampleValidation.isValid ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green" />
                      <span className="text-green">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-red" />
                      <span className="text-red">Invalid</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <Textarea
              id="event-sample"
              value={eventSample}
              onChange={(e) => onEventSampleChange(e.target.value)}
              className={cn(
                'font-mono text-xs min-h-[120px]',
                eventSample && eventSample.trim() !== '{}' && !sampleValidation.isValid && 'border-red'
              )}
              rows={5}
            />
          </div>

          <div>
            <Label className="required">Event selector</Label>
            <Select value={eventSelector} onValueChange={onEventSelectorChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a field from sample" />
              </SelectTrigger>
              <SelectContent>
                {!sampleValidation.isValid ? (
                  <div className="px-2 py-1.5 text-sm text-grey-600">Invalid JSON</div>
                ) : sampleValidation.selectorOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-grey-600">Add sample fields first</div>
                ) : (
                  sampleValidation.selectorOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="button" onClick={onCreate} disabled={isCreating} className="gap-2">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create event
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

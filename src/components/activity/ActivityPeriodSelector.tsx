import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ActivityPeriodPreset } from '@/lib/activity-period';

const PERIOD_OPTIONS: { id: ActivityPeriodPreset; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '1m', label: '1 month' },
  { id: '6m', label: '6 months' },
  { id: 'custom', label: 'Custom' },
];

export interface ActivityPeriodValue {
  period: ActivityPeriodPreset;
  customStart: string;
  customEnd: string;
}

interface ActivityPeriodSelectorProps extends ActivityPeriodValue {
  onChange: (next: ActivityPeriodValue) => void;
  className?: string;
}

/** The period control shared by the activity timeline and the metrics that sit above it. */
export function ActivityPeriodSelector({ period, customStart, customEnd, onChange, className }: ActivityPeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(customStart);
  const [draftEnd, setDraftEnd] = useState(customEnd);

  const apply = () => {
    if (draftStart && draftEnd && draftStart <= draftEnd) {
      onChange({ period: 'custom', customStart: draftStart, customEnd: draftEnd });
      setOpen(false);
    }
  };

  return (
    <div className={cn('flex rounded-lg border border-grey-300 overflow-hidden', className)}>
      {PERIOD_OPTIONS.map((opt) =>
        opt.id === 'custom' ? (
          <Popover key={opt.id} open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('rounded-none h-8 px-3 text-xs', period === 'custom' && 'bg-primary/10 text-primary')}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {opt.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium text-grey">Custom range</p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-grey-600">
                    Start
                    <Input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="mt-1" />
                  </label>
                  <label className="text-xs text-grey-600">
                    End
                    <Input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="mt-1" />
                  </label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={apply}
                  disabled={!draftStart || !draftEnd || draftStart > draftEnd}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            key={opt.id}
            type="button"
            variant="ghost"
            size="sm"
            className={cn('rounded-none h-8 px-3 text-xs', period === opt.id && 'bg-primary/10 text-primary')}
            onClick={() => onChange({ period: opt.id, customStart, customEnd })}
          >
            {opt.label}
          </Button>
        ),
      )}
    </div>
  );
}

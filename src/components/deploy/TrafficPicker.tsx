import { Input } from '@/components/ui/input';
import { TRAFFIC_PRESETS, describeTrafficChange, validateTraffic } from '@/utils/deployControls';
import { cn } from '@/lib/utils';
import { Field, Note } from './controls';

/** Choose how much traffic a release receives: a few common steps, or any whole number. What the choice means is said in words. */
export default function TrafficPicker({
  value, onChange, from,
}: { value: string; onChange: (next: string) => void; from?: number }) {
  const checked = validateTraffic(value);
  return (
    <Field label="Traffic to this release" htmlFor="traffic-percent" hint={!checked.ok || from !== undefined ? undefined : 'The rest, if any, keeps going to the last good release.'}>
      <div className="flex flex-wrap items-center gap-1.5">
        {TRAFFIC_PRESETS.map((preset) => (
          <button
            key={preset} type="button" onClick={() => onChange(String(preset))} aria-pressed={checked.ok && checked.value === preset}
            className={cn('h-8 rounded-md border px-2.5 text-xs', checked.ok && checked.value === preset ? 'border-primary bg-primary/10 text-primary' : 'border-grey-400 text-grey-600 hover:bg-grey-100')}
          >
            {preset}%
          </button>
        ))}
        <Input id="traffic-percent" aria-label="Traffic percent" inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-20 text-xs" />
      </div>
      {!checked.ok ? <Note tone="bad">{checked.error}</Note> : from !== undefined ? <Note tone={describeTrafficChange(from, checked.value).tone}>{describeTrafficChange(from, checked.value).text}</Note> : null}
    </Field>
  );
}

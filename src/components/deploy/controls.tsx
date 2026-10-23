import type { ReactNode, SelectHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IControl } from '@/utils/deployControls';
import type { Tone } from '@/utils/deployments';

const NOTE_TONE: Record<Tone, string> = {
  good: 'border-green/30 bg-green/5 text-green',
  bad: 'border-red/30 bg-red/5 text-red',
  warn: 'border-orange/30 bg-orange/5 text-orange',
  info: 'border-primary/30 bg-primary/5 text-primary',
  neutral: 'border-grey-300 bg-grey-100 text-grey-600',
};

/** A short message in a tinted box, for what a person should know before they act. */
export function Note({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <p role={tone === 'bad' ? 'alert' : undefined} className={cn('rounded-md border px-3 py-2 text-xs leading-relaxed', NOTE_TONE[tone], className)}>{children}</p>;
}

/**
 * A button driven by a control. When the control is off the button is disabled and the reason is shown next to it in words, not
 * hidden in a tooltip, so nobody has to hover to learn why something cannot be done.
 */
export function ControlButton({
  control, busy, children, showReason = true, ...props
}: { control: IControl; busy?: boolean; showReason?: boolean; children: ReactNode } & Omit<ButtonProps, 'disabled'>) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button {...props} disabled={!control.enabled || busy} title={control.enabled ? undefined : control.reason}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {children}
      </Button>
      {!control.enabled && showReason && control.reason ? <span className="max-w-xs text-[11px] leading-snug text-grey-500">{control.reason}</span> : null}
    </span>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-grey">{label}</label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-grey-500">{hint}</p> : null}
    </div>
  );
}

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn('h-9 w-full rounded-md border border-grey-400 bg-white px-3 text-sm text-grey focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60', className)}
    />
  );
}

export const when = (value: string | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

import type { ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for product sections that are not plain resource lists
 * (Functions, Rate Limits, Observability). They reproduce the look of the standard
 * asset pages in ProductTabContent: a sticky white header with an icon tile, then a
 * centred body made of white bordered cards.
 */

export interface SectionTint {
  /** Icon tile background, e.g. "bg-teal-600/10". */
  bg: string;
  /** Icon colour, e.g. "text-teal-600". */
  text: string;
}

export const TEAL: SectionTint = { bg: 'bg-teal-600/10', text: 'text-teal-600' };

export function SectionPage({
  icon: Icon,
  tint,
  title,
  subtitle,
  actions,
  toolbar,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  tint: SectionTint;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Optional second row inside the sticky header (tabs, filters). */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b border-grey-300 bg-white dark:bg-background">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-sm sm:h-11 sm:w-11 md:h-12 md:w-12', tint.bg)}>
                <Icon className={cn('h-5 w-5 md:h-6 md:w-6', tint.text)} />
              </div>
              <div>
                <h1 className="text-base font-bold text-grey sm:text-lg md:text-xl">{title}</h1>
                {subtitle ? <p className="text-xs text-grey-500 sm:text-sm">{subtitle}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex items-center gap-2 sm:gap-3">{actions}</div> : null}
          </div>
          {toolbar ? <div className="mt-3 sm:mt-4">{toolbar}</div> : null}
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-6 md:px-6">{children}</div>
    </div>
  );
}

/** White bordered card with an optional title row, same chrome as the overview cards. */
export function Panel({
  title,
  description,
  action,
  children,
  flush,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Remove body padding (for tables that run edge to edge). */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-grey-400 bg-white shadow-sm', className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-grey-300 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-grey sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-grey-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  );
}

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'neutral';

const TONES: Record<Tone, { pill: string; dot: string; value: string }> = {
  good: { pill: 'bg-green/10 text-green', dot: 'bg-green', value: 'text-green' },
  bad: { pill: 'bg-red/10 text-red', dot: 'bg-red', value: 'text-red' },
  warn: { pill: 'bg-orange/10 text-orange', dot: 'bg-orange', value: 'text-orange' },
  info: { pill: 'bg-primary/10 text-primary', dot: 'bg-primary', value: 'text-primary' },
  neutral: { pill: 'bg-grey-100 text-grey-600', dot: 'bg-grey-1000', value: 'text-grey' },
};

export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs', TONES[tone].pill, className)}>
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', TONES[tone].dot)} />;
}

/** Small centred number tile, matching the "Overview" tiles on the product home page. */
export function StatTile({ label, value, hint, tone = 'neutral' }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <div className="rounded-lg bg-grey-100 p-3 text-center sm:p-4">
      <p className={cn('text-xl font-bold sm:text-2xl md:text-3xl', TONES[tone].value)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-grey-600 sm:text-xs md:text-sm">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-grey-500 sm:text-xs">{hint}</p> : null}
    </div>
  );
}

export function SectionLoading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-grey-500">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function SectionEmpty({
  icon: Icon,
  tint,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  tint: SectionTint;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sm:h-20 sm:w-20', tint.bg)}>
        <Icon className={cn('h-8 w-8 sm:h-10 sm:w-10', tint.text)} />
      </div>
      <h3 className="mb-1 text-base font-semibold text-grey sm:text-lg">{title}</h3>
      <p className="mb-4 max-w-md text-xs leading-relaxed text-grey-500 sm:text-sm">{description}</p>
      {action}
    </div>
  );
}

export function SectionError({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
      <span>{children}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="rounded-md border border-red/30 px-3 py-1 text-xs font-medium hover:bg-red/10">
          Retry
        </button>
      ) : null}
    </div>
  );
}

/** Segmented control used for in-section tabs (Definitions / Activity, Overview / Logs ...). */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-lg bg-grey-100 p-1">
      {options.map(option => (
        <button
          key={option.id}
          role="tab"
          type="button"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
            value === option.id ? 'bg-white text-primary shadow-sm' : 'text-grey-600 hover:text-grey',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Table wrapper that scrolls horizontally on narrow screens. */
export function DataTable({ head, children, minWidth }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className="border-b border-grey-300 bg-grey-100 text-xs uppercase tracking-wide text-grey-500">
          <tr>
            {head.map(label => (
              <th key={label} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-300">{children}</tbody>
      </table>
    </div>
  );
}

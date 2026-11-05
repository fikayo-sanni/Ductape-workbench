import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared with product resource overviews; metric content and optional trends stay owned by each resource. */
export function ResourceMetricCard({ label, value, icon, trend, hint, children, valueClassName, className }: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-grey-400 bg-white p-4 text-left shadow-sm', className)} data-resource-overview-metric>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-medium text-grey/70 sm:text-sm">{label}</p>
        {icon ? <span className="shrink-0 text-grey/50 [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span> : null}
      </div>
      <div className={cn('mt-2 break-words text-2xl font-bold tabular-nums tracking-tight text-grey', valueClassName)}>{value}</div>
      {trend ? <div className="mt-1 text-xs text-grey/70 [&>div]:inline-flex [&>div]:bg-transparent [&>div]:p-0">{trend}</div> : null}
      {hint ? <div className="mt-1 text-xs text-grey/70">{hint}</div> : null}
      {children ? <div className="mt-2 text-xs text-grey/70">{children}</div> : null}
    </div>
  );
}

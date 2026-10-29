import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientName, componentLabel, type IWorkComponent, type IWorkItem, type WorkStatus } from '@/utils/workBoard';

const PRIORITY_STYLE: Record<IWorkItem['priority'], string> = {
  urgent: 'bg-red/10 text-red',
  high: 'bg-orange/10 text-orange',
  medium: 'bg-grey-100 text-grey-600',
  low: 'bg-grey-100 text-grey-600',
};

export function PriorityChip({ priority }: { priority: IWorkItem['priority'] }) {
  return <span className={cn('whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium capitalize', PRIORITY_STYLE[priority])}>{priority}</span>;
}

const STATUS_STYLE: Record<WorkStatus, string> = {
  backlog: 'bg-grey-100 text-grey-600',
  ready: 'bg-blue-300 text-primary',
  claimed: 'bg-primary/10 text-primary',
  in_progress: 'bg-primary/10 text-primary',
  in_review: 'bg-purple-500/10 text-purple-500',
  blocked: 'bg-orange/10 text-orange',
  awaiting_approval: 'bg-orange/10 text-orange',
  done: 'bg-green/10 text-green',
  cancelled: 'bg-grey-100 text-grey-600',
};

export const statusLabel = (s: string) => s.replace(/_/g, ' ');

export function StatusChip({ status }: { status: WorkStatus }) {
  return <span className={cn('whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium', STATUS_STYLE[status])}>{statusLabel(status)}</span>;
}

/** A Ductape component of the product. One the work will create is dashed until it exists. */
export function ComponentChip({ component }: { component: IWorkComponent }) {
  return (
    <span
      title={component.planned ? 'To be created by this work; it must exist before the work can be completed' : 'Exists in the product'}
      className={cn(
        'inline-flex max-w-full flex-wrap items-center break-all rounded border px-1.5 py-0.5 font-mono text-[11px]',
        component.planned ? 'border-dashed border-grey-400 text-grey-600' : 'border-grey-400 bg-white-700 text-grey',
      )}
    >
      {componentLabel(component)}
      {component.planned ? <span className="ml-1 whitespace-nowrap font-sans text-[10px] uppercase tracking-wide">planned</span> : null}
    </span>
  );
}

/** Who holds or is assigned the work: an agent shows whose agent it is ("Ada's Claude Code"), a person "Person". */
export function AssigneeBadge({ assignee, label, live }: { assignee: IWorkItem['assignee']; label?: string; live?: boolean }) {
  if (!assignee) return <span className="text-[11px] text-grey-600">Unassigned</span>;
  const agent = assignee.type === 'agent';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-grey">
      {agent ? <Bot className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-grey-600" />}
      {agent ? label ?? clientName(null) : 'Person'}
      {live ? <span className="ml-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green" aria-label="working now" /> : null}
    </span>
  );
}

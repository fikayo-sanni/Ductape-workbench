import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLUMNS, groupIntoColumns, leaseLeft, sortComponents, type IWorkItem, type IWorkSession } from '@/utils/workBoard';
import { AssigneeBadge, ComponentChip, PriorityChip, StatusChip } from './WorkChips';

interface IHolder {
  client: string | null;
  expiresAt: string;
}

/** Which session holds each item, from the open sessions' claims. */
export function holdersByItem(sessions: IWorkSession[]): Map<string, IHolder> {
  const out = new Map<string, IHolder>();
  for (const s of sessions) {
    for (const w of s.working_on) {
      // A lease that has run out is not shown as live, even before the server has closed it.
      if (Date.parse(w.expires_at) > Date.now()) out.set(w.item_id, { client: s.agent?.client ?? null, expiresAt: w.expires_at });
    }
  }
  return out;
}

function Card({ item, holder, agentClients, onOpen }: { item: IWorkItem; holder?: IHolder; agentClients: Map<string, string>; onOpen: (ref: string) => void }) {
  const components = sortComponents(item.components);
  const client = item.assignee?.type === 'agent' ? holder?.client ?? agentClients.get(item.assignee.id) ?? null : null;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.ref)}
      data-testid={`work-card-${item.ref}`}
      className={cn(
        'w-full rounded-lg border bg-white p-3 text-left shadow-sm transition-all hover:border-primary/60 hover:shadow',
        item.status === 'awaiting_approval' || item.status === 'blocked' ? 'border-orange/50' : 'border-grey-400',
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-grey-600">{item.ref}</span>
        <PriorityChip priority={item.priority} />
        {item.critical ? <ShieldCheck className="h-3.5 w-3.5 text-orange" aria-label="critical: a person finishes it" /> : null}
        {item.status !== 'ready' && item.status !== 'backlog' && item.status !== 'done' ? <span className="ml-auto"><StatusChip status={item.status} /></span> : null}
      </div>
      <div className="mb-2 text-sm font-medium leading-snug text-grey">{item.title}</div>
      {components.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {components.slice(0, 4).map((c) => <ComponentChip key={`${c.type}:${c.tag}`} component={c} />)}
          {components.length > 4 ? <span className="text-[11px] text-grey-600">+{components.length - 4}</span> : null}
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-1 text-[11px] text-orange">
          <AlertTriangle className="h-3 w-3" /> No Ductape components named
        </div>
      )}
      {item.artifacts?.length ? (
        <div className="mb-2 text-[11px] text-grey-600">{item.artifacts.length} delivered</div>
      ) : null}
      <div className="flex items-center justify-between">
        <AssigneeBadge assignee={item.assignee} client={client} live={Boolean(holder)} />
        {holder ? <span className="text-[11px] tabular-nums text-grey-600">{leaseLeft(holder.expiresAt)}</span> : null}
      </div>
    </button>
  );
}

/** The product's work as columns, from waiting to done. */
export default function WorkBoard({ items, sessions, agentClients, onOpen }: { items: IWorkItem[]; sessions: IWorkSession[]; agentClients: Map<string, string>; onOpen: (ref: string) => void }) {
  const columns = groupIntoColumns(items);
  const holders = holdersByItem(sessions);
  return (
    <div className="grid grid-cols-[repeat(6,minmax(220px,1fr))] gap-3" data-testid="work-board">
      {COLUMNS.map((column) => (
        <section key={column.id} className="flex min-h-[200px] flex-col rounded-xl border border-grey-400 bg-white-700" aria-label={column.label}>
          <header className="border-b border-grey-400 px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className={cn('text-sm font-semibold', column.id === 'attention' && columns.attention.length ? 'text-orange' : 'text-grey')}>{column.label}</h3>
              <span className="rounded-full bg-grey-100 px-2 text-xs font-medium tabular-nums text-grey-600">{columns[column.id].length}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-grey-600">{column.hint}</p>
          </header>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {columns[column.id].map((item) => (
              <Card key={item.id} item={item} holder={holders.get(item.id)} agentClients={agentClients} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

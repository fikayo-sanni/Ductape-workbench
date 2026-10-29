import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IEpicSummary } from '@/utils/workBoard';

/**
 * The product's epics with how far each has got. Choosing one narrows the board to its work; choosing it again
 * shows everything.
 */
export default function WorkEpics({ epics, selected, onSelect, onOpen }: { epics: IEpicSummary[]; selected: string | null; onSelect: (id: string | null) => void; onOpen: (ref: string) => void }) {
  if (!epics.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-testid="work-epics" aria-label="Epics">
      {epics.map(({ epic, total, done, working, attention, progress }) => {
        const active = selected === epic.id;
        return (
          <div
            key={epic.id}
            className={cn('min-w-[240px] max-w-[300px] flex-shrink-0 rounded-xl border bg-white p-3 shadow-sm transition-all', active ? 'border-primary ring-2 ring-primary/15' : attention ? 'border-orange/50' : 'border-grey-400')}
          >
            <button type="button" onClick={() => onSelect(active ? null : epic.id)} className="w-full text-left" data-testid={`work-epic-${epic.ref}`} aria-pressed={active}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-grey-600">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono font-semibold">{epic.ref}</span>
                <span>epic</span>
                <span className="ml-auto tabular-nums">{done}/{total} done</span>
              </div>
              <div className="mb-2 truncate text-sm font-semibold text-grey">{epic.title}</div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-grey-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-green" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="mt-1.5 flex gap-3 text-[11px] text-grey-600">
                <span>{working} in progress</span>
                {attention ? <span className="text-orange">{attention} need a person</span> : null}
                {!total ? <span>No work yet</span> : null}
              </div>
            </button>
            <button type="button" onClick={() => onOpen(epic.ref)} className="mt-1 text-[11px] text-primary hover:underline">Details</button>
          </div>
        );
      })}
    </div>
  );
}

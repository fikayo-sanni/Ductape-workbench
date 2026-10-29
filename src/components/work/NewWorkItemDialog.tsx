import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkAuth } from '@/hooks/useWork';
import { createWorkItem, workErrorMessage } from '@/services/workServices';
import { componentLabel, type IWorkComponent, type IWorkItem, type IWorkProduct } from '@/utils/workBoard';

/**
 * Creates a work item in the selected product. The person picks the product's Ductape components the work uses, and
 * may add ones the work will create (planned); the server checks every one against the product.
 */
export default function NewWorkItemDialog({ product, epics = [], defaultParent = null, onClose, onCreated }: { product: IWorkProduct; epics?: IWorkItem[]; defaultParent?: string | null; onClose: () => void; onCreated: (ref: string) => void }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<IWorkItem['priority']>('medium');
  const [critical, setCritical] = useState(false);
  const [kind, setKind] = useState<'task' | 'epic'>('task');
  const [parent, setParent] = useState<string>(epics.find((e) => e.id === defaultParent)?.ref ?? '');
  const [picked, setPicked] = useState<IWorkComponent[]>([]);
  const [plannedType, setPlannedType] = useState('feature');
  const [plannedTag, setPlannedTag] = useState('');

  const options = Object.entries(product.components).flatMap(([type, tags]) => tags.map((tag) => ({ type, tag })));
  const has = (c: IWorkComponent) => picked.some((p) => p.type === c.type && p.tag === c.tag);
  const toggle = (c: IWorkComponent) => setPicked((prev) => (has(c) ? prev.filter((p) => !(p.type === c.type && p.tag === c.tag)) : [...prev, { ...c, planned: false }]));

  const create = useMutation({
    mutationFn: () => createWorkItem(auth!, { title: title.trim(), body: body.trim() || undefined, product: product.tag, priority, critical, components: picked, kind, parent: parent || undefined }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['work'] });
      toast.success(`${item.ref} created`);
      onCreated(item.ref);
    },
    onError: (e) => toast.error(workErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-label="New work item">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-grey-400 px-5 py-3">
          <h2 className="text-base font-semibold text-grey">New work in {product.name}</h2>
          <button onClick={onClose} className="rounded p-1 text-grey-600 hover:bg-grey-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 p-5">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing" className="w-full rounded-md border border-grey-400 px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Details, acceptance criteria, links" className="w-full rounded-md border border-grey-400 px-3 py-2 text-sm" />
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-600">Ductape components it uses</p>
            {options.length ? (
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {options.map((c) => (
                  <button
                    key={`${c.type}:${c.tag}`}
                    type="button"
                    onClick={() => toggle(c)}
                    className={has(c) ? 'rounded border border-primary bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary' : 'rounded border border-grey-400 px-1.5 py-0.5 font-mono text-[11px] text-grey hover:border-primary/60'}
                  >
                    {componentLabel(c)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-grey-600">This product has no components yet.</p>
            )}
            <div className="mt-2 flex gap-1.5">
              <select value={plannedType} onChange={(e) => setPlannedType(e.target.value)} className="rounded-md border border-grey-400 px-2 py-1 text-xs">
                {['feature', 'database', 'app', 'event', 'job', 'notification', 'storage', 'session', 'cache', 'function', 'healthcheck', 'quota', 'fallback'].map((t) => <option key={t}>{t}</option>)}
              </select>
              <input value={plannedTag} onChange={(e) => setPlannedTag(e.target.value)} placeholder="tag of one this work will create" className="flex-1 rounded-md border border-grey-400 px-2 py-1 font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!plannedTag.trim()}
                onClick={() => {
                  setPicked((prev) => [...prev, { type: plannedType, tag: plannedTag.trim(), planned: true }]);
                  setPlannedTag('');
                }}
              >
                Add planned
              </Button>
            </div>
            {picked.some((p) => p.planned) ? (
              <p className="mt-1.5 text-[11px] text-grey-600">Planned: {picked.filter((p) => p.planned).map(componentLabel).join(', ')}. It must exist in the product before the work can be completed.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-grey">
              Kind
              <select value={kind} onChange={(e) => setKind(e.target.value as 'task' | 'epic')} className="rounded-md border border-grey-400 px-2 py-1 text-sm">
                <option value="task">Task</option>
                <option value="epic">Epic</option>
              </select>
            </label>
            {epics.length ? (
              <label className="flex items-center gap-2 text-sm text-grey">
                Part of
                <select value={parent} onChange={(e) => setParent(e.target.value)} className="max-w-[200px] rounded-md border border-grey-400 px-2 py-1 text-sm">
                  <option value="">No epic</option>
                  {epics.map((e) => <option key={e.id} value={e.ref}>{e.ref} {e.title}</option>)}
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-grey">
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as IWorkItem['priority'])} className="rounded-md border border-grey-400 px-2 py-1 text-sm">
                {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-grey">
              <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
              Critical: a person finishes it
            </label>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-grey-400 px-5 py-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>Create</Button>
        </footer>
      </div>
    </div>
  );
}

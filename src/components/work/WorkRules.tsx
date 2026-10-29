import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkAuth, useWorkRules } from '@/hooks/useWork';
import { RULE_KINDS, createWorkRule, deleteWorkRule, updateWorkRule, workErrorMessage, type INewWorkRule, type IWorkRule, type RuleKind } from '@/services/workServices';
import { StepUpCancelled, withStepUp } from './StepUp';
import { ago, type IWorkItem, type IWorkProduct } from '@/utils/workBoard';

const field = 'rounded-md border border-grey-400 bg-white px-2.5 py-1.5 text-sm text-grey';

function NewRule({ product, onDone }: { product: IWorkProduct; onDone: () => void }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<RuleKind>('job');
  const known = (() => {
    const component = RULE_KINDS.find((k) => k.kind === kind)?.component;
    return component ? product.components[component] ?? [] : [];
  })();
  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [failures, setFailures] = useState(3);
  const [within, setWithin] = useState(15);
  const [env, setEnv] = useState('');
  const [priority, setPriority] = useState<IWorkItem['priority']>('high');
  const [critical, setCritical] = useState(false);
  const chosenTag = tag || known[0] || '';
  const label = RULE_KINDS.find((k) => k.kind === kind)?.label ?? kind;
  const create = useMutation({
    mutationFn: () => {
      const input: INewWorkRule = {
        product: product.tag,
        name: name.trim() || `${label} ${chosenTag} keeps failing`,
        watch: { kind, tag: chosenTag.trim(), env: env || null },
        threshold: { failures, within_minutes: within },
        item: { priority, critical },
      };
      return withStepUp(auth!, () => createWorkRule(auth!, input));
    },
    onSuccess: (rule) => {
      toast.success(`Rule added: ${rule.description}`);
      queryClient.invalidateQueries({ queryKey: ['work', 'rules'] });
      onDone();
    },
    onError: (e) => { if (!(e instanceof StepUpCancelled)) toast.error(workErrorMessage(e)); },
  });

  return (
    <div className="space-y-3 border-t border-grey-400 bg-white-700 px-4 py-4" data-testid="work-rule-form">
      <div className="flex flex-wrap items-center gap-2 text-sm text-grey">
        <span>When</span>
        <select aria-label="What to watch" value={kind} onChange={(e) => { setKind(e.target.value as RuleKind); setTag(''); }} className={field}>
          {RULE_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
        </select>
        {known.length ? (
          <select aria-label="Which one" value={chosenTag} onChange={(e) => setTag(e.target.value)} className={field}>
            {known.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <input aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder={kind === 'webhook' ? 'webhook tag' : `no ${label.toLowerCase()} in this product; type a tag`} className={cn(field, 'w-56')} />
        )}
        <span>fails</span>
        <input aria-label="Failures" type="number" min={1} value={failures} onChange={(e) => setFailures(Math.max(1, Number(e.target.value) || 1))} className={cn(field, 'w-16')} />
        <span>times in</span>
        <input aria-label="Minutes" type="number" min={1} max={1440} value={within} onChange={(e) => setWithin(Math.min(1440, Math.max(1, Number(e.target.value) || 1)))} className={cn(field, 'w-16')} />
        <span>minutes</span>
        <select aria-label="Environment" value={env} onChange={(e) => setEnv(e.target.value)} className={field}>
          <option value="">in any environment</option>
          {product.envs.map((e) => <option key={e} value={e}>in {e}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-grey">
        <span>open</span>
        <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as IWorkItem['priority'])} className={field}>
          {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span>work</span>
        <label className="flex items-center gap-1.5 text-sm text-grey-600">
          <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
          critical (a person approves it)
        </label>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Name (default: ${label} ${chosenTag || '...'} keeps failing)`} className={cn(field, 'min-w-[260px] flex-1')} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={create.isPending || !chosenTag.trim()} onClick={() => create.mutate()}>Add rule</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function RuleRow({ rule, onOpenItem, itemRef }: { rule: IWorkRule; onOpenItem: (ref: string) => void; itemRef?: string }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => withStepUp(auth!, fn),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work', 'rules'] }),
    onError: (e) => { if (!(e instanceof StepUpCancelled)) toast.error(workErrorMessage(e)); },
  });
  return (
    <li className="flex items-start gap-3 border-t border-grey-400 px-4 py-3 first:border-t-0" data-testid={`work-rule-${rule.id}`}>
      <span className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md', rule.enabled ? 'bg-primary/10 text-primary' : 'bg-grey-100 text-grey-600')}><Zap className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-grey">{rule.name}</p>
        <p className="text-xs text-grey-600">
          {rule.description}; opens {rule.item.priority}{rule.item.critical ? ', critical' : ''} work
        </p>
        <p className="mt-0.5 text-xs text-grey-600">
          {rule.fired_count ? `Opened work ${rule.fired_count === 1 ? 'once' : `${rule.fired_count} times`}, last ${ago(rule.last_fired_at!)}` : 'Has not opened work yet'}
          {itemRef ? <> · <button type="button" className="text-primary hover:underline" onClick={() => onOpenItem(itemRef)}>{itemRef} is open</button></> : null}
        </p>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-grey-600">
        <input
          type="checkbox"
          checked={rule.enabled}
          disabled={change.isPending}
          onChange={(e) => change.mutate(() => updateWorkRule(auth!, rule.id, { enabled: e.target.checked }))}
        />
        On
      </label>
      <Button
        variant="outline"
        size="sm"
        aria-label={`Remove ${rule.name}`}
        disabled={change.isPending}
        onClick={() => change.mutate(() => deleteWorkRule(auth!, rule.id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

/**
 * Rules that open work in this product when one of its components keeps failing. Ductape checks them every minute
 * against the runs the SDK logs; a crossed rule opens one item and notes on it while it stays open.
 */
export default function WorkRules({ product, items, onOpen }: { product: IWorkProduct; items: IWorkItem[]; onOpen: (ref: string) => void }) {
  const rules = useWorkRules(product.tag);
  const [adding, setAdding] = useState(false);
  const refOf = (id: string | null) => (id ? items.find((i) => i.id === id)?.ref : undefined);
  return (
    <section className="overflow-hidden rounded-xl border border-grey-400 bg-white" data-testid="work-rules">
      <header className="flex items-center justify-between gap-3 border-b border-grey-400 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-grey">Rules that open work</h3>
          <p className="text-xs text-grey-600">When something in {product.name} keeps failing, Ductape opens a work item with the latest errors, so a person or an agent picks it up. Checked every minute.</p>
        </div>
        {adding ? null : <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />New rule</Button>}
      </header>
      {rules.isLoading ? (
        <p className="p-4 text-sm text-grey-600">Reading rules</p>
      ) : rules.error ? (
        <p className="p-4 text-sm text-orange">Could not read the rules: {workErrorMessage(rules.error)}</p>
      ) : !rules.data?.length && !adding ? (
        <p className="p-4 text-sm text-grey-600">No rules yet. Add one so a job, feature or app that keeps failing becomes work instead of a surprise.</p>
      ) : (
        <ul>{(rules.data ?? []).map((r) => <RuleRow key={r.id} rule={r} itemRef={refOf(r.open_item_id)} onOpenItem={onOpen} />)}</ul>
      )}
      {adding ? <NewRule product={product} onDone={() => setAdding(false)} /> : null}
    </section>
  );
}

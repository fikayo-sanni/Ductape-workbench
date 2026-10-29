import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, KeyRound, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkAuth } from '@/hooks/useWork';
import { createIntakeKey, fetchIntakeKeys, revokeIntakeKey, workErrorMessage, type IIntakeKey } from '@/services/workServices';
import { ago, type IWorkItem, type IWorkProduct } from '@/utils/workBoard';
import { StepUpCancelled, withStepUp } from './StepUp';
import { resolveApiBaseUrl } from '@/config/apiBaseUrl';

const field = 'rounded-md border border-grey-400 bg-white px-2.5 py-1.5 text-sm text-grey';

/** Where outside systems send work: this Workbench's API, or the page's own address behind a proxy. */
const API = (resolveApiBaseUrl() || window.location.origin).replace(/\/$/, '');

/**
 * Keys that let a system outside Ductape (alerting, an issue tracker, CI) open work in this product. A key is shown
 * once, when it is made; only its first characters are kept for telling keys apart.
 */
export default function WorkIntakeKeys({ product }: { product: IWorkProduct }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: ['work', 'intake-keys', auth?.workspaceId, product.tag], queryFn: () => fetchIntakeKeys(auth!, product.tag), enabled: Boolean(auth) });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<IWorkItem['priority']>('high');
  const [made, setMade] = useState<IIntakeKey | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['work', 'intake-keys'] });
  const onError = (e: unknown) => { if (!(e instanceof StepUpCancelled)) toast.error(workErrorMessage(e)); };
  const create = useMutation({
    mutationFn: () => withStepUp(auth!, () => createIntakeKey(auth!, { product: product.tag, name: name.trim(), priority })),
    onSuccess: (k) => { setMade(k); setAdding(false); setName(''); refresh(); },
    onError,
  });
  const revoke = useMutation({ mutationFn: (id: string) => revokeIntakeKey(auth!, id), onSuccess: () => { toast.success('Key revoked'); refresh(); }, onError });
  const live = (keys.data ?? []).filter((k) => !k.revoked_at);

  return (
    <section className="overflow-hidden rounded-xl border border-grey-400 bg-white" data-testid="work-intake-keys">
      <header className="flex items-center justify-between gap-3 border-b border-grey-400 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-grey">Keys for outside systems</h3>
          <p className="text-xs text-grey-600">Let an alerting tool, an issue tracker or a CI job open work in {product.name}. The same incident (dedupe_key) adds to its open item instead of opening another.</p>
        </div>
        {adding ? null : <Button size="sm" onClick={() => { setAdding(true); setMade(null); }}><Plus className="mr-1 h-4 w-4" />New key</Button>}
      </header>
      {made?.key ? (
        <div className="space-y-2 border-b border-grey-400 bg-green/5 px-4 py-3" data-testid="work-intake-made">
          <p className="text-sm font-medium text-grey">Key for {made.name}. Copy it now: it is not shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded border border-grey-400 bg-white px-2 py-1.5 font-mono text-xs text-grey">{made.key}</code>
            <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(made.key!); toast.success('Copied'); }}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <pre className="overflow-x-auto rounded bg-grey-100 p-2 font-mono text-[11px] text-grey">{`curl -X POST ${API}/tickets/v1/work-intake \\
  -H "Authorization: Bearer <key>" -H "content-type: application/json" \\
  -d '{"title":"Checkout error rate above 5%","dedupe_key":"INC-123","url":"https://...","source":"${made.name}"}'`}</pre>
          <p className="text-xs text-grey-600">Fields: title (required), body, priority, labels, components (type:tag), env, dedupe_key, url, source.</p>
        </div>
      ) : null}
      {adding ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-grey-400 bg-white-700 px-4 py-3 text-sm text-grey">
          <input aria-label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The system that will use it (PagerDuty, Sentry, CI)" className={`${field} min-w-[280px] flex-1`} />
          <span>opens</span>
          <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as IWorkItem['priority'])} className={field}>
            {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <span>work</span>
          <Button size="sm" disabled={create.isPending || !name.trim()} onClick={() => create.mutate()}>Make key</Button>
          <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      ) : null}
      {keys.isLoading ? (
        <p className="p-4 text-sm text-grey-600">Reading keys</p>
      ) : !live.length ? (
        <p className="p-4 text-sm text-grey-600">No keys yet.</p>
      ) : (
        <ul>
          {live.map((k) => (
            <li key={k.id} className="flex items-center gap-3 border-t border-grey-400 px-4 py-3 first:border-t-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><KeyRound className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-grey">{k.name} <span className="font-mono text-xs text-grey-600">{k.hint}...</span></p>
                <p className="text-xs text-grey-600">Opens {k.defaults.priority} work · {k.uses ? `used ${k.uses} time${k.uses === 1 ? '' : 's'}, last ${ago(k.last_used_at!)}` : 'not used yet'}</p>
              </div>
              <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(k.id)}>Revoke</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

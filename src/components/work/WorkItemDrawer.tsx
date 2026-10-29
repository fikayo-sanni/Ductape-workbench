import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bot, GitCommit, GitPullRequest, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkAuth, useWorkContext } from '@/hooks/useWork';
import { completeWorkItem, releaseWorkItem, updateWorkItem, workErrorMessage, type IWorkEvent } from '@/services/workServices';
import { ago, clientName, descendantIds, groupArtifacts, leaseLeft, sortComponents, type IWorkItem, type IWorkProduct } from '@/utils/workBoard';
import { ComponentChip, PriorityChip, StatusChip, statusLabel } from './WorkChips';

/** One line of an item's history, in words. */
export function describeEvent(e: IWorkEvent): string {
  const d = e.data ?? {};
  switch (e.type) {
    case 'created': return 'Created';
    case 'claimed': return `Claimed${d.paths?.length ? ` for ${d.paths.join(', ')}` : ''}`;
    case 'released': return `Released${d.reason && d.reason !== 'released' ? ` (${String(d.reason).replace(/_/g, ' ')})` : ''}${d.note ? `: ${d.note}` : ''}`;
    case 'claim_expired': return 'Claim expired: the agent stopped answering';
    case 'status_changed': return `Moved from ${statusLabel(d.from)} to ${statusLabel(d.to)}${d.reason === 'critical' ? ' (critical: waits for a person)' : ''}`;
    case 'note': return d.text;
    case 'files_touched': return `Changed ${d.files?.join(', ')}`;
    case 'commit': return `Commit ${d.sha}${d.message ? `: ${d.message}` : ''}`;
    case 'pull_request': return `Pull request ${d.url}`;
    case 'components_changed': return `Ductape components: ${d.components?.join(', ')}`;
    case 'artifact_added': return `Delivered ${d.artifacts?.map((a: any) => `${String(a.kind).replace('_', ' ')} ${a.ref}`).join(', ')}`;
    case 'completed': return `Completed${d.outcome ? `: ${d.outcome}` : ''}`;
    case 'blocked': return `Blocked: ${d.reason}${d.blocker ? ` (waits on ${d.blocker})` : ''}`;
    case 'unblocked': return 'Ready: everything it waited on is done';
    case 'dependency_added': return `Waits on ${d.from}`;
    case 'plan_published': return `Plan published: ${d.created?.length ?? 0} created, ${d.updated?.length ?? 0} updated`;
    case 'updated': return `Changed ${Object.keys(d).join(', ')}`;
    default: return e.type.replace(/_/g, ' ');
  }
}

const EVENT_ICON: Record<string, typeof GitCommit> = { commit: GitCommit, pull_request: GitPullRequest };

/** An item, its Ductape components, what it waits on, who holds it and what happened, with the changes a person makes. */
export default function WorkItemDrawer({ itemRef, live = false, product, epics = [], allItems = [], agentClients, onClose, onOpen }: { itemRef: string; live?: boolean; product?: IWorkProduct; epics?: IWorkItem[]; allItems?: IWorkItem[]; agentClients: Map<string, string>; onClose: () => void; onOpen: (ref: string) => void }) {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkContext(itemRef, live);
  const [outcome, setOutcome] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['work'] });
  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(workErrorMessage(e)),
  });

  if (isLoading || !data) {
    return (
      <aside className="flex w-full max-w-[460px] flex-col border-l border-grey-400 bg-white p-6">
        {error ? <p className="text-sm text-red">{workErrorMessage(error)}</p> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </aside>
    );
  }
  const item: IWorkItem = data.item;
  const components = sortComponents(item.components);
  const existing = product?.components ?? {};
  const holderClient = data.claim?.agent_id ? agentClients.get(data.claim.agent_id) : null;

  return (
    <aside className="flex w-full max-w-[460px] flex-col border-l border-grey-400 bg-white" data-testid="work-item-drawer">
      <header className="flex items-start gap-2 border-b border-grey-400 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-grey-600">{item.ref}</span>
            {item.kind === 'epic' ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                epic · {(() => { const ids = descendantIds(allItems, item.id); const work = allItems.filter((i) => ids.has(i.id) && i.kind !== 'epic' && i.status !== 'cancelled'); return `${work.filter((i) => i.status === 'done').length}/${work.length} done`; })()}
              </span>
            ) : (
              <StatusChip status={item.status} />
            )}
            <PriorityChip priority={item.priority} />
            {item.critical ? <span className="rounded bg-orange/10 px-1.5 py-0.5 text-[11px] font-medium text-orange">critical</span> : null}
          </div>
          <h2 className="text-base font-semibold leading-snug text-grey">{item.title}</h2>
          <p className="mt-1 text-xs text-grey-600">
            Product <span className="font-medium text-grey">{item.product}</span>
            {item.env ? <> · env <span className="font-medium text-grey">{item.env}</span></> : null}
            {data.parents[0] ? <> · part of <button className="text-primary hover:underline" onClick={() => onOpen(data.parents[0].ref)}>{data.parents[0].ref} {data.parents[0].title}</button></> : null}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-grey-600 hover:bg-grey-100" aria-label="Close"><X className="h-4 w-4" /></button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {item.body ? <p className="whitespace-pre-wrap text-sm text-grey">{item.body}</p> : null}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-600">Ductape components</h3>
          {components.length ? (
            <ul className="space-y-1">
              {components.map((c) => {
                const owner = (existing[c.type] ?? []).some((t) => c.tag === t || c.tag.startsWith(`${t}:`));
                return (
                  <li key={`${c.type}:${c.tag}`} className="flex items-center justify-between gap-2">
                    <ComponentChip component={c} />
                    <span className={owner ? 'text-[11px] text-green' : 'text-[11px] text-orange'}>{owner ? 'in the product' : 'not in the product yet'}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-orange">This work names no Ductape components. Name what it uses or creates so agents build with them.</p>
          )}
        </section>

        {data.claim ? (
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-grey">
              <Bot className="h-4 w-4 text-primary" />
              {data.claim.agent_id ? clientName(holderClient) : 'A person'} is working on it
              <span className="ml-auto text-xs tabular-nums text-grey-600">{leaseLeft(data.claim.expires_at)}</span>
            </div>
            <p className="mt-1 text-xs text-grey-600">
              {data.claim.repo || 'no repo'}{data.claim.paths.length ? ` · ${data.claim.paths.join(', ')}` : ''} · since {ago(data.claim.claimed_at)}
            </p>
          </section>
        ) : null}

        {data.overlaps.length ? (
          <section className="rounded-lg border border-orange/40 bg-orange/5 p-3 text-xs text-grey">
            <p className="mb-1 font-semibold text-orange">Other live work touches the same things</p>
            {data.overlaps.map((o, i) => (
              <p key={i}>
                {o.item?.ref} {o.item?.title}: {[...o.components, ...o.paths.map((p) => p.theirs)].join(', ')}
              </p>
            ))}
          </section>
        ) : null}

        {(data.blocked_by.length || data.blocks.length || data.children.length) ? (
          <section className="space-y-1 text-xs">
            {data.blocked_by.length ? <p><span className="text-grey-600">Waits on </span>{data.blocked_by.map((b) => <button key={b.ref} className="mr-2 text-primary hover:underline" onClick={() => onOpen(b.ref)}>{b.ref} ({statusLabel(b.status)})</button>)}</p> : null}
            {data.blocks.length ? <p><span className="text-grey-600">Blocks </span>{data.blocks.map((b) => <button key={b.ref} className="mr-2 text-primary hover:underline" onClick={() => onOpen(b.ref)}>{b.ref} ({statusLabel(b.status)})</button>)}</p> : null}
            {data.children.length ? <p><span className="text-grey-600">Subtasks </span>{data.children.map((b) => <button key={b.ref} className="mr-2 text-primary hover:underline" onClick={() => onOpen(b.ref)}>{b.ref} ({statusLabel(b.status)})</button>)}</p> : null}
          </section>
        ) : null}

        {(() => {
          // An epic delivers what its work delivered; any other item, what it delivered itself.
          const under = item.kind === 'epic' ? descendantIds(allItems, item.id) : new Set<string>();
          const sources = [{ ref: item.ref, artifacts: item.artifacts }, ...allItems.filter((i) => under.has(i.id)).map((i) => ({ ref: i.ref, artifacts: i.artifacts }))];
          const groups = groupArtifacts(sources);
          return (
            <section data-testid="work-delivered">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-600">{item.kind === 'epic' ? 'Delivered across this epic' : 'Delivered'}</h3>
              {groups.length ? (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <div key={g.kind}>
                      <p className="text-[11px] font-medium text-grey-600">{g.label}</p>
                      <ul className="mt-0.5 space-y-0.5">
                        {g.entries.map((a) => (
                          <li key={`${a.kind}|${a.ref}`} className="flex items-baseline gap-1.5 text-xs text-grey">
                            {a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline">{a.ref.length > 48 ? `${a.ref.slice(0, 45)}...` : a.ref}</a> : <span className="font-mono">{a.ref}</span>}
                            {a.title ? <span className="truncate">{a.title}</span> : null}
                            {a.meta ? <span className="text-grey-600">{Object.entries(a.meta).map(([k, v]) => `${k} ${v}`).join(', ')}</span> : null}
                            {a.from !== item.ref ? <button className="ml-auto flex-shrink-0 text-[11px] text-primary hover:underline" onClick={() => onOpen(a.from)}>{a.from}</button> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-grey-600">Nothing delivered yet.</p>
              )}
            </section>
          );
        })()}

        {item.outcome ? <section><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-grey-600">Outcome</h3><p className="text-sm text-grey">{item.outcome}</p></section> : null}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-600">History</h3>
          <ol className="space-y-2 border-l border-grey-400 pl-3">
            {data.events.map((e) => {
              const Icon = EVENT_ICON[e.type];
              return (
                <li key={e.id} className="text-xs">
                  <span className="text-grey-600">{ago(e.at)} · {e.actor.type === 'agent' ? clientName(agentClients.get(e.actor.agent_id ?? '')) : 'person'}</span>
                  <p className="flex items-start gap-1 break-words text-grey">{Icon ? <Icon className="mt-0.5 h-3 w-3 flex-shrink-0" /> : null}{describeEvent(e)}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <footer className="space-y-2 border-t border-grey-400 p-4">
        {item.status === 'awaiting_approval' ? (
          <div className="space-y-2">
            <input
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="What you checked before approving"
              className="w-full rounded-md border border-grey-400 bg-white px-3 py-2 text-sm"
            />
            <Button className="w-full" disabled={act.isPending || !outcome.trim()} onClick={() => act.mutate(() => completeWorkItem(auth!, item.ref, outcome.trim()))}>
              Approve and complete
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Priority"
            value={item.priority}
            disabled={act.isPending || item.status === 'done'}
            onChange={(e) => act.mutate(() => updateWorkItem(auth!, item.ref, { priority: e.target.value }))}
            className="rounded-md border border-grey-400 bg-white px-2 py-1.5 text-sm"
          >
            {['urgent', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {item.kind !== 'epic' && epics.length ? (
            <select
              aria-label="Epic"
              value={epics.find((e) => e.id === item.parent_id)?.ref ?? ''}
              disabled={act.isPending}
              onChange={(e) => act.mutate(() => updateWorkItem(auth!, item.ref, { parent: e.target.value || null }))}
              className="max-w-[180px] rounded-md border border-grey-400 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">No epic</option>
              {epics.map((e) => <option key={e.id} value={e.ref}>{e.ref} {e.title}</option>)}
            </select>
          ) : null}
          {item.status !== 'done' ? (
            <Button variant="outline" size="sm" disabled={act.isPending} onClick={() => act.mutate(() => updateWorkItem(auth!, item.ref, { critical: !item.critical }))}>
              {item.critical ? 'Not critical' : 'Mark critical'}
            </Button>
          ) : null}
          {data.claim ? (
            <Button variant="outline" size="sm" disabled={act.isPending} onClick={() => act.mutate(() => releaseWorkItem(auth!, item.ref, 'Released from the Workbench'))}>
              Take it back
            </Button>
          ) : null}
        </div>
      </footer>
    </aside>
  );
}

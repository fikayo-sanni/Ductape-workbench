import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, ShieldCheck, Circle, KanbanSquare, Loader2, Network, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkApprovals, useWorkAuth, useWorkDependencies, useWorkItems, useWorkProducts, useWorkSessions } from '@/hooks/useWork';
import { workErrorMessage } from '@/services/workServices';
import { useWorkStream } from '@/hooks/useWorkStream';
import { agentDirectory, defaultProduct, splitSessions, descendantIds, epicSummaries, summarise, type Tone } from '@/utils/workBoard';
import WorkEpics from './WorkEpics';
import WorkBoard from './WorkBoard';
import WorkAgents from './WorkAgents';
import WorkApprovals from './WorkApprovals';
import WorkGraph from './WorkGraph';
import WorkItemDrawer from './WorkItemDrawer';
import NewWorkItemDialog from './NewWorkItemDialog';

type View = 'board' | 'graph' | 'agents' | 'approvals';

const toneText: Record<Tone, string> = { good: 'text-green', warn: 'text-orange', bad: 'text-red', neutral: 'text-grey-600' };

const storageKey = (workspaceId?: string) => `work.product.${workspaceId ?? ''}`;
const readSaved = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Remembering the product is a convenience; the page works without it.
  }
};

function Stat({ label, value, tone = 'neutral', icon: Icon }: { label: string; value: number; tone?: Tone; icon: typeof Circle }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm', tone === 'warn' && value ? 'border-orange/50' : 'border-grey-400')}>
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tone === 'warn' && value ? 'bg-orange/10 text-orange' : tone === 'good' ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey-600')}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xl font-semibold tabular-nums text-grey">{value}</span>
        <span className="block text-xs text-grey-600">{label}</span>
      </span>
    </div>
  );
}

/**
 * The Work area: what people and coding agents are planning, doing and finishing in one product, live. Work is always
 * shown per product, because every work item belongs to one product and is built from that product's Ductape components.
 */
export default function WorkTabContent({ fixedProduct }: { fixedProduct?: string } = {}) {
  const auth = useWorkAuth();
  const products = useWorkProducts();
  const [chosenProduct, setProduct] = useState<string | undefined>(undefined);
  // Inside a product's own tab the product is given; in the workspace Work tab the person picks it.
  const product = fixedProduct ?? chosenProduct;
  const [view, setView] = useState<View>('board');
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [epicFilter, setEpicFilter] = useState<string | null>(null);

  useEffect(() => {
    if (fixedProduct || chosenProduct || !products.data?.length) return;
    setProduct(defaultProduct(products.data, readSaved(storageKey(auth?.workspaceId))));
  }, [products.data, chosenProduct, fixedProduct, auth?.workspaceId]);

  const stream = useWorkStream(auth, product);
  const live = stream === 'live';
  const items = useWorkItems(product, live);
  // In a product's own tab, what waits in that product; in the workspace Work tab, what waits anywhere.
  const approvals = useWorkApprovals(fixedProduct, live);
  const sessions = useWorkSessions(product, live);
  const deps = useWorkDependencies(view === 'graph' ? product : undefined, live);
  const current = products.data?.find((p) => p.tag === product);
  const allItems = items.data?.items ?? [];
  const allSessions = sessions.data ?? [];
  const summary = summarise(allItems, allSessions);
  const agents = useMemo(() => agentDirectory(allSessions, items.data?.agents), [allSessions, items.data?.agents]);
  const plans = allItems.filter((i) => i.kind === 'epic');
  const epics = useMemo(() => epicSummaries(allItems), [allItems]);
  // With an epic chosen, the board shows only its work.
  const boardItems = useMemo(() => {
    if (!epicFilter) return allItems;
    const ids = descendantIds(allItems, epicFilter);
    return allItems.filter((i) => ids.has(i.id));
  }, [allItems, epicFilter]);
  const selectedPlan = plans.find((p) => p.id === plan) ?? plans[0];
  const planItems = selectedPlan ? allItems.filter((i) => i.plan_key === selectedPlan.plan_key) : [];
  const liveIds = useMemo(() => new Set(allSessions.flatMap((s) => s.working_on.map((w) => w.item_id))), [allSessions]);

  if (products.isLoading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (products.error) {
    return <div className="p-6 text-sm text-red">Could not read the workspace's products: {workErrorMessage(products.error)}</div>;
  }
  if (!products.data?.length) {
    return <div className="p-6 text-sm text-grey-600">Work belongs to a product. Create a product first, then plan its work here.</div>;
  }

  const VIEWS: Array<{ id: View; label: string; icon: typeof Circle; count?: number }> = [
    { id: 'board', label: 'Board', icon: KanbanSquare },
    { id: 'graph', label: 'Plan graph', icon: Network, count: plans.length },
    { id: 'agents', label: 'Agents', icon: Bot, count: splitSessions(allSessions).live.length },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck, count: approvals.data?.items.length },
  ];
  const openFrom = (ref: string, itemProduct: string) => {
    if (!fixedProduct && itemProduct !== product) {
      setProduct(itemProduct);
      setPlan(null);
      setEpicFilter(null);
      save(storageKey(auth?.workspaceId), itemProduct);
    }
    setOpenRef(ref);
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden" data-testid="work-tab">
      <div className="min-w-0 flex-1 overflow-auto bg-grey-100 p-4 md:p-6">
        <div className="mx-auto max-w-[1500px] space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mb-1 text-xl font-bold text-grey sm:text-2xl">Work</h1>
              <p className={cn('flex items-center gap-1.5 text-sm', toneText[summary.tone])} data-testid="work-status">
                {summary.tone === 'warn' ? <AlertTriangle className="h-4 w-4" /> : summary.tone === 'good' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                {items.isLoading ? 'Reading work' : summary.awaitingApproval ? (
                  <button type="button" className="underline-offset-2 hover:underline" onClick={() => setView('approvals')}>{summary.label}</button>
                ) : summary.label}
                <span
                  className={cn('ml-1 inline-flex items-center gap-1 text-xs', live ? 'text-green' : 'text-grey-600')}
                  title={live ? 'Changes appear as agents and people make them' : 'Re-reading every few seconds until the live connection is back'}
                  data-testid="work-stream-state"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-green' : stream === 'connecting' ? 'bg-grey-400' : 'bg-orange')} />
                  {live ? 'Live' : stream === 'connecting' ? 'Connecting' : 'Reconnecting'}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {fixedProduct ? null : (
              <label className="flex items-center gap-2 text-sm text-grey-600">
                Product
                <select
                  value={product}
                  onChange={(e) => {
                    setProduct(e.target.value);
                    setPlan(null);
                    setEpicFilter(null);
                    setOpenRef(null);
                    save(storageKey(auth?.workspaceId), e.target.value);
                  }}
                  className="rounded-md border border-grey-400 bg-white px-3 py-1.5 text-sm font-medium text-grey"
                >
                  {products.data.map((p) => <option key={p.tag} value={p.tag}>{p.name}{p.open_items ? ` (${p.open_items} open)` : ''}</option>)}
                </select>
              </label>
              )}
              <Button onClick={() => setCreating(true)} disabled={!current}><Plus className="mr-1 h-4 w-4" />New work</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <Stat label="Ready to pick up" value={summary.ready} icon={Circle} />
            <Stat label="Being worked on" value={summary.working} icon={KanbanSquare} tone="good" />
            <Stat label="Needs a person" value={summary.blocked + summary.awaitingApproval} icon={AlertTriangle} tone="warn" />
            <Stat label="Agents working" value={summary.activeAgents} icon={Bot} tone="good" />
            <Stat label="Done this week" value={summary.doneThisWeek} icon={CheckCircle2} />
          </div>

          <div className="flex items-center gap-1 border-b border-grey-400" role="tablist">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id)}
                  className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium', view === v.id ? 'border-primary text-primary' : 'border-transparent text-grey-600 hover:text-grey')}
                >
                  <Icon className="h-4 w-4" />
                  {v.label}
                  {v.count ? <span className="rounded-full bg-grey-100 px-1.5 text-xs tabular-nums">{v.count}</span> : null}
                </button>
              );
            })}
            {view === 'graph' && plans.length > 1 ? (
              <select value={selectedPlan?.id} onChange={(e) => setPlan(e.target.value)} className="ml-auto rounded-md border border-grey-400 bg-white px-2 py-1 text-sm">
                {plans.map((p) => <option key={p.id} value={p.id}>{p.ref} {p.title}</option>)}
              </select>
            ) : null}
          </div>

          {items.error ? <p className="text-sm text-orange">Could not read the work: {workErrorMessage(items.error)}</p> : null}
          {view === 'board' ? (
            <div className="space-y-3">
              <WorkEpics epics={epics} selected={epicFilter} onSelect={setEpicFilter} onOpen={setOpenRef} />
              <div className="overflow-x-auto pb-2">
              <WorkBoard items={boardItems} sessions={allSessions} agents={agents} meId={auth?.userId} onOpen={setOpenRef} />
              </div>
            </div>
          ) : view === 'graph' ? (
            selectedPlan ? (
              <WorkGraph items={planItems} edges={deps.data ?? []} liveIds={liveIds} onOpen={setOpenRef} />
            ) : (
              <div className="rounded-xl border border-grey-400 bg-white p-8 text-center text-sm text-grey-600">No plans yet. An agent publishes one with ductape_work_publish_plan, or a person with ductape work plan publish.</div>
            )
          ) : view === 'approvals' ? (
            <WorkApprovals product={fixedProduct} meId={auth?.userId} onOpen={openFrom} />
          ) : (
            <WorkAgents sessions={allSessions} meId={auth?.userId} onOpen={setOpenRef} />
          )}
        </div>
      </div>
      {openRef ? <WorkItemDrawer itemRef={openRef} live={live} product={current} epics={epics.map((e) => e.epic)} allItems={allItems} agents={agents} meId={auth?.userId} onClose={() => setOpenRef(null)} onOpen={setOpenRef} /> : null}
      {creating && current ? <NewWorkItemDialog product={current} epics={epics.map((e) => e.epic)} defaultParent={epicFilter} onClose={() => setCreating(false)} onCreated={(ref) => { setCreating(false); setOpenRef(ref); }} /> : null}
    </div>
  );
}

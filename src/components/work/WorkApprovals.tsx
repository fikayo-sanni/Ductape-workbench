import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, CheckCircle2, Rocket, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { useWorkApprovals } from '@/hooks/useWork';
import { fetchPlans } from '@/services/deployServices';
import { workErrorMessage, type IApprovalItem } from '@/services/workServices';
import { controlError, describeIntent, expiresIn } from '@/utils/deployControls';
import { agentLabel, waited, type IAgentInfo } from '@/utils/workBoard';
import PlanReviewDialog from '@/components/deploy/PlanReviewDialog';

function finishedBy(item: IApprovalItem, agents: Record<string, IAgentInfo>, meId?: string): string {
  const by = item.finished_by;
  if (!by) return 'unknown';
  if (by.agent_id) return agentLabel(agents[by.agent_id], meId);
  return by.user_id === meId ? 'you' : 'a person';
}

/**
 * Everything waiting for a person, in one place: critical work an agent finished, and Deploy plans that need an
 * approval before they can be applied. Work opens in its panel, where it is approved or sent back; a plan opens in
 * the same review the Deployments area uses, with its emailed-code step-up.
 */
export default function WorkApprovals({ product, meId, onOpen }: { product?: string; meId?: string; onOpen: (ref: string, product: string) => void }) {
  const work = useWorkApprovals(product);
  const deployAuth = useDeployAuth();
  const plans = useQuery({
    queryKey: ['deploy', 'plans', 'pending_approval', deployAuth?.workspaceId, product ?? '*'],
    queryFn: () => fetchPlans(deployAuth!, { stage: 'pending_approval', product }),
    enabled: Boolean(deployAuth),
    retry: false,
  });
  const [reviewing, setReviewing] = useState<string | undefined>();
  const items = work.data?.items ?? [];
  const agents = work.data?.agents ?? {};
  const pendingPlans = plans.data ?? [];
  const scope = product ? 'this product' : 'every product in the workspace';

  return (
    <div className="space-y-4" data-testid="work-approvals">
      <section className="overflow-hidden rounded-xl border border-grey-400 bg-white">
        <header className="flex items-center justify-between border-b border-grey-400 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-grey">Work waiting for approval</h3>
            <p className="text-xs text-grey-600">Critical work an agent finished, across {scope}. Open it to read what was delivered, then approve it or send it back.</p>
          </div>
          <span className="rounded-full bg-grey-100 px-2 text-xs font-medium tabular-nums text-grey-600">{items.length}</span>
        </header>
        {work.isLoading ? (
          <p className="p-4 text-sm text-grey-600">Reading what waits for approval</p>
        ) : work.error ? (
          <p className="p-4 text-sm text-orange">Could not read the approvals: {workErrorMessage(work.error)}</p>
        ) : !items.length ? (
          <p className="flex items-center gap-2 p-4 text-sm text-grey-600"><CheckCircle2 className="h-4 w-4 text-green" />Nothing is waiting for approval.</p>
        ) : (
          <ul>
            {items.map((i) => {
              const sentBack = (i.approvals ?? []).filter((a) => a.decision === 'changes_requested').length;
              return (
                <li key={i.id} className="flex items-start gap-3 border-t border-grey-400 px-4 py-3 first:border-t-0" data-testid={`approval-${i.ref}`}>
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-orange/10 text-orange">
                    {i.finished_by?.agent_id ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-mono text-xs font-semibold text-grey-600">{i.ref}</span>
                      {product ? null : <span className="rounded bg-grey-100 px-1.5 text-[11px] text-grey-600">{i.product}</span>}
                      <span className="font-medium text-grey">{i.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-grey-600">
                      Finished by {finishedBy(i, agents, meId)} · waiting {waited(i.waiting_since)}
                      {i.artifacts?.length ? ` · ${i.artifacts.length} delivered` : ''}
                      {sentBack ? ` · sent back ${sentBack === 1 ? 'once' : `${sentBack} times`} before` : ''}
                    </p>
                    {i.outcome ? <p className="mt-1 line-clamp-2 text-xs text-grey">{i.outcome}</p> : null}
                  </div>
                  <Button size="sm" onClick={() => onOpen(i.ref, i.product)}>Review</Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-grey-400 bg-white">
        <header className="flex items-center justify-between border-b border-grey-400 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-grey">Deploy plans waiting for approval</h3>
            <p className="text-xs text-grey-600">A plan says exactly what would change. Approving may ask for a code sent to your email.</p>
          </div>
          <span className="rounded-full bg-grey-100 px-2 text-xs font-medium tabular-nums text-grey-600">{pendingPlans.length}</span>
        </header>
        {!deployAuth || plans.isLoading ? (
          <p className="p-4 text-sm text-grey-600">Reading Deploy plans</p>
        ) : plans.error ? (
          <p className="p-4 text-sm text-grey-600">Deploy plans could not be read: {controlError(plans.error, 'Ductape Deploy did not answer.').message}</p>
        ) : !pendingPlans.length ? (
          <p className="flex items-center gap-2 p-4 text-sm text-grey-600"><CheckCircle2 className="h-4 w-4 text-green" />No plan is waiting for approval.</p>
        ) : (
          <ul>
            {pendingPlans.map((plan) => (
              <li key={plan.id} className="flex items-start gap-3 border-t border-grey-400 px-4 py-3 first:border-t-0">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Rocket className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    {product ? null : <span className="rounded bg-grey-100 px-1.5 text-[11px] text-grey-600">{plan.desired.product}</span>}
                    <span className="font-medium text-grey">{describeIntent(plan.intent)}: {plan.desired.name} <span className="font-mono text-xs">{plan.desired.version}</span> to {plan.desired.env}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-grey-600">Made {waited(plan.createdAt)} ago{expiresIn(plan) ? ` · ${expiresIn(plan)}` : ''}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReviewing(plan.id)}>Review</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {deployAuth ? <PlanReviewDialog auth={deployAuth} planId={reviewing} onClose={() => setReviewing(undefined)} /> : null}
    </div>
  );
}

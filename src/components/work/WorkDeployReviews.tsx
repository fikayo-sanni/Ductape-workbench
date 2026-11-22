import { useState } from 'react';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlanReviewDialog from '@/components/deploy/PlanReviewDialog';
import { useWorkDeployReviews } from '@/hooks/useWorkDeployReviews';
import { controlError } from '@/utils/deployControls';

/** A direct route from the work board to the exact cloud change waiting for a person. */
export default function WorkDeployReviews({ product }: { product?: string }) {
  const { auth, plans } = useWorkDeployReviews(product);
  const [reviewing, setReviewing] = useState<string>();
  if (!auth) return null;
  const failure = plans.error ? (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-grey-400 bg-white p-4 text-sm text-grey-600">
      <span>Could not check deployment approvals: {controlError(plans.error, 'Ductape Deploy did not answer.').message}</span>
      <Button size="sm" variant="outline" disabled={plans.isFetching} onClick={() => void plans.refetch()}>Try again</Button>
    </div>
  ) : null;
  return (
    <>
      {failure}
      {plans.data?.length ? (
        <section className="overflow-hidden rounded-xl border border-primary/30 bg-white" aria-label="Deployment plans needing your attention">
          <header className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-grey">
            <Rocket className="h-4 w-4 text-primary" />Deployment plans need your attention
          </header>
          <ul className="divide-y divide-grey-400 border-t border-grey-400">
            {plans.data.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-grey">{plan.desired.name} <span className="font-mono text-xs">{plan.desired.version}</span></p>
                  <p className="text-xs text-grey-600">{plan.stage === 'pending_approval' ? 'Needs approval' : 'Ready to apply'} · {plan.desired.product} · {plan.desired.env} · {plan.desired.target.connection}{plan.desired.target.region ? ` · ${plan.desired.target.region}` : ''}</p>
                </div>
                <Button size="sm" variant="outline" aria-label={`Review deployment plan for ${plan.desired.name} ${plan.desired.version} in ${plan.desired.env}`} onClick={() => setReviewing(plan.id)}>Review deployment plan</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PlanReviewDialog auth={auth} planId={reviewing} onClose={() => setReviewing(undefined)} />
    </>
  );
}

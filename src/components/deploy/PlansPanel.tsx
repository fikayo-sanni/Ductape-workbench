import { useMemo, useState } from 'react';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { useDeployCapabilities, useProductPlans } from '@/hooks/useDeployControls';
import { capabilityNotices, controlError, describeIntent, describeStage, expiresIn, newPlanGate, planTotals, sortPlans, type IPlanRow } from '@/utils/deployControls';
import { formatTraffic, shortHash } from '@/utils/deployments';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, StatTile, type SectionTint } from '@/components/tabs/ProductSection';
import { ControlButton, Note, when } from './controls';
import NewPlanDialog from './NewPlanDialog';
import PlanReviewDialog from './PlanReviewDialog';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };

/** Every plan for the product, with what needs a person at the top. Opening one shows exactly what it would change. */
export default function PlansPanel({ productTag, reviewId, onReview }: { productTag: string; reviewId: string | undefined; onReview: (id: string | undefined) => void }) {
  const auth = useDeployAuth();
  const plans = useProductPlans(productTag);
  const caps = useDeployCapabilities();
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => sortPlans(plans.data ?? []), [plans.data]);
  const totals = planTotals(rows);
  const gate = newPlanGate(caps.data);

  if (!auth) return <SectionLoading label="Loading..." />;
  return (
    <>
      {capabilityNotices(caps.data).map((n) => <Note key={n.text} tone={n.tone}>{n.text}</Note>)}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Plans" value={totals.total} />
        <StatTile label="Need approval" value={totals.needsApproval} tone={totals.needsApproval > 0 ? 'warn' : 'neutral'} />
        <StatTile label="Ready to apply" value={totals.readyToApply} tone={totals.readyToApply > 0 ? 'info' : 'neutral'} />
        <StatTile label="Blocked" value={totals.blocked} tone={totals.blocked > 0 ? 'bad' : 'neutral'} />
      </div>
      <Panel
        title="Plans"
        description="A plan says what would change before anything does. Approve it, then apply it."
        flush
        action={
          <span className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void plans.refetch()} disabled={plans.isFetching} aria-label="Refresh plans">
              <RefreshCw className={plans.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            </Button>
            <ControlButton control={gate} size="sm" onClick={() => setCreating(true)} className="gap-2" showReason={false}><Plus className="h-3.5 w-3.5" />New plan</ControlButton>
          </span>
        }
      >
        {plans.isLoading ? (
          <SectionLoading label="Loading plans..." />
        ) : plans.error ? (
          <div className="p-4"><SectionError onRetry={() => void plans.refetch()}>{controlError(plans.error, 'The plans could not be loaded.').message}</SectionError></div>
        ) : rows.length === 0 ? (
          <SectionEmpty
            icon={ListChecks} tint={TINT} title="No plans yet"
            description={gate.enabled ? 'Make a plan to deploy a release, or change one that is running from the Deployments tab.' : gate.reason}
          />
        ) : (
          <DataTable head={['Change', 'Environment', 'Traffic', 'Release', 'Status', 'Made']} minWidth={760}>
            {rows.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => onReview(plan.id)} />)}
          </DataTable>
        )}
      </Panel>
      <NewPlanDialog auth={auth} productTag={productTag} open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); onReview(id); }} />
      <PlanReviewDialog auth={auth} planId={reviewId} onClose={() => onReview(undefined)} />
    </>
  );
}

function PlanRow({ plan, onOpen }: { plan: IPlanRow; onOpen: () => void }) {
  const stage = describeStage(plan.stage);
  const left = expiresIn(plan);
  return (
    <tr className="cursor-pointer hover:bg-grey-100" onClick={onOpen}>
      <td className="px-4 py-3">
        <button type="button" className="text-left font-medium text-grey hover:text-primary" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
          {describeIntent(plan.intent)}: {plan.desired.name} <span className="font-mono text-xs">{plan.desired.version}</span>
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-grey-600">{plan.desired.env}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatTraffic(plan.desired.trafficPercent)}</td>
      <td className="px-4 py-3 font-mono text-xs" title={plan.desired.releaseHash}>{shortHash(plan.desired.releaseHash)}</td>
      <td className="px-4 py-3">
        <Pill tone={stage.tone}>{stage.label}</Pill>
        {left && plan.stage !== 'applied' ? <span className="ml-2 text-[11px] text-grey-500">{left === 'expired' ? 'expired' : `${left} left`}</span> : null}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">{when(plan.createdAt)}</td>
    </tr>
  );
}

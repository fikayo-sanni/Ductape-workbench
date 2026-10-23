import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { applyPlan, approvePlan, type IDeployAuth } from '@/services/deployServices';
import { useDeployCapabilities, usePlanDetail, useRefreshDeploy, useWorkspaceAccessLevel } from '@/hooks/useDeployControls';
import {
  capabilityNotices, controlError, describeAction, describeActor, describeIntent, describeStage, expiresIn, planControls, stepUpScope, summarizePlan,
} from '@/utils/deployControls';
import { formatTraffic, shortHash } from '@/utils/deployments';
import { Pill, SectionLoading } from '@/components/tabs/ProductSection';
import { ControlButton, Note, when } from './controls';
import StepUpDialog from './StepUpDialog';

/**
 * Where a plan is reviewed and decided. What it will change is shown before the buttons, the buttons say why they are off, and
 * nothing happens in the cloud until the second, separate step: approving only records the decision, applying acts on it.
 */
export default function PlanReviewDialog({ auth, planId, onClose }: { auth: IDeployAuth; planId: string | undefined; onClose: () => void }) {
  const plan = usePlanDetail(planId);
  const caps = useDeployCapabilities();
  const level = useWorkspaceAccessLevel();
  const refresh = useRefreshDeploy();
  const [confirmApply, setConfirmApply] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [failure, setFailure] = useState<string | undefined>();

  const approve = useMutation({
    mutationFn: (grant?: string) => approvePlan(auth, planId as string, grant),
    onSuccess: async () => { setNeedsCode(false); setFailure(undefined); toast.success('Plan approved. It has not been applied yet.'); await refresh(); },
    onError: (error) => {
      const e = controlError(error, 'The plan could not be approved.');
      if (e.stepUpRequired) { setNeedsCode(true); return; }
      setNeedsCode(false); setFailure(e.message);
    },
  });
  const apply = useMutation({
    mutationFn: () => applyPlan(auth, planId as string),
    onSuccess: async () => { setConfirmApply(false); setFailure(undefined); toast.success('Applying. Follow it under Deployments.'); await refresh(); },
    onError: (error) => { setConfirmApply(false); setFailure(controlError(error, 'The plan could not be applied.').message); },
  });

  const open = Boolean(planId);
  const detail = plan.data;
  const controls = detail ? planControls(detail, caps.data, level) : undefined;
  const stage = detail ? describeStage(detail.stage) : undefined;
  const left = detail ? expiresIn(detail) : undefined;
  const close = () => { setConfirmApply(false); setNeedsCode(false); setFailure(undefined); onClose(); };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail ? `${describeIntent(detail.intent)}: ${detail.desired.name} ${detail.desired.version}` : 'Plan'}</DialogTitle>
            <DialogDescription>{detail ? `${detail.desired.env} · ${detail.desired.target.connection}${detail.desired.target.region ? ` · ${detail.desired.target.region}` : ''}` : 'Loading the plan...'}</DialogDescription>
          </DialogHeader>
          {plan.isLoading ? <SectionLoading label="Loading the plan..." /> : null}
          {plan.error ? <Note tone="bad">{controlError(plan.error, 'The plan could not be loaded.').message}</Note> : null}
          {detail && controls && stage ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={stage.tone}>{stage.label}</Pill>
                {left ? <span className="text-xs text-grey-500">Expires in {left}</span> : null}
              </div>
              <p className="text-sm text-grey-600">{stage.detail}</p>
              {capabilityNotices(caps.data).filter((n) => n.tone !== 'info').map((n) => <Note key={n.text} tone={n.tone}>{n.text}</Note>)}

              <section>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-500">What this will do</h3>
                <ul className="space-y-1 text-sm text-grey">
                  {summarizePlan(detail).map((line) => <li key={line}>{line}</li>)}
                </ul>
              </section>

              {detail.actions.length > 0 ? (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-500">Changes</h3>
                  <ul className="divide-y divide-grey-300 rounded-md border border-grey-300">
                    {detail.actions.map((action, i) => {
                      const d = describeAction(action.type);
                      return (
                        <li key={`${action.resource}-${i}`} className="flex flex-wrap items-start gap-2 px-3 py-2">
                          <Pill tone={d.tone}>{d.label}</Pill>
                          <span className="min-w-0 flex-1 text-xs text-grey-600">{action.reason}</span>
                          <code className="max-w-full truncate text-[11px] text-grey-500" title={action.resource}>{action.resource}</code>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {detail.placement?.length ? (
                <Note tone="bad">{detail.placement.map((p) => p.message).join(' ')}</Note>
              ) : null}
              {detail.warnings.length > 0 ? <Note tone="warn">{detail.warnings.join(' ')}</Note> : null}

              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <Fact label="Traffic to the release">{formatTraffic(detail.desired.trafficPercent)}</Fact>
                <Fact label="Release"><span className="font-mono" title={detail.desired.releaseHash}>{shortHash(detail.desired.releaseHash)}</span></Fact>
                <Fact label="Image">{detail.release ? <span className="font-mono" title={detail.release.imageDigest}>{shortHash(detail.release.imageDigest)}</span> : '-'}</Fact>
                <Fact label="Made">{when(detail.createdAt)}</Fact>
                <Fact label="State of the cloud">{detail.observedSource === 'provider' ? 'Read from your cloud by the control plane' : detail.observedSource === 'caller' ? 'Supplied by whoever made the plan' : '-'}</Fact>
                <Fact label="Approval">{detail.approval ? `${describeActor(`${detail.approval.approverKind}:`)}, ${when(detail.approval.approvedAt)}` : 'None yet'}</Fact>
              </dl>
              {detail.observed ? (
                <details>
                  <summary className="cursor-pointer text-xs text-primary">What the cloud held when this plan was made</summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-grey-100 p-2 text-[11px] text-grey-700">{JSON.stringify(detail.observed, null, 2)}</pre>
                </details>
              ) : null}

              {failure ? <Note tone="bad">{failure}</Note> : null}

              {confirmApply ? (
                <Note tone="warn" className="space-y-2">
                  <span className="block font-medium">This changes your cloud.</span>
                  <span className="block">{detail.desired.name} {detail.desired.version} in {detail.desired.env} will be updated on {detail.desired.target.connection}. It is checked as it goes and rolled back if it fails.</span>
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => apply.mutate()} disabled={apply.isPending} className="gap-2"><Play className="h-3.5 w-3.5" />Apply now</Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmApply(false)} disabled={apply.isPending}>Not yet</Button>
                  </span>
                </Note>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  {detail.stage === 'pending_approval' ? (
                    <ControlButton control={controls.approve} busy={approve.isPending} variant="outline" onClick={() => (controls.approveNeedsCode ? setNeedsCode(true) : approve.mutate(undefined))} className="gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />Approve this plan
                    </ControlButton>
                  ) : null}
                  <ControlButton control={controls.apply} onClick={() => setConfirmApply(true)} className="gap-2">
                    <Play className="h-3.5 w-3.5" />Apply
                  </ControlButton>
                </div>
              )}
              {controls.approveNeedsCode && controls.approve.enabled ? <p className="text-[11px] text-grey-500">Approving here will ask for a code sent to your email.</p> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {detail ? (
        <StepUpDialog
          open={needsCode} auth={auth} scope={stepUpScope.approve(detail.planHash)} title="Confirm it is you"
          description={`Approving ${detail.desired.name} ${detail.desired.version} for ${detail.desired.env}.`}
          onClose={() => setNeedsCode(false)} onGrant={async (grant) => { await approve.mutateAsync(grant); }}
        />
      ) : null}
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-grey-500">{label}</dt>
      <dd className="mt-0.5 break-words text-grey">{children}</dd>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setEnvironmentPolicy, type IDeployAuth } from '@/services/deployServices';
import { useDeployCapabilities, usePolicyHistory, useRefreshDeploy, useWorkspaceAccessLevel } from '@/hooks/useDeployControls';
import {
  controlError, describeActor, describePolicyChange, normalizePolicy, policyControl, samePolicy, stepUpScope, weakensPolicy, type IPolicyDraft,
} from '@/utils/deployControls';
import type { IEnvironmentPolicy } from '@/utils/deployments';
import { ControlButton, Note, when } from './controls';
import StepUpDialog from './StepUpDialog';

/**
 * How an environment is governed: whether a person must approve each plan, and whether an agent may apply when no approval is
 * needed. Giving up a safeguard is allowed but asked about twice, every change is recorded with who made it, and the record is
 * shown here.
 */
export default function PolicyDialog({
  auth, productTag, env, current, open, onClose,
}: { auth: IDeployAuth; productTag: string; env: string; current: IEnvironmentPolicy | undefined; open: boolean; onClose: () => void }) {
  const caps = useDeployCapabilities();
  const level = useWorkspaceAccessLevel();
  const history = usePolicyHistory(productTag, env, open);
  const refresh = useRefreshDeploy();
  const requireNow = current?.requireHumanApproval ?? true;
  const allowNow = current?.allowAgentApply ?? false;
  const before: IPolicyDraft = normalizePolicy({ requireHumanApproval: requireNow, allowAgentApply: allowNow });
  const [draft, setDraft] = useState<IPolicyDraft>(before);
  const [understood, setUnderstood] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  useEffect(() => {
    if (open) { setDraft(normalizePolicy({ requireHumanApproval: requireNow, allowAgentApply: allowNow })); setUnderstood(false); setNeedsCode(false); setProblem(undefined); }
  }, [open, requireNow, allowNow]);

  const save = useMutation({
    mutationFn: (grant?: string) => setEnvironmentPolicy(auth, productTag, env, normalizePolicy(draft), grant),
    onSuccess: async () => { setNeedsCode(false); toast.success('Policy saved.'); await refresh(); onClose(); },
    onError: (error) => {
      const e = controlError(error, 'The policy could not be saved.');
      if (e.stepUpRequired) { setNeedsCode(true); return; }
      setNeedsCode(false); setProblem(e.message);
    },
  });

  const control = policyControl(caps.data, level);
  const normalized = normalizePolicy(draft);
  const unchanged = samePolicy(before, normalized);
  const weakens = weakensPolicy(before, normalized);
  const canSave = control.enabled && !unchanged && (!weakens || understood);
  const submit = () => { setProblem(undefined); if (control.needsCode) setNeedsCode(true); else save.mutate(undefined); };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next && !save.isPending) onClose(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Approval policy for {env}</DialogTitle>
            <DialogDescription>Decides who can change what is running in this environment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-md border border-grey-300 p-3">
              <input type="checkbox" className="mt-1" checked={draft.requireHumanApproval} onChange={(event) => setDraft({ ...draft, requireHumanApproval: event.target.checked })} />
              <span>
                <span className="block text-sm font-medium text-grey">A person must approve every plan</span>
                <span className="block text-xs text-grey-500">Agents and scripts can make plans but never approve or apply them here.</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 rounded-md border border-grey-300 p-3 ${draft.requireHumanApproval ? 'opacity-60' : ''}`}>
              <input type="checkbox" className="mt-1" disabled={draft.requireHumanApproval} checked={!draft.requireHumanApproval && draft.allowAgentApply} onChange={(event) => setDraft({ ...draft, allowAgentApply: event.target.checked })} />
              <span>
                <span className="block text-sm font-medium text-grey">An agent may apply plans without approval</span>
                <span className="block text-xs text-grey-500">{draft.requireHumanApproval ? 'Not available while approval is required.' : 'Only when no approval is needed. Without this, only a person applies.'}</span>
              </span>
            </label>
            <Note tone={unchanged ? 'neutral' : weakens ? 'warn' : 'info'}>{unchanged ? 'No change yet.' : describePolicyChange(before, normalized)}</Note>
            {weakens ? (
              <label className="flex items-start gap-2 text-xs text-grey-600">
                <input type="checkbox" className="mt-0.5" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
                I understand this gives up a safeguard in {env}.
              </label>
            ) : null}
            {control.needsCode && control.enabled ? <p className="text-[11px] text-grey-500">Saving will ask for a code sent to your email.</p> : null}
            {problem ? <Note tone="bad">{problem}</Note> : null}
          </div>

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-grey-500">Changes so far</h3>
            {history.isLoading ? <p className="text-xs text-grey-500">Loading...</p> : history.error ? <p className="text-xs text-red">{controlError(history.error, 'The history could not be loaded.').message}</p> : (history.data ?? []).length === 0 ? (
              <p className="text-xs text-grey-500">No one has changed this yet. It uses the default for this kind of environment.</p>
            ) : (
              <ol className="max-h-40 space-y-1 overflow-auto">
                {(history.data ?? []).map((row, i) => (
                  <li key={`${row.at}-${i}`} className="text-xs text-grey-600"><span className="text-grey-500">{when(row.at)}</span> {row.summary} <span className="text-grey-500">by {describeActor(row.actor)}</span></li>
                ))}
              </ol>
            )}
          </section>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
            <ControlButton control={canSave ? { enabled: true } : { enabled: false, reason: control.enabled ? undefined : control.reason }} busy={save.isPending} onClick={submit} className="gap-2">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Save policy
            </ControlButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StepUpDialog
        open={needsCode} auth={auth} scope={stepUpScope.policy(productTag, env)} title="Confirm it is you"
        description={`Changing how ${env} is governed.`}
        onClose={() => setNeedsCode(false)} onGrant={async (grant) => { await save.mutateAsync(grant); }}
      />
    </>
  );
}

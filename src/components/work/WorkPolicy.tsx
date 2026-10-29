import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useWorkAuth, useWorkPolicy } from '@/hooks/useWork';
import { saveWorkPolicy, workErrorMessage, type IWorkPolicy } from '@/services/workServices';

type Draft = Pick<IWorkPolicy, 'approvers' | 'allow_self_approval' | 'critical_components' | 'agents_claim_unassigned'>;

function Choice({ name, value, current, disabled, onChange, children }: { name: string; value: string; current: string; disabled: boolean; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-grey">
      <input type="radio" name={name} value={value} checked={current === value} disabled={disabled} onChange={() => onChange(value)} className="mt-1" />
      <span>{children}</span>
    </label>
  );
}

/**
 * The workspace's rules for its work, for every product: who approves work that waits for a person, whether people
 * approve their own agents' work, which Ductape components make work critical, and whether agents may take work
 * nobody assigned. The owner and admins change it; everyone else reads it.
 */
export default function WorkPolicy() {
  const auth = useWorkAuth();
  const queryClient = useQueryClient();
  const policy = useWorkPolicy();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [critical, setCritical] = useState('');
  useEffect(() => {
    if (!policy.data) return;
    setDraft({ approvers: policy.data.approvers, allow_self_approval: policy.data.allow_self_approval, critical_components: policy.data.critical_components, agents_claim_unassigned: policy.data.agents_claim_unassigned });
    setCritical(policy.data.critical_components.join(', '));
  }, [policy.data]);
  const save = useMutation({
    mutationFn: () => saveWorkPolicy(auth!, { ...draft!, critical_components: critical.split(',').map((s) => s.trim()).filter(Boolean) }),
    onSuccess: () => {
      toast.success('Work policy saved');
      queryClient.invalidateQueries({ queryKey: ['work'] });
    },
    onError: (e) => toast.error(workErrorMessage(e)),
  });

  if (policy.isLoading || !draft) return <p className="text-sm text-grey-600">Reading the work policy</p>;
  if (policy.error) return <p className="text-sm text-orange">Could not read the work policy: {workErrorMessage(policy.error)}</p>;
  const locked = !policy.data!.can_change;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  return (
    <section className="overflow-hidden rounded-xl border border-grey-400 bg-white" data-testid="work-policy">
      <header className="border-b border-grey-400 px-4 py-3">
        <h3 className="text-sm font-semibold text-grey">Work policy</h3>
        <p className="text-xs text-grey-600">
          Applies to work in every product of this workspace. {locked ? 'Only the owner and admins change it.' : `You are the workspace ${policy.data!.your_role}, so you can change it.`}
        </p>
      </header>
      <div className="grid gap-6 p-4 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-grey-600">Who approves critical work</legend>
          <Choice name="approvers" value="members" current={draft.approvers} disabled={locked} onChange={(v) => set({ approvers: v as Draft['approvers'] })}>Anyone in the workspace</Choice>
          <Choice name="approvers" value="admins" current={draft.approvers} disabled={locked} onChange={(v) => set({ approvers: v as Draft['approvers'] })}>Only the owner and admins</Choice>
          <label className="flex items-start gap-2 pt-1 text-sm text-grey">
            <input type="checkbox" checked={!draft.allow_self_approval} disabled={locked} onChange={(e) => set({ allow_self_approval: !e.target.checked })} className="mt-1" />
            <span>Someone else approves: nobody approves work their own agent did</span>
          </label>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-grey-600">Agents</legend>
          <Choice name="claim" value="any" current={draft.agents_claim_unassigned ? 'any' : 'assigned'} disabled={locked} onChange={(v) => set({ agents_claim_unassigned: v === 'any' })}>Agents may take any ready work</Choice>
          <Choice name="claim" value="assigned" current={draft.agents_claim_unassigned ? 'any' : 'assigned'} disabled={locked} onChange={(v) => set({ agents_claim_unassigned: v === 'any' })}>Agents take only work assigned to them or their person</Choice>
        </fieldset>
        <fieldset className="space-y-2 md:col-span-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-grey-600">Always critical</legend>
          <p className="text-xs text-grey-600">Work that names one of these Ductape components is critical: when an agent finishes it, it waits for a person. Use type:tag, with * for any, separated by commas.</p>
          <input
            aria-label="Critical components"
            value={critical}
            disabled={locked}
            onChange={(e) => setCritical(e.target.value)}
            placeholder="database:*, app:ductape:paystack*, job:nightly-settlement"
            className="w-full rounded-md border border-grey-400 bg-white px-3 py-2 font-mono text-sm text-grey"
          />
        </fieldset>
      </div>
      {locked ? null : (
        <footer className="border-t border-grey-400 px-4 py-3">
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>Save policy</Button>
        </footer>
      )}
    </section>
  );
}

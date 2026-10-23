import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createPlan, type IDeployAuth } from '@/services/deployServices';
import {
  useCloudConnectionsForDeploy, useDeployCapabilities, useProductReleases, useRefreshDeploy,
} from '@/hooks/useDeployControls';
import { useProductEnvironments } from '@/hooks/useProductDeployments';
import { buildNewPlanRequest, controlError, newPlanGate, releaseFitsTarget, targetOptions } from '@/utils/deployControls';
import { describePolicy, compareVersions } from '@/utils/deployments';
import { Field, NativeSelect, Note } from './controls';
import TrafficPicker from './TrafficPicker';

/**
 * A new plan for a release. Plans change nothing: they say what would change, and wait for a decision. The dialog is only
 * offered where the server reads the state of the cloud itself, and a connection that could not deploy is shown with the reason.
 */
export default function NewPlanDialog({
  auth, productTag, open, onClose, onCreated,
}: { auth: IDeployAuth; productTag: string; open: boolean; onClose: () => void; onCreated: (planId: string) => void }) {
  const caps = useDeployCapabilities();
  const releases = useProductReleases(productTag, open);
  const environments = useProductEnvironments(productTag);
  const connections = useCloudConnectionsForDeploy(open);
  const refresh = useRefreshDeploy();
  const [releaseHash, setReleaseHash] = useState('');
  const [env, setEnv] = useState('');
  const [targetKey, setTargetKey] = useState('');
  const [region, setRegion] = useState('');
  const [traffic, setTraffic] = useState('10');
  const [problem, setProblem] = useState<string | undefined>();

  const gate = newPlanGate(caps.data);
  const targets = useMemo(() => targetOptions(connections.data ?? [], caps.data), [connections.data, caps.data]);
  const release = (releases.data ?? []).find((r) => r.releaseHash === releaseHash);
  const target = targets.find((t) => t.key === targetKey);
  const activeEnvs = (environments.data ?? []).filter((e) => e.active);
  const policy = activeEnvs.find((e) => e.slug === env)?.policy;
  const sortedReleases = useMemo(
    () => [...(releases.data ?? [])].sort((a, b) => a.name.localeCompare(b.name) || compareVersions(b.version, a.version)),
    [releases.data],
  );

  useEffect(() => { if (open) { setProblem(undefined); } }, [open]);
  useEffect(() => { if (target && !region) setRegion(target.defaultRegion); }, [target, region]);

  const create = useMutation({
    mutationFn: () => createPlan(auth, buildNewPlanRequest({ product: productTag, release, env, target, region, trafficPercent: traffic })),
    onSuccess: async (plan) => { toast.success('Plan made. Nothing has changed in your cloud yet.'); await refresh(); onCreated(plan.id); },
    onError: (error) => setProblem(controlError(error, 'The plan could not be made.').message),
  });

  const submit = () => {
    setProblem(undefined);
    try { buildNewPlanRequest({ product: productTag, release, env, target, region, trafficPercent: traffic }); } catch (e) { setProblem((e as Error).message); return; }
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !create.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New plan</DialogTitle>
          <DialogDescription>Choose a release and where it should go. You will review exactly what would change before anything happens.</DialogDescription>
        </DialogHeader>
        {!gate.enabled ? <Note tone="info">{gate.reason}</Note> : null}
        <div className="space-y-3">
          <Field label="Release" htmlFor="plan-release" hint={releases.data && releases.data.length === 0 ? 'No releases are registered for this product yet. Build one first.' : undefined}>
            <NativeSelect id="plan-release" value={releaseHash} onChange={(event) => setReleaseHash(event.target.value)} disabled={!gate.enabled}>
              <option value="">Choose a release</option>
              {sortedReleases.map((r) => {
                const fits = releaseFitsTarget(r, target?.targetKind);
                return (
                  <option key={r.releaseHash} value={r.releaseHash} disabled={!fits.enabled} title={fits.reason}>
                    {r.name} {r.version} ({r.artifact === 'worker_bundle' ? 'worker bundle' : r.kind}) · {r.releaseHash.replace(/^sha256:/, '').slice(0, 8)}{fits.enabled ? '' : ' - not for this target'}
                  </option>
                );
              })}
            </NativeSelect>
          </Field>
          <Field label="Environment" htmlFor="plan-env" hint={policy ? describePolicy(policy).detail : undefined}>
            <NativeSelect id="plan-env" value={env} onChange={(event) => setEnv(event.target.value)} disabled={!gate.enabled}>
              <option value="">Choose an environment</option>
              {activeEnvs.map((e) => <option key={e.slug} value={e.slug}>{e.name && e.name !== e.slug ? `${e.name} (${e.slug})` : e.slug}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Cloud connection" htmlFor="plan-connection" hint={target && !target.enabled ? target.reason : undefined}>
            <NativeSelect id="plan-connection" value={targetKey} onChange={(event) => { setTargetKey(event.target.value); setRegion(''); }} disabled={!gate.enabled}>
              <option value="">Choose a connection</option>
              {targets.map((t) => <option key={t.key} value={t.key}>{t.label}{t.enabled ? '' : ' - unavailable'}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Region" htmlFor="plan-region" hint="A location in that cloud, such as europe-west2, eu-west-2 or uksouth.">
            <Input id="plan-region" value={region} onChange={(event) => setRegion(event.target.value)} disabled={!gate.enabled} placeholder="europe-west2" />
          </Field>
          <TrafficPicker value={traffic} onChange={setTraffic} />
        </div>
        {problem ? <Note tone="bad">{problem}</Note> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={!gate.enabled || create.isPending} className="gap-2">
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Make the plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

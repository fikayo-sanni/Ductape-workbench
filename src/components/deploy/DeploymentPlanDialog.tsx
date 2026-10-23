import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createDeploymentPlan, type IDeployAuth } from '@/services/deployServices';
import { useDeployCapabilities, useRefreshDeploy } from '@/hooks/useDeployControls';
import { buildDeploymentPlanRequest, controlError, deploymentIntents, type DeploymentIntent } from '@/utils/deployControls';
import { formatTraffic, shortHash, type IDeployment } from '@/utils/deployments';
import { cn } from '@/lib/utils';
import { Note } from './controls';
import TrafficPicker from './TrafficPicker';

/** Plans a change to a deployment that exists: more or less traffic, a redeploy, or a rollback. Each says why it is unavailable. */
export default function DeploymentPlanDialog({
  auth, deployment, initialIntent, onClose, onCreated,
}: { auth: IDeployAuth; deployment: IDeployment | null; initialIntent?: DeploymentIntent; onClose: () => void; onCreated: (planId: string) => void }) {
  const caps = useDeployCapabilities();
  const refresh = useRefreshDeploy();
  const [intent, setIntent] = useState<DeploymentIntent>('traffic');
  const [traffic, setTraffic] = useState('100');
  const [problem, setProblem] = useState<string | undefined>();

  useEffect(() => {
    if (deployment) { setIntent(initialIntent ?? 'traffic'); setTraffic(String(Math.min(100, Math.max(0, Math.round(deployment.trafficPercent))))); setProblem(undefined); }
  }, [deployment, initialIntent]);

  const create = useMutation({
    mutationFn: () => createDeploymentPlan(auth, deployment!.id, buildDeploymentPlanRequest(deployment!, intent, traffic)),
    onSuccess: async (plan) => { toast.success('Plan made. Nothing has changed in your cloud yet.'); await refresh(); onCreated(plan.id); },
    onError: (error) => setProblem(controlError(error, 'The plan could not be made.').message),
  });

  if (!deployment) return null;
  const options = deploymentIntents(deployment, caps.data);
  const chosen = options.find((o) => o.intent === intent);

  const submit = () => {
    setProblem(undefined);
    try { buildDeploymentPlanRequest(deployment, intent, traffic); } catch (e) { setProblem((e as Error).message); return; }
    create.mutate();
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next && !create.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {deployment.name} {deployment.version}</DialogTitle>
          <DialogDescription>
            {deployment.env} · currently {formatTraffic(deployment.trafficPercent)} on release {shortHash(deployment.releaseHash)}. A plan changes nothing until it is approved and applied.
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="What to do" className="space-y-2">
          {options.map((option) => (
            <label
              key={option.intent}
              className={cn('flex cursor-pointer items-start gap-3 rounded-md border p-3', intent === option.intent ? 'border-primary bg-primary/5' : 'border-grey-300', !option.enabled && 'cursor-not-allowed opacity-60')}
            >
              <input type="radio" name="intent" className="mt-1" checked={intent === option.intent} disabled={!option.enabled} onChange={() => setIntent(option.intent)} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-grey">{option.label}</span>
                <span className="block text-xs text-grey-500">{option.enabled ? option.detail : option.reason}</span>
              </span>
            </label>
          ))}
        </div>
        {intent === 'traffic' && chosen?.enabled ? <TrafficPicker value={traffic} onChange={setTraffic} from={deployment.trafficPercent} /> : null}
        {intent === 'rollback' && chosen?.enabled ? (
          <Note tone="info">Goes back to release {shortHash(deployment.lastGoodReleaseHash)}, the last one that was serving all traffic, and sends it 100%.</Note>
        ) : null}
        {problem ? <Note tone="bad">{problem}</Note> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={!chosen?.enabled || create.isPending} className="gap-2">
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Make the plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

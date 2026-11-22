import { Clock3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DeploymentActivityBadges({ pendingPlans, inProgress, collapsed = false }: { pendingPlans: number; inProgress: number; collapsed?: boolean }) {
  return <>
    {pendingPlans > 0 ? <span data-testid="deployment-pending-plans" title={`${pendingPlans} pending ${pendingPlans === 1 ? 'plan' : 'plans'} to review or apply`} aria-label={`${pendingPlans} pending deployment plans`} className={cn('inline-flex items-center gap-1 rounded bg-orange/10 px-1.5 py-0.5 text-[10px] font-medium text-orange', collapsed && 'absolute -right-1 -top-1 rounded-full bg-orange text-white')}><Clock3 aria-hidden="true" className="h-3 w-3" />{pendingPlans > 9 && collapsed ? '9+' : pendingPlans}</span> : null}
    {inProgress > 0 ? <span data-testid="deployment-in-progress" title={`${inProgress} ${inProgress === 1 ? 'deployment' : 'deployments'} in progress`} aria-label={`${inProgress} deployments in progress`} className={cn('inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary', collapsed && 'absolute -bottom-1 -left-1 rounded-full bg-primary text-white')}><Loader2 aria-hidden="true" className="h-3 w-3 motion-safe:animate-spin" />{inProgress > 9 && collapsed ? '9+' : inProgress}</span> : null}
  </>;
}

export function DeploymentActivityNotice({ pendingPlans, needsApproval, readyToApply, inProgress, onPlans, onDeployments }: { pendingPlans: number; needsApproval: number; readyToApply: number; inProgress: number; onPlans: () => void; onDeployments: () => void }) {
  if (!pendingPlans && !inProgress) return null;
  return <div className="flex flex-wrap gap-3" aria-label="Deployment activity" role="status">
    {pendingPlans > 0 ? <button type="button" onClick={onPlans} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-orange/30 bg-orange/5 px-4 py-3 text-left hover:bg-orange/10"><Clock3 aria-hidden="true" className="h-5 w-5 shrink-0 text-orange" /><span className="flex-1"><span className="block text-sm font-medium text-grey">{pendingPlans} pending {pendingPlans === 1 ? 'plan' : 'plans'}</span><span className="text-xs text-grey-600">{[needsApproval ? `${needsApproval} need approval` : '', readyToApply ? `${readyToApply} ready to apply` : ''].filter(Boolean).join(' · ')}</span></span><span className="text-xs font-medium text-primary">Review plans</span></button> : null}
    {inProgress > 0 ? <button type="button" onClick={onDeployments} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10"><Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary motion-safe:animate-spin" /><span className="flex-1"><span className="block text-sm font-medium text-grey">{inProgress} {inProgress === 1 ? 'deployment' : 'deployments'} in progress</span><span className="text-xs text-grey-600">Updates automatically as the rollout progresses</span></span><span className="text-xs font-medium text-primary">View deployments</span></button> : null}
  </div>;
}

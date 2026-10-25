import { AlertTriangle, Cloud, CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, Pill } from '@/components/tabs/ProductSection';
import { useInfraSummaryData } from '@/hooks/useInfraSummary';
import { WORKSPACE_DEPLOYMENTS_LIMIT } from '@/services/deployServices';
import { describeState, describeTarget, formatTraffic, type IDeployment } from '@/utils/deployments';
import { capabilityNotices } from '@/utils/deployControls';
import { summarizeConnections, summarizeDeployments, type IGroupCount } from '@/utils/infraSummary';
import { formatCount, timeAgo } from '@/utils/platformHealth';

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'bad' | 'warn' | 'good' }) {
  return (
    <div className="rounded-lg border border-grey-400 p-3">
      <p className={cn('text-xl font-bold tabular-nums', tone === 'bad' ? 'text-red' : tone === 'warn' ? 'text-orange' : tone === 'good' ? 'text-green' : 'text-grey')}>{formatCount(value)}</p>
      <p className="text-[11px] text-grey-600 sm:text-xs">{label}</p>
    </div>
  );
}

function Groups({ title, groups }: { title: string; groups: IGroupCount[] }) {
  if (groups.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">{title}</p>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <span key={group.key} className="inline-flex items-center gap-1.5 rounded-md border border-grey-400 px-2 py-1 text-xs text-grey">
            <span className="font-medium">{group.label}</span>
            <span className="tabular-nums text-grey-600">{group.total}</span>
            {group.attention > 0 ? <span className="tabular-nums text-red">{group.attention} failing</span> : null}
            {group.inFlight > 0 ? <span className="tabular-nums text-primary">{group.inFlight} moving</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeploymentRow({ deployment }: { deployment: IDeployment }) {
  const state = describeState(deployment.state);
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-grey">{deployment.name} <span className="font-normal text-grey-600">v{deployment.version}</span></p>
        <p className="truncate text-xs text-grey-600">{deployment.product} · {deployment.env} · {describeTarget(deployment.target)}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <Pill tone={state.tone}>{state.label}</Pill>
        <span className="text-[11px] text-grey-600">{deployment.state === 'active' ? `${formatTraffic(deployment.trafficPercent)} · ` : ''}{timeAgo(deployment.updatedAt)}</span>
      </div>
    </div>
  );
}

/** What is deployed and how it is doing, and which cloud accounts are connected and ready to deploy through. */
export default function InfraSummary() {
  const { deployments, plans, builds, capabilities, connections } = useInfraSummaryData();
  // What the server says it can do is used only when it looks like that; anything else is treated as not known.
  const caps = capabilities.data && typeof capabilities.data === 'object' && !Array.isArray(capabilities.data) && 'stepUp' in capabilities.data ? capabilities.data : undefined;
  const deployList = Array.isArray(deployments.data) ? deployments.data : [];
  const deploy = summarizeDeployments(deployList, Array.isArray(plans.data) ? plans.data : [], Array.isArray(builds.data) ? builds.data : []);
  const cloud = summarizeConnections(Array.isArray(connections.data) ? connections.data : [], caps, deployList);
  const notices = capabilityNotices(caps);
  const capped = deployList.length >= WORKSPACE_DEPLOYMENTS_LIMIT;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2" data-testid="infra-summary">
      <Panel title="Deployments" description={capped ? `The latest ${WORKSPACE_DEPLOYMENTS_LIMIT}.` : 'What is deployed in your own clouds.'} flush action={<Rocket className="h-4 w-4 text-grey-600" />}>
        {deployments.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-grey-600"><Loader2 className="h-4 w-4 animate-spin text-primary" />Reading deployments...</div>
        ) : deployments.isError ? (
          <p className="px-4 py-6 text-sm text-grey-600">Deployments could not be loaded. They are read from Ductape Deploy, which may not be available on this server.</p>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Deployments" value={deploy.total} />
              <Tile label="Active" value={deploy.active} tone={deploy.active > 0 ? 'good' : undefined} />
              <Tile label="In progress" value={deploy.inFlight} />
              <Tile label="Need attention" value={deploy.attention} tone={deploy.attention > 0 ? 'bad' : undefined} />
            </div>
            {notices.map((notice) => (
              <p key={notice.text} className="flex items-start gap-2 rounded-md bg-orange/5 px-3 py-2 text-xs text-grey"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange" />{notice.text}</p>
            ))}
            {deploy.plansAwaitingApproval > 0 || deploy.plansBlocked > 0 || deploy.builds.failed > 0 || deploy.builds.inFlight > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {deploy.plansAwaitingApproval > 0 ? <Pill tone="warn">{deploy.plansAwaitingApproval} {deploy.plansAwaitingApproval === 1 ? 'plan waits' : 'plans wait'} for approval</Pill> : null}
                {deploy.plansBlocked > 0 ? <Pill tone="bad">{deploy.plansBlocked} blocked {deploy.plansBlocked === 1 ? 'plan' : 'plans'}</Pill> : null}
                {deploy.builds.inFlight > 0 ? <Pill tone="info">{deploy.builds.inFlight} {deploy.builds.inFlight === 1 ? 'build' : 'builds'} running</Pill> : null}
                {deploy.builds.failed > 0 ? <Pill tone="bad">{deploy.builds.failed} failed {deploy.builds.failed === 1 ? 'build' : 'builds'}</Pill> : null}
              </div>
            ) : null}
            <Groups title="By environment" groups={deploy.byEnvironment} />
            <Groups title="Where they run" groups={deploy.byTarget} />
          </div>
        )}
        {!deployments.isLoading && !deployments.isError ? (
          deploy.total === 0 ? (
            <div className="flex items-center gap-2 border-t border-grey-400 px-4 py-5 text-sm text-grey-600"><Rocket className="h-4 w-4" />Nothing is deployed yet. Connect a cloud with the deploy scope, build a release and plan a deployment.</div>
          ) : (
            <div className="border-t border-grey-400">
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-grey-600">{deploy.needsAttention.length > 0 ? 'Needs attention' : 'Latest deployments'}</p>
              <div className="divide-y divide-grey-400/60">
                {(deploy.needsAttention.length > 0 ? deploy.needsAttention : deploy.recent).map((d) => <DeploymentRow key={d.id} deployment={d} />)}
              </div>
            </div>
          )
        ) : null}
      </Panel>

      <Panel title="Cloud connections" description="The cloud accounts your workspace is connected to." flush action={<Cloud className="h-4 w-4 text-grey-600" />}>
        {connections.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-grey-600"><Loader2 className="h-4 w-4 animate-spin text-primary" />Reading cloud connections...</div>
        ) : connections.isError ? (
          <p className="px-4 py-6 text-sm text-grey-600">Cloud connections could not be loaded.</p>
        ) : cloud.total === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-grey-600"><Cloud className="h-4 w-4" />No cloud is connected yet. Connect one under Cloud in the sidebar.</div>
        ) : (
          <>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Connections" value={cloud.total} />
                <Tile label="Active" value={cloud.active} tone={cloud.active > 0 ? 'good' : undefined} />
                <Tile label="Not active" value={cloud.notActive} tone={cloud.notActive > 0 ? 'warn' : undefined} />
                <Tile label="Ready to deploy" value={cloud.deployReady} tone={cloud.deployReady > 0 ? 'good' : undefined} />
              </div>
              <div className="flex flex-wrap gap-2">
                {cloud.byProvider.map((provider) => (
                  <span key={provider.provider} className="inline-flex items-center gap-1.5 rounded-md border border-grey-400 px-2 py-1 text-xs text-grey">
                    <span className="font-medium">{provider.label}</span><span className="tabular-nums text-grey-600">{provider.active}/{provider.total} active</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="max-h-[22rem] divide-y divide-grey-400/60 overflow-y-auto border-t border-grey-400">
              {cloud.rows.map((row) => (
                <div key={row.tag} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-grey">{row.name} <span className="font-normal text-grey-600">{row.providerLabel}</span></p>
                    <p className={cn('truncate text-xs', row.deployReady ? 'text-grey-600' : row.deployNote ? 'text-orange' : 'text-grey-600')} title={row.deployNote}>
                      {row.deployReady ? `Deploys to ${row.targets.join(', ')}` : row.deployNote ?? 'Not used for deployments'}
                      {row.deployments > 0 ? ` · ${row.deployments} ${row.deployments === 1 ? 'deployment' : 'deployments'}` : ''}
                    </p>
                  </div>
                  <span className="flex flex-shrink-0 items-center gap-1.5">
                    {row.deployReady ? <CheckCircle2 className="h-3.5 w-3.5 text-green" aria-label="Ready to deploy" /> : null}
                    <Pill tone={row.statusTone}>{row.statusLabel}</Pill>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

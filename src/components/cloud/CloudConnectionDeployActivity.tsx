import { ExternalLink, Rocket } from 'lucide-react';
import { useConnectionDeployActivity } from '@/hooks/useProductDeployments';
import {
  buildTotals, deployErrorMessage, describeBuildStatus, describeState, formatTraffic, hasDeployScope, shortHash, totals,
  type DeployableKind, type IBuild, type IDeployment,
} from '@/utils/deployments';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, StatTile, StatusDot, type SectionTint } from '@/components/tabs/ProductSection';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };

const when = (value: string | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

function KindLabel({ kind }: { kind: DeployableKind }) {
  return <span className="text-[10px] uppercase tracking-wide text-grey-600">{kind === 'service' ? 'Service' : 'Function'}</span>;
}

function DeploymentRow({ d }: { d: IDeployment }) {
  const state = describeState(d.state);
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium text-grey">{d.name}</div>
        <KindLabel kind={d.kind} />
      </td>
      <td className="px-4 py-3 text-xs text-grey-600 break-all">{d.product}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{d.version}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs">{d.env}</td>
      <td className="px-4 py-3">
        <Pill tone={state.tone}>
          <StatusDot tone={state.tone} />
          {state.label}
        </Pill>
      </td>
      <td className="whitespace-nowrap px-4 py-3">{formatTraffic(d.trafficPercent)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">{when(d.updatedAt)}</td>
    </tr>
  );
}

function BuildRow({ b }: { b: IBuild }) {
  const status = describeBuildStatus(b.status);
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium text-grey">{b.name}</div>
        <KindLabel kind={b.kind} />
      </td>
      <td className="px-4 py-3 text-xs text-grey-600 break-all">{b.product}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{b.version}</td>
      <td className="px-4 py-3">
        <Pill tone={status.tone}>
          <StatusDot tone={status.tone} />
          {status.label}
        </Pill>
        {b.error ? (
          <p className="mt-1 max-w-xs text-[11px] text-red break-words">
            <span className="font-medium">{b.error.code}</span>: {b.error.message}
          </p>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">{b.region}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs" title={b.imageDigest}>{shortHash(b.imageDigest)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">
        {when(b.createdAt)}
        {b.logUrl ? (
          <a href={b.logUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
            Logs <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </td>
    </tr>
  );
}

/**
 * What ran through one cloud connection: the builds started in its project and the deployments applied to it, across every product.
 * Only a deploy-scoped connection can have either, so any other connection says how to get one.
 */
export default function CloudConnectionDeployActivity({ connection }: { connection: { tag?: string; scopes?: string[]; provider?: string } }) {
  const canDeploy = hasDeployScope(connection.scopes);
  const { deployments, builds } = useConnectionDeployActivity(connection.tag, true);
  const failure = deployments.error ?? builds.error;
  const loading = deployments.isLoading || builds.isLoading;
  const deployed = deployments.data ?? [];
  const built = builds.data ?? [];
  const d = totals(deployed);
  const b = buildTotals(built);

  if (loading) return <SectionLoading label="Loading deployments and builds..." />;
  if (failure) return <SectionError onRetry={() => { void deployments.refetch(); void builds.refetch(); }}>{deployErrorMessage(failure)}</SectionError>;

  return (
    <div className="space-y-4" data-testid="connection-deploy-activity">
      {!canDeploy ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-grey-700">
          <p className="font-medium text-grey">This connection was not created for deploys</p>
          <p className="mt-1 text-xs leading-relaxed text-grey-600">
            Builds and deployments need the deploy scope. Create a connection with it from a terminal:{' '}
            <code className="rounded bg-white px-1 py-0.5 text-[11px]">ductape cloud connections create --provider gcp --name &quot;&lt;name&gt;&quot; --tag &lt;tag&gt; --deploy</code>.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Deployments" value={d.total} />
        <StatTile label="Active" value={d.active} tone={d.active > 0 ? 'good' : 'neutral'} />
        <StatTile label="Builds" value={b.total} hint={b.inFlight > 0 ? `${b.inFlight} running` : undefined} />
        <StatTile label="Needs attention" value={d.attention + b.failed} tone={d.attention + b.failed > 0 ? 'bad' : 'neutral'} hint="failed or rolled back" />
      </div>

      <Panel title="Deployments" description="What was applied to this cloud account through this connection, across every product." flush>
        {deployed.length === 0 ? (
          <SectionEmpty icon={Rocket} tint={TINT} title="Nothing deployed through this connection" description="Deployments appear here once a plan is applied that targets this connection." />
        ) : (
          <DataTable head={['Name', 'Product', 'Version', 'Environment', 'State', 'Traffic', 'Updated']} minWidth={760}>
            {deployed.map((row) => <DeploymentRow key={row.id} d={row} />)}
          </DataTable>
        )}
      </Panel>

      <Panel title="Builds" description="Source built into images in your own project with Cloud Build. Ductape never receives the source." flush>
        {built.length === 0 ? (
          <SectionEmpty icon={Rocket} tint={TINT} title="No builds through this connection" description="Run a build with ductape deploy builds create, or from an assistant, and it appears here." />
        ) : (
          <DataTable head={['Name', 'Product', 'Version', 'Status', 'Region', 'Image', 'Started']} minWidth={820}>
            {built.map((row) => <BuildRow key={row.id} b={row} />)}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}

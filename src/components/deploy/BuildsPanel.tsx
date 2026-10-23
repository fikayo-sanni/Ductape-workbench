import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Hammer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelBuild, type IDeployAuth } from '@/services/deployServices';
import { useProductBuilds, useRefreshDeploy } from '@/hooks/useDeployControls';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import { buildCancelControl, controlError } from '@/utils/deployControls';
import { buildTotals, describeBuildStatus, shortHash, type IBuild } from '@/utils/deployments';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, StatTile, StatusDot, type SectionTint } from '@/components/tabs/ProductSection';
import { ControlButton, Note, when } from './controls';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };

/** Source built into an image in the customer's own cloud. A build that is waiting or running can be stopped; one that finished cannot. */
export default function BuildsPanel({ productTag }: { productTag: string }) {
  const auth = useDeployAuth();
  const builds = useProductBuilds(productTag);
  const [open, setOpen] = useState<string | undefined>();
  const rows = builds.data ?? [];
  const totals = buildTotals(rows);

  if (!auth) return <SectionLoading label="Loading..." />;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Builds" value={totals.total} />
        <StatTile label="Running" value={totals.inFlight} tone={totals.inFlight > 0 ? 'info' : 'neutral'} />
        <StatTile label="Succeeded" value={totals.succeeded} tone={totals.succeeded > 0 ? 'good' : 'neutral'} />
        <StatTile label="Failed" value={totals.failed} tone={totals.failed > 0 ? 'bad' : 'neutral'} />
      </div>
      <Panel
        title="Builds" description="Newest first. Source goes straight to your own cloud and is never held by Ductape." flush
        action={<Button variant="outline" size="sm" onClick={() => void builds.refetch()} disabled={builds.isFetching} aria-label="Refresh builds"><RefreshCw className={builds.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /></Button>}
      >
        {builds.isLoading ? <SectionLoading label="Loading builds..." /> : builds.error ? (
          <div className="p-4"><SectionError onRetry={() => void builds.refetch()}>{controlError(builds.error, 'The builds could not be loaded.').message}</SectionError></div>
        ) : rows.length === 0 ? (
          <SectionEmpty icon={Hammer} tint={TINT} title="No builds yet" description={<>Start one from a terminal: <code className="rounded bg-grey-100 px-1 py-0.5 text-[11px]">ductape deploy builds create --file build.json --dir ./src --wait</code></>} />
        ) : (
          <DataTable head={['Name', 'Version', 'Status', 'Cloud', 'Started', '']} minWidth={760}>
            {rows.map((build) => <BuildRow key={build.id} auth={auth} build={build} expanded={open === build.id} onToggle={() => setOpen(open === build.id ? undefined : build.id)} />)}
          </DataTable>
        )}
      </Panel>
    </>
  );
}

function BuildRow({ auth, build, expanded, onToggle }: { auth: IDeployAuth; build: IBuild; expanded: boolean; onToggle: () => void }) {
  const status = describeBuildStatus(build.status);
  const refresh = useRefreshDeploy();
  const [confirming, setConfirming] = useState(false);
  const stop = useMutation({
    mutationFn: () => cancelBuild(auth, build.id),
    onSuccess: async () => { setConfirming(false); toast.success('The build was stopped.'); await refresh(); },
    onError: (error) => { setConfirming(false); toast.error(controlError(error, 'The build could not be stopped.').message); },
  });
  const control = buildCancelControl(build.status);
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3">
          <button type="button" className="flex items-center gap-1.5 font-medium text-grey hover:text-primary" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{build.name}
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{build.version}</td>
        <td className="px-4 py-3"><Pill tone={status.tone}><StatusDot tone={status.tone} />{status.label}</Pill></td>
        <td className="px-4 py-3 text-xs text-grey-600">{build.connection} · {build.region}</td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">{when(build.createdAt)}</td>
        <td className="px-4 py-3 text-right">
          {control.enabled ? (confirming ? (
            <span className="inline-flex gap-1.5">
              <Button size="sm" variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}>Stop it</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={stop.isPending}>Keep going</Button>
            </span>
          ) : <ControlButton control={control} size="sm" variant="outline" onClick={() => setConfirming(true)} showReason={false}>Stop</ControlButton>) : null}
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={6} className="space-y-2 bg-grey-100 px-4 py-3 text-xs text-grey-600">
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div><dt className="text-[10px] uppercase tracking-wide text-grey-500">Builder</dt><dd>{build.builder}</dd></div>
              <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-grey-500">Image</dt><dd className="break-all font-mono">{build.imageRepository}{build.imageDigest ? `@${shortHash(build.imageDigest)}` : ''}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-wide text-grey-500">Release</dt><dd className="font-mono">{shortHash(build.releaseHash)}</dd></div>
            </dl>
            {build.error ? <Note tone="bad"><span className="font-medium">{build.error.code}</span>: {build.error.message}</Note> : null}
            {build.logUrl && /^https:\/\//.test(build.logUrl) ? <a className="text-primary underline" href={build.logUrl} target="_blank" rel="noopener noreferrer">Open the build log in your cloud</a> : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

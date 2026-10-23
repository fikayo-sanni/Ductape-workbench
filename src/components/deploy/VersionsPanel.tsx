import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Layers, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { deprecateVersion, retireVersion, undeprecateVersion, type IDeployAuth } from '@/services/deployServices';
import {
  useDeployCapabilities, useFunctionVersions, useProductFunctions, useRefreshDeploy, useVersionHistory, useWorkspaceAccessLevel,
} from '@/hooks/useDeployControls';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import {
  buildDeprecation, controlError, describeActor, describeVersionEvent, describeVersionStatus, replacementChoices, stepUpScope, versionControls, type IFunctionSummary, type IVersionRow,
} from '@/utils/deployControls';
import { compareVersions, describeTarget, formatTraffic } from '@/utils/deployments';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, SegmentedTabs, type SectionTint } from '@/components/tabs/ProductSection';
import { ControlButton, Field, NativeSelect, Note, when } from './controls';
import StepUpDialog from './StepUpDialog';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };

/**
 * The versions of each function or service: which are available, which are on their way out and which are retired. Deprecating and
 * restoring are reversible and need only a reason. Retiring is one way, so it asks for the version to be typed and, where the server
 * wants one, a code from the person's email.
 */
export default function VersionsPanel({ productTag }: { productTag: string }) {
  const auth = useDeployAuth();
  const functions = useProductFunctions(productTag);
  const [selected, setSelected] = useState<string | undefined>();
  const list = functions.data ?? [];
  const name = selected && list.some((f) => f.name === selected) ? selected : list[0]?.name;

  if (!auth) return <SectionLoading label="Loading..." />;
  if (functions.isLoading) return <SectionLoading label="Loading versions..." />;
  if (functions.error) return <SectionError onRetry={() => void functions.refetch()}>{controlError(functions.error, 'The versions could not be loaded.').message}</SectionError>;
  if (list.length === 0) {
    return <SectionEmpty icon={Layers} tint={TINT} title="No versions yet" description="Versions appear here once a release of a function or service is registered for this product." />;
  }
  const current = list.find((f) => f.name === name) as IFunctionSummary;
  return (
    <>
      {list.length > 1 ? <SegmentedTabs label="Function" value={current.name} onChange={setSelected} options={list.map((f) => ({ id: f.name, label: f.name }))} /> : null}
      <VersionsTable auth={auth} fn={current} />
    </>
  );
}

function VersionsTable({ auth, fn }: { auth: IDeployAuth; fn: IFunctionSummary }) {
  const versions = useFunctionVersions(fn.product, fn.name);
  const caps = useDeployCapabilities();
  const level = useWorkspaceAccessLevel();
  const [deprecating, setDeprecating] = useState<IVersionRow | null>(null);
  const [retiring, setRetiring] = useState<IVersionRow | null>(null);
  const [open, setOpen] = useState<string | undefined>();
  const refresh = useRefreshDeploy();

  const restore = useMutation({
    mutationFn: (version: string) => undeprecateVersion(auth, fn.product, fn.name, version),
    onSuccess: async () => { toast.success('Restored to available.'); await refresh(); },
    onError: (error) => toast.error(controlError(error, 'It could not be restored.').message),
  });

  const rows = versions.data ?? [];
  return (
    <Panel
      title={`${fn.name} (${fn.kind})`}
      description={`${fn.counts.available} available, ${fn.counts.deprecated} deprecated, ${fn.counts.retired} retired${fn.latestAvailable ? `. Newest available: ${fn.latestAvailable}` : ''}`}
      flush
      action={<Button variant="outline" size="sm" onClick={() => void versions.refetch()} disabled={versions.isFetching} aria-label="Refresh versions"><RefreshCw className={versions.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /></Button>}
    >
      {versions.isLoading ? <SectionLoading label="Loading versions..." /> : versions.error ? (
        <div className="p-4"><SectionError onRetry={() => void versions.refetch()}>{controlError(versions.error, 'The versions could not be loaded.').message}</SectionError></div>
      ) : (
        <DataTable head={['Version', 'Status', 'Serving', 'Releases', 'Actions']} minWidth={820}>
          {rows.map((row) => {
            const status = describeVersionStatus(row.status);
            const controls = versionControls(row, caps.data, level);
            const expanded = open === row.version;
            return (
              <FragmentRows key={row.version}>
                <tr className="align-top">
                  <td className="px-4 py-3">
                    <button type="button" className="flex items-center gap-1.5 font-mono text-xs text-grey hover:text-primary" onClick={() => setOpen(expanded ? undefined : row.version)} aria-expanded={expanded}>
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {row.version}
                    </button>
                    {row.isLatestAvailable ? <Pill tone="info" className="mt-1">Newest</Pill> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {row.deprecation ? (
                      <div className="mt-1 max-w-xs space-y-0.5 text-[11px] text-grey-500">
                        <p>{row.deprecation.reason}</p>
                        {row.deprecation.replacementVersion ? <p>Use {row.deprecation.replacementVersion} instead.</p> : null}
                        {row.deprecation.sunsetAt ? <p>Ends {new Date(row.deprecation.sunsetAt).toLocaleDateString()}.</p> : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-grey-600">
                    {row.serving.length === 0 ? 'Nowhere' : row.serving.map((s) => <p key={s.deploymentId}>{s.env} · {describeTarget({ kind: s.target.kind, connection: s.target.connection })} · {s.state} · {formatTraffic(s.trafficPercent)}</p>)}
                  </td>
                  <td className="px-4 py-3 text-xs text-grey-600">{row.releases}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      {row.status === 'available' ? <ControlButton control={controls.deprecate} size="sm" variant="outline" onClick={() => setDeprecating(row)}>Deprecate</ControlButton> : null}
                      {row.status === 'deprecated' ? (
                        <>
                          <ControlButton control={controls.undeprecate} size="sm" variant="outline" busy={restore.isPending && restore.variables === row.version} onClick={() => restore.mutate(row.version)}>Restore</ControlButton>
                          <ControlButton control={controls.retire} size="sm" variant="destructive" onClick={() => setRetiring(row)}>Retire</ControlButton>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {expanded ? <tr><td colSpan={5} className="bg-grey-100 px-4 py-3"><History productTag={fn.product} name={fn.name} version={row.version} /></td></tr> : null}
              </FragmentRows>
            );
          })}
        </DataTable>
      )}
      <DeprecateDialog auth={auth} fn={fn} version={deprecating} siblings={rows} onClose={() => setDeprecating(null)} />
      <RetireDialog auth={auth} fn={fn} version={retiring} onClose={() => setRetiring(null)} />
    </Panel>
  );
}

const FragmentRows = ({ children }: { children: React.ReactNode }) => <>{children}</>;

function History({ productTag, name, version }: { productTag: string; name: string; version: string }) {
  const history = useVersionHistory(productTag, name, version, true);
  if (history.isLoading) return <p className="text-xs text-grey-500">Loading the history...</p>;
  if (history.error) return <p className="text-xs text-red">{controlError(history.error, 'The history could not be loaded.').message}</p>;
  return (
    <ol className="space-y-1">
      {(history.data ?? []).map((event, i) => (
        <li key={`${event.at}-${i}`} className="flex flex-wrap gap-x-3 text-xs text-grey-600">
          <span className="text-grey-500">{when(event.at)}</span>
          <span>{describeVersionEvent(event)}</span>
          <span className="text-grey-500">by {describeActor(event.actor)}</span>
        </li>
      ))}
    </ol>
  );
}

function DeprecateDialog({ auth, fn, version, siblings, onClose }: { auth: IDeployAuth; fn: IFunctionSummary; version: IVersionRow | null; siblings: IVersionRow[]; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [sunset, setSunset] = useState('');
  const [replacement, setReplacement] = useState('');
  const [problem, setProblem] = useState<string | undefined>();
  const refresh = useRefreshDeploy();
  useEffect(() => { if (version) { setReason(''); setSunset(''); setReplacement(''); setProblem(undefined); } }, [version]);

  const choices = useMemo(() => (version ? replacementChoices(version.version, siblings, compareVersions) : []), [version, siblings]);
  const save = useMutation({
    mutationFn: () => deprecateVersion(auth, fn.product, fn.name, version!.version, buildDeprecation(version!.version, { reason, sunsetAt: sunset ? new Date(sunset).toISOString() : undefined, replacementVersion: replacement || undefined }, siblings, compareVersions)),
    onSuccess: async () => { toast.success('Version deprecated. Nothing running was changed.'); await refresh(); onClose(); },
    onError: (error) => setProblem(controlError(error, 'It could not be deprecated.').message),
  });
  if (!version) return null;
  return (
    <Dialog open onOpenChange={(next) => { if (!next && !save.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deprecate {fn.name} {version.version}</DialogTitle>
          <DialogDescription>It keeps running and can still be updated, but nothing new can start on it. You can restore it until it is retired.</DialogDescription>
        </DialogHeader>
        <Field label="Why is it being deprecated?" htmlFor="dep-reason" hint="People who use this version will see this.">
          <Textarea id="dep-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} />
        </Field>
        <Field label="Replacement (optional)" htmlFor="dep-replacement">
          <NativeSelect id="dep-replacement" value={replacement} onChange={(event) => setReplacement(event.target.value)}>
            <option value="">None</option>
            {choices.map((v) => <option key={v} value={v}>{v}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Ends on (optional)" htmlFor="dep-sunset" hint="A date in the future that people are told to move by.">
          <Input id="dep-sunset" type="date" value={sunset} onChange={(event) => setSunset(event.target.value)} />
        </Field>
        {problem ? <Note tone="bad">{problem}</Note> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setProblem(undefined); try { buildDeprecation(version.version, { reason, sunsetAt: sunset ? new Date(sunset).toISOString() : undefined, replacementVersion: replacement || undefined }, siblings, compareVersions); } catch (e) { setProblem((e as Error).message); return; } save.mutate(); }} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Deprecate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetireDialog({ auth, fn, version, onClose }: { auth: IDeployAuth; fn: IFunctionSummary; version: IVersionRow | null; onClose: () => void }) {
  const caps = useDeployCapabilities();
  const level = useWorkspaceAccessLevel();
  const refresh = useRefreshDeploy();
  const [typed, setTyped] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  useEffect(() => { if (version) { setTyped(''); setNeedsCode(false); setProblem(undefined); } }, [version]);

  const retire = useMutation({
    mutationFn: (grant?: string) => retireVersion(auth, fn.product, fn.name, version!.version, grant),
    onSuccess: async () => { setNeedsCode(false); toast.success('Version retired.'); await refresh(); onClose(); },
    onError: (error) => {
      const e = controlError(error, 'It could not be retired.');
      if (e.stepUpRequired) { setNeedsCode(true); return; }
      setNeedsCode(false); setProblem(e.message);
    },
  });
  if (!version) return null;
  const controls = versionControls(version, caps.data, level);
  const confirmed = typed.trim() === version.version;
  const go = () => { setProblem(undefined); if (controls.retireNeedsCode) setNeedsCode(true); else retire.mutate(undefined); };
  return (
    <>
      <Dialog open onOpenChange={(next) => { if (!next && !retire.isPending) onClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire {fn.name} {version.version}</DialogTitle>
            <DialogDescription>This cannot be undone. The version stops being routed to and cannot be brought back. No release or cloud resource is deleted.</DialogDescription>
          </DialogHeader>
          <Field label={`Type ${version.version} to confirm`} htmlFor="retire-confirm">
            <Input id="retire-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </Field>
          {controls.retireNeedsCode ? <p className="text-[11px] text-grey-500">You will be asked for a code sent to your email.</p> : null}
          {problem ? <Note tone="bad">{problem}</Note> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={retire.isPending}>Cancel</Button>
            <ControlButton control={controls.retire} busy={retire.isPending} variant="destructive" onClick={() => (confirmed ? go() : setProblem(`Type ${version.version} exactly to confirm.`))}>Retire this version</ControlButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StepUpDialog
        open={needsCode} auth={auth} scope={stepUpScope.retire(fn.product, fn.name, version.version)} title="Confirm it is you"
        description={`Retiring ${fn.name} ${version.version}. This cannot be undone.`}
        onClose={() => setNeedsCode(false)} onGrant={async (grant) => { await retire.mutateAsync(grant); }}
      />
    </>
  );
}

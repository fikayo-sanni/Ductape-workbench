import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, ArrowLeft, Check, Copy, FileCode, LayoutTemplate, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDeployAuth } from '@/hooks/useProductDeployments';
import type { IDeployAuth } from '@/services/deployServices';
import {
  checkActionAvailable, deprecateUiVersion, fetchUiFiles, fetchUiPiece, fetchUiPieces, fetchUiVersion, undeprecateUiVersion,
  type IUiVersionDetail, type IUiVersionSummary,
} from '@/services/uiServices';
import { FRAMEWORK_LABEL, formatBytes, integrationSnippet, localRequirementRows, requirementCount, type IRequirementRow } from '@/utils/uiPieces';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, SectionPage, SegmentedTabs, type SectionTint, type Tone } from './ProductSection';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };
type VersionView = 'overview' | 'use' | 'source' | 'requirements';
const VIEWS: Array<{ id: VersionView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'use', label: 'Use it' },
  { id: 'source', label: 'Source' },
  { id: 'requirements', label: 'Requirements' },
];

const when = (value: string | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
const day = (value: string | undefined) => {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : value ?? '-';
};
const errorText = (error: unknown) => {
  const data = (error as { response?: { data?: { errors?: unknown } } })?.response?.data;
  return typeof data?.errors === 'string' ? data.errors : error instanceof Error ? error.message : 'Something went wrong';
};
const keys = {
  list: (ws?: string, search?: string) => ['ui-pieces', ws, search ?? ''],
  piece: (ws?: string, name?: string) => ['ui-piece', ws, name],
  version: (ws?: string, name?: string, v?: string) => ['ui-version', ws, name, v],
  files: (ws?: string, name?: string, v?: string) => ['ui-files', ws, name, v],
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" aria-label={label}
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative rounded-lg border border-grey-400 bg-grey-100/60">
      <div className="absolute right-2 top-2"><CopyButton text={code} label={label} /></div>
      <pre className="overflow-x-auto p-3 pr-24 font-mono text-xs leading-relaxed text-grey">{code}</pre>
    </div>
  );
}

/** A deprecation note, as people installing the version will see it. */
function DeprecationNote({ version }: { version: IUiVersionSummary }) {
  if (!version.deprecation) return null;
  return (
    <p className="rounded-md bg-orange/5 px-3 py-2 text-xs text-grey">
      <span className="font-medium text-orange">Deprecated</span> {when(version.deprecation.at)}
      {version.deprecation.reason ? `: ${version.deprecation.reason.replace(/[.!?]?\s*$/, '.')}` : '.'}
      {version.deprecation.replacement ? ` Use ${version.deprecation.replacement} instead.` : ''}
    </p>
  );
}

function Overview({ detail }: { detail: IUiVersionDetail }) {
  const { manifest } = detail;
  const requires = manifest.requires ?? {};
  return (
    <div className="space-y-4">
      <DeprecationNote version={detail} />
      {manifest.description ? <p className="text-sm text-grey">{manifest.description}</p> : null}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        <div><dt className="text-grey-600">Framework</dt><dd className="text-grey">{FRAMEWORK_LABEL[manifest.framework] ?? manifest.framework}</dd></div>
        <div><dt className="text-grey-600">Entry</dt><dd className="font-mono text-grey">{manifest.entry}</dd></div>
        <div><dt className="text-grey-600">Published</dt><dd className="text-grey">{when(detail.publishedAt)}</dd></div>
        <div><dt className="text-grey-600">Size</dt><dd className="text-grey">{detail.files} files, {formatBytes(detail.bytes)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-grey-600">Integrity</dt><dd className="break-all font-mono text-grey">{detail.integrity}</dd></div>
      </dl>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">npm packages it needs</p>
          {Object.keys(manifest.peerDependencies ?? {}).length === 0 ? <p className="text-xs text-grey-600">None</p> : (
            <ul className="space-y-1 text-xs">{Object.entries(manifest.peerDependencies).map(([pkg, range]) => <li key={pkg} className="font-mono text-grey">{pkg} <span className="text-grey-600">{range}</span></li>)}</ul>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">Pieces it uses</p>
          {Object.keys(manifest.uses ?? {}).length === 0 ? <p className="text-xs text-grey-600">None</p> : (
            <ul className="space-y-1 text-xs">{Object.entries(manifest.uses ?? {}).map(([name, v]) => <li key={name} className="font-mono text-grey">{name}@{v}</li>)}</ul>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-grey-600">What it needs from the product</p>
          {requirementCount(requires) === 0 ? <p className="text-xs text-grey-600">Nothing declared</p> : (
            <ul className="space-y-1 text-xs text-grey">
              {(requires.actions ?? []).map((a) => <li key={`a:${a.app}/${a.action}`}>Action <span className="font-mono">{a.app}/{a.action}</span></li>)}
              {(requires.features ?? []).map((f) => <li key={`f:${f}`}>Feature <span className="font-mono">{f}</span></li>)}
              {(requires.sessions ?? []).map((s) => <li key={`s:${s}`}>Session <span className="font-mono">{s}</span></li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UseIt({ detail }: { detail: IUiVersionDetail }) {
  const snippet = integrationSnippet(detail.name, detail.version, detail.manifest.framework);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs text-grey-600">In the application's folder. It writes the verified source to <span className="font-mono">ductape/ui/installed/{detail.name}</span>, pins it in <span className="font-mono">ductape/ui.lock.json</span> and adds <span className="font-mono">#ui/{detail.name}</span> to package.json imports. Commit all three.</p>
        <CodeBlock code={snippet.command} label="Copy the add command" />
      </div>
      <div>
        <p className="mb-1.5 text-xs text-grey-600">Then import it. The product, environment and key come from the application's Ductape setup.</p>
        <CodeBlock code={snippet.code} label="Copy the import example" />
      </div>
      <p className="text-xs text-grey-600">In CI, <span className="font-mono">ductape ui verify</span> fails if anyone edits the added files. <span className="font-mono">ductape ui check</span> confirms the product has what the piece needs.</p>
    </div>
  );
}

function SourceViewer({ auth, name, version }: { auth: IDeployAuth; name: string; version: string }) {
  const files = useQuery({ queryKey: keys.files(auth.workspaceId, name, version), queryFn: () => fetchUiFiles(auth, name, version), staleTime: Infinity });
  const [open, setOpen] = useState<string | null>(null);
  if (files.isLoading) return <SectionLoading label="Reading the source..." />;
  if (files.error) return <SectionError onRetry={() => void files.refetch()}>The source could not be loaded: {errorText(files.error)}</SectionError>;
  const list = files.data ?? [];
  const current = list.find((f) => f.path === open) ?? list.find((f) => f.path.endsWith('.tsx') || f.path.endsWith('.vue')) ?? list[0];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]" data-testid="ui-source-viewer">
      <ul className="space-y-0.5 text-xs">
        {list.map((file) => (
          <li key={file.path}>
            <button
              type="button" onClick={() => setOpen(file.path)}
              className={cn('flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono', file.path === current?.path ? 'bg-primary/10 text-primary' : 'text-grey hover:bg-grey-100')}
            >
              <FileCode className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{file.path}</span>
              <span className="ml-auto text-[10px] text-grey-600">{formatBytes(file.bytes)}</span>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div className="min-w-0 rounded-lg border border-grey-400">
          <div className="flex items-center justify-between border-b border-grey-400 px-3 py-1.5">
            <span className="truncate font-mono text-xs text-grey">{current.path}</span>
            <CopyButton text={current.content} label={`Copy ${current.path}`} />
          </div>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full border-collapse font-mono text-xs leading-5">
              <tbody>
                {current.content.split('\n').map((line, index) => (
                  <tr key={index}>
                    <td className="select-none border-r border-grey-400/60 px-2 text-right align-top text-grey-600">{index + 1}</td>
                    <td className="whitespace-pre px-3 text-grey">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-grey-400 px-3 py-1.5 text-[11px] text-grey-600">Read-only. Pieces change only by publishing a new version.</p>
        </div>
      ) : <p className="text-xs text-grey-600">This version has no files.</p>}
    </div>
  );
}

const STATUS: Record<string, { tone: Tone; label: string }> = { ok: { tone: 'good', label: 'Available' }, missing: { tone: 'bad', label: 'Missing' }, unknown: { tone: 'warn', label: 'Could not check' } };

function Requirements({ auth, detail, product }: { auth: IDeployAuth; detail: IUiVersionDetail; product: any }) {
  const envs: Array<{ slug: string; name?: string }> = (Array.isArray(product?.envs) ? product.envs : [])
    .filter((e: any) => e && !e.deleted && e.slug).map((e: any) => ({ slug: e.slug, name: e.env_name ?? e.name }));
  const [env, setEnv] = useState<string>(envs[0]?.slug ?? '');
  const [rows, setRows] = useState<IRequirementRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const requires = detail.manifest.requires ?? {};
  const total = requirementCount(requires);

  const run = async () => {
    setChecking(true);
    try {
      const actionRows: IRequirementRow[] = [];
      for (const { app, action } of requires.actions ?? []) {
        try {
          const result = await checkActionAvailable(auth, product.tag, env, app, action);
          actionRows.push(result.ok ? { kind: 'action', ref: `${app}/${action}`, status: 'ok' } : { kind: 'action', ref: `${app}/${action}`, status: 'missing', detail: result.reason });
        } catch (error) {
          actionRows.push({ kind: 'action', ref: `${app}/${action}`, status: 'unknown', detail: errorText(error) });
        }
      }
      setRows([...actionRows, ...localRequirementRows(requires, product)]);
    } finally {
      setChecking(false);
    }
  };

  if (total === 0) return <p className="text-sm text-grey-600">This version declares nothing it needs from the product.</p>;
  const missing = rows?.filter((r) => r.status !== 'ok').length ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-grey-600">Check against {product?.name ?? product?.tag} in</span>
        <Select value={env} onValueChange={(value) => { setEnv(value); setRows(null); }}>
          <SelectTrigger className="h-8 w-40 text-xs" aria-label="Environment"><SelectValue placeholder="Environment" /></SelectTrigger>
          <SelectContent>{envs.map((e) => <SelectItem key={e.slug} value={e.slug}>{e.name ?? e.slug}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => void run()} disabled={!env || checking}>
          <ShieldCheck className={cn('h-3.5 w-3.5', checking && 'animate-pulse')} />
          {checking ? 'Checking...' : 'Check'}
        </Button>
        {rows ? <Pill tone={missing === 0 ? 'good' : 'bad'}>{missing === 0 ? 'Everything is available' : `${missing} not available`}</Pill> : null}
      </div>
      {rows ? (
        <DataTable head={['Needs', 'Status', 'Detail']}>
          {rows.map((row) => (
            <tr key={`${row.kind}:${row.ref}`}>
              <td className="px-4 py-2 text-xs text-grey"><span className="capitalize">{row.kind}</span> <span className="font-mono">{row.ref}</span></td>
              <td className="px-4 py-2"><Pill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Pill></td>
              <td className="px-4 py-2 text-xs text-grey-600">{row.detail ?? ''}</td>
            </tr>
          ))}
        </DataTable>
      ) : <p className="text-xs text-grey-600">{total} {total === 1 ? 'requirement' : 'requirements'}. "Could not check" is not a pass: the platform could not be asked.</p>}
    </div>
  );
}

function DeprecateDialog({ auth, name, target, versions, onClose }: { auth: IDeployAuth; name: string; target: IUiVersionSummary | null; versions: IUiVersionSummary[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [replacement, setReplacement] = useState<string>('none');
  const undeprecating = Boolean(target?.deprecated);
  const save = useMutation({
    mutationFn: () => undeprecating
      ? undeprecateUiVersion(auth, name, target!.version)
      : deprecateUiVersion(auth, name, target!.version, { reason: reason.trim(), ...(replacement !== 'none' ? { replacement } : {}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ui-piece', auth.workspaceId, name] });
      void queryClient.invalidateQueries({ queryKey: ['ui-version', auth.workspaceId, name] });
      void queryClient.invalidateQueries({ queryKey: ['ui-pieces', auth.workspaceId] });
      setReason('');
      setReplacement('none');
      onClose();
    },
  });
  const others = versions.filter((v) => v.version !== target?.version && !v.deprecated);
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => { if (!next && !save.isPending) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{undeprecating ? 'Undeprecate' : 'Deprecate'} {name}@{target?.version}</DialogTitle>
          <DialogDescription>
            {undeprecating
              ? 'It becomes a normal release again, and "latest" can pick it.'
              : 'Applications that already pinned it keep building with it. "latest" stops picking it, and anyone adding it by name sees your reason.'}
          </DialogDescription>
        </DialogHeader>
        {!undeprecating ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="ui-deprecate-reason" className="mb-1 block text-xs font-medium text-grey">Reason</label>
              <Textarea id="ui-deprecate-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="What is wrong with it, or why to move on" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-grey">Use instead (optional)</label>
              <Select value={replacement} onValueChange={setReplacement}>
                <SelectTrigger className="h-9 text-sm" aria-label="Replacement version"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No replacement</SelectItem>
                  {others.map((v) => <SelectItem key={v.version} value={v.version}>{v.version}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
        {save.error ? <p className="text-xs text-red">{errorText(save.error)}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || (!undeprecating && reason.trim() === '')} variant={undeprecating ? 'default' : 'destructive'}>
            {save.isPending ? 'Saving...' : undeprecating ? 'Undeprecate' : 'Deprecate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PieceDetail({ auth, name, product, onBack }: { auth: IDeployAuth; name: string; product: any; onBack: () => void }) {
  const piece = useQuery({ queryKey: keys.piece(auth.workspaceId, name), queryFn: () => fetchUiPiece(auth, name) });
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<VersionView>('overview');
  const [changing, setChanging] = useState<IUiVersionSummary | null>(null);
  const versions = piece.data?.versions ?? [];
  const current = picked ?? piece.data?.latest ?? versions[0]?.version;
  const detail = useQuery({ queryKey: keys.version(auth.workspaceId, name, current), queryFn: () => fetchUiVersion(auth, name, current!), enabled: Boolean(current) });
  const summary = versions.find((v) => v.version === current);

  return (
    <SectionPage
      icon={LayoutTemplate} tint={TINT} title={name}
      subtitle={piece.data ? `${FRAMEWORK_LABEL[piece.data.framework] ?? piece.data.framework} · latest ${piece.data.latest ?? 'none'}` : undefined}
      actions={<Button variant="outline" size="sm" className="gap-2" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" />All UI pieces</Button>}
    >
      {piece.isLoading ? <SectionLoading label="Reading versions..." /> : piece.error ? (
        <SectionError onRetry={() => void piece.refetch()}>{errorText(piece.error)}</SectionError>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Panel title="Versions" flush>
            <ul className="divide-y divide-grey-400/60" data-testid="ui-versions">
              {versions.map((v) => (
                <li key={v.version}>
                  <button
                    type="button" onClick={() => setPicked(v.version)}
                    className={cn('flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left', v.version === current ? 'bg-primary/5' : 'hover:bg-grey-100')}
                  >
                    <span className="min-w-0">
                      <span className={cn('block font-mono text-sm', v.version === current ? 'text-primary' : 'text-grey')}>{v.version}</span>
                      <span className="block text-[11px] text-grey-600" title={when(v.publishedAt)}>{day(v.publishedAt)}</span>
                    </span>
                    {v.deprecated ? <Pill tone="warn">Deprecated</Pill> : v.version === piece.data?.latest ? <Pill tone="good">Latest</Pill> : null}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel
            title={current ? `${name}@${current}` : 'Version'}
            action={summary ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setChanging(summary)}>
                {summary.deprecated ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {summary.deprecated ? 'Undeprecate' : 'Deprecate'}
              </Button>
            ) : undefined}
          >
            <div className="mb-4"><SegmentedTabs label="Version section" value={view} onChange={setView} options={VIEWS} /></div>
            {detail.isLoading || !detail.data ? (detail.error ? <SectionError onRetry={() => void detail.refetch()}>{errorText(detail.error)}</SectionError> : <SectionLoading />) : (
              view === 'overview' ? <Overview detail={detail.data} />
                : view === 'use' ? <UseIt detail={detail.data} />
                  : view === 'source' ? <SourceViewer auth={auth} name={name} version={detail.data.version} />
                    : <Requirements key={`${name}@${detail.data.version}`} auth={auth} detail={detail.data} product={product} />
            )}
          </Panel>
        </div>
      )}
      <DeprecateDialog auth={auth} name={name} target={changing} versions={versions} onClose={() => setChanging(null)} />
    </SectionPage>
  );
}

/**
 * The workspace's UI pieces, seen from a product: browse them, read their source, see how to add one, check whether this product
 * has what a version needs, and deprecate versions. Pieces are written and published with the CLI; there is no builder here.
 */
export default function UiPiecesResourceContent({ product }: { product: any }) {
  const auth = useDeployAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const pieces = useQuery({ queryKey: keys.list(auth?.workspaceId), queryFn: () => fetchUiPieces(auth!), enabled: Boolean(auth) });
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (pieces.data ?? []).filter((p) => !needle || `${p.name} ${p.description ?? ''} ${p.framework}`.toLowerCase().includes(needle));
  }, [pieces.data, search]);

  if (selected && auth) return <PieceDetail auth={auth} name={selected} product={product} onBack={() => setSelected(null)} />;

  return (
    <SectionPage
      icon={LayoutTemplate} tint={TINT} title="UI pieces"
      subtitle="Frontend pieces published in this workspace. Applications add them with ductape ui add and compile them with their own bundler."
      actions={
        <>
          {(pieces.data?.length ?? 0) > 0 ? (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-grey-500 sm:left-3 sm:h-4 sm:w-4" />
              <Input aria-label="Search UI pieces" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full bg-white pl-8 text-xs sm:h-9 sm:w-48 sm:pl-10 sm:text-sm md:h-10 md:w-64" />
            </div>
          ) : null}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void pieces.refetch()} disabled={pieces.isFetching}>
            <RefreshCw className={pieces.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </>
      }
    >
      {!auth || pieces.isLoading ? <SectionLoading label="Reading UI pieces..." /> : pieces.error ? (
        <SectionError onRetry={() => void pieces.refetch()}>UI pieces could not be loaded: {errorText(pieces.error)}</SectionError>
      ) : (pieces.data?.length ?? 0) === 0 ? (
        <SectionEmpty
          icon={LayoutTemplate} tint={TINT} title="No UI pieces yet"
          description={<>Write one with <span className="font-mono">ductape ui create &lt;name&gt; --framework react|vue|javascript</span>, then <span className="font-mono">ductape ui publish &lt;name&gt;</span>. Published pieces show up here for every product in the workspace.</>}
        />
      ) : (
        <Panel flush>
          <DataTable head={['Name', 'Framework', 'Latest', 'Versions', 'Updated']}>
            {visible.map((p) => (
              <tr key={p.name} className="cursor-pointer hover:bg-grey-100" onClick={() => setSelected(p.name)} data-testid="ui-piece-row">
                <td className="px-4 py-2.5">
                  <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); setSelected(p.name); }}>
                    <span className="block font-mono text-sm text-grey">{p.name}</span>
                    {p.description ? <span className="block text-xs text-grey-600">{p.description}</span> : null}
                  </button>
                </td>
                <td className="px-4 py-2.5"><Pill tone="neutral">{FRAMEWORK_LABEL[p.framework] ?? p.framework}</Pill></td>
                <td className="px-4 py-2.5 font-mono text-xs text-grey">{p.latest ?? <span className="text-grey-600">none</span>}</td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-grey">{p.versions}</td>
                <td className="px-4 py-2.5 text-xs text-grey-600">{when(p.updatedAt)}</td>
              </tr>
            ))}
          </DataTable>
          {visible.length === 0 ? <p className="px-4 py-6 text-sm text-grey-600">No UI pieces match "{search}".</p> : null}
        </Panel>
      )}
    </SectionPage>
  );
}

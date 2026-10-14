import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Box, RefreshCw, Rocket, Search, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchDeploymentJournal, type IDeployAuth } from '@/services/deployServices';
import { useDeployAuth, useProductDeployments, useProductEnvironments } from '@/hooks/useProductDeployments';
import {
  deployErrorMessage, describePolicy, describeState, describeTarget, filterDeployments, formatTraffic, groupByEnvironment, isInFlight, shortHash, totals,
  type DeployableKind, type IDeployment, type IJournalEntry,
} from '@/utils/deployments';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, SectionPage, SegmentedTabs, StatTile, StatusDot, type SectionTint } from './ProductSection';

const TINT: SectionTint = { bg: 'bg-primary/10', text: 'text-primary' };
const POLL_MS = 5000;

type KindFilter = DeployableKind | 'all';

const when = (value: string | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

function KindPill({ kind }: { kind: DeployableKind }) {
  const Icon = kind === 'service' ? Server : Box;
  return (
    <Pill tone="neutral">
      <Icon className="h-3 w-3" />
      {kind === 'service' ? 'Service' : 'Function'}
    </Pill>
  );
}

function StatePill({ state }: { state: string }) {
  const { label, tone } = describeState(state);
  return (
    <Pill tone={tone}>
      <StatusDot tone={tone} />
      {label}
    </Pill>
  );
}

export default function DeploymentsResourceContent({ product }: { product: any }) {
  const auth = useDeployAuth();
  const tag: string | undefined = product?.tag;
  const [kind, setKind] = useState<KindFilter>('all');
  const [env, setEnv] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deployments = useProductDeployments(tag);
  const environments = useProductEnvironments(tag);

  const all = deployments.data ?? [];
  const selected = all.find((d) => d.id === selectedId) ?? null;
  const visible = useMemo(() => filterDeployments(all, { kind, env, search }), [all, kind, env, search]);
  const groups = useMemo(
    () => groupByEnvironment(visible, environments.data ?? []).filter((g) => env === 'all' || g.slug === env),
    [visible, environments.data, env],
  );
  const refreshing = deployments.isFetching || environments.isFetching;
  const refresh = () => void Promise.all([deployments.refetch(), environments.refetch()]);

  const refreshButton = (
    <Button variant="outline" size="sm" className="gap-2" onClick={refresh} disabled={refreshing}>
      <RefreshCw className={refreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );

  if (selected && auth) {
    return (
      <SectionPage
        icon={Rocket}
        tint={TINT}
        title={selected.name}
        subtitle={`${selected.version} · ${selected.env}`}
        actions={
          <>
            {refreshButton}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              All deployments
            </Button>
          </>
        }
      >
        <DeploymentDetail auth={auth} deployment={selected} />
      </SectionPage>
    );
  }

  const stats = totals(all);
  const envOptions = [{ id: 'all', label: 'All environments' }, ...(environments.data ?? []).map((e) => ({ id: e.slug, label: e.slug }))];
  const loading = !auth || deployments.isLoading || environments.isLoading;
  const failure = deployments.error ?? environments.error;

  return (
    <SectionPage
      icon={Rocket}
      tint={TINT}
      title="Deployments"
      subtitle="Functions and services running in your own cloud, by environment"
      actions={
        <>
          {all.length > 0 ? (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-grey-500 sm:left-3 sm:h-4 sm:w-4" />
              <Input
                aria-label="Search deployments"
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-full bg-white pl-8 text-xs sm:h-9 sm:w-48 sm:pl-10 sm:text-sm md:h-10 md:w-64"
              />
            </div>
          ) : null}
          {refreshButton}
        </>
      }
      toolbar={
        all.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedTabs
              label="Kind"
              value={kind}
              onChange={setKind}
              options={[{ id: 'all', label: 'All' }, { id: 'function', label: 'Functions' }, { id: 'service', label: 'Services' }]}
            />
            {envOptions.length > 2 ? <SegmentedTabs label="Environment" value={env} onChange={setEnv} options={envOptions} /> : null}
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <SectionLoading label="Loading deployments..." />
      ) : failure ? (
        <SectionError onRetry={refresh}>{deployErrorMessage(failure)}</SectionError>
      ) : all.length === 0 ? (
        <SectionEmpty
          icon={Rocket}
          tint={TINT}
          title="Nothing deployed yet"
          description={
            <>
              Deployments appear here once a release is planned and applied for one of this product&apos;s environments. From a terminal:{' '}
              <code className="rounded bg-grey-100 px-1 py-0.5 text-[11px]">ductape deploy plans create --file plan.json</code>
            </>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Deployments" value={stats.total} />
            <StatTile label="Active" value={stats.active} tone={stats.active > 0 ? 'good' : 'neutral'} />
            <StatTile label="In progress" value={stats.inFlight} tone={stats.inFlight > 0 ? 'info' : 'neutral'} />
            <StatTile label="Needs attention" value={stats.attention} tone={stats.attention > 0 ? 'bad' : 'neutral'} hint="failed or rolled back" />
          </div>
          {visible.length === 0 ? (
            <SectionEmpty icon={Search} tint={TINT} title="No results found" description="Nothing matches the filters you have chosen." />
          ) : (
            groups.map((group) => {
              const policy = group.policy ? describePolicy(group.policy) : undefined;
              return (
                <Panel
                  key={group.slug}
                  flush
                  title={group.name === group.slug ? group.slug : `${group.name} (${group.slug})`}
                  description={
                    !group.known ? 'This product no longer has this environment.' : !group.active ? 'This environment is inactive, so nothing new can be applied to it.' : policy?.detail
                  }
                  action={policy ? <Pill tone={policy.tone}>{policy.label}</Pill> : undefined}
                >
                  {group.deployments.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-grey-500 sm:px-5">Nothing is deployed here.</p>
                  ) : (
                    <DataTable head={['Name', 'Version', 'State', 'Traffic', 'Target', 'Updated']} minWidth={720}>
                      {group.deployments.map((d) => (
                        <tr key={d.id} className="cursor-pointer hover:bg-grey-100" onClick={() => setSelectedId(d.id)}>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex flex-col items-start gap-1 text-left font-medium text-grey hover:text-primary"
                              onClick={(event) => { event.stopPropagation(); setSelectedId(d.id); }}
                            >
                              {d.name}
                              <KindPill kind={d.kind} />
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{d.version}</td>
                          <td className="px-4 py-3"><StatePill state={d.state} /></td>
                          <td className="whitespace-nowrap px-4 py-3">{formatTraffic(d.trafficPercent)}</td>
                          <td className="px-4 py-3 text-xs text-grey-600">{describeTarget(d.target)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-grey-600">{when(d.updatedAt)}</td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </Panel>
              );
            })
          )}
        </>
      )}
    </SectionPage>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-grey-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-grey">{children}</dd>
    </div>
  );
}

function DeploymentDetail({ auth, deployment }: { auth: IDeployAuth; deployment: IDeployment }) {
  const journal = useQuery({
    queryKey: ['deployment-journal', auth.workspaceId, deployment.id, deployment.revision],
    queryFn: () => fetchDeploymentJournal(auth, deployment.id),
    refetchInterval: isInFlight(deployment.state) ? POLL_MS : false,
  });
  const lastGood = deployment.lastGoodReleaseHash && deployment.lastGoodReleaseHash !== deployment.releaseHash ? deployment.lastGoodReleaseHash : undefined;
  return (
    <>
      <Panel title="Overview">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="State"><StatePill state={deployment.state} /></Fact>
          <Fact label="Kind"><KindPill kind={deployment.kind} /></Fact>
          <Fact label="Version"><span className="font-mono text-xs">{deployment.version}</span></Fact>
          <Fact label="Environment">{deployment.env}</Fact>
          <Fact label="Traffic">{formatTraffic(deployment.trafficPercent)}</Fact>
          <Fact label="Target">{describeTarget(deployment.target)}</Fact>
          <Fact label="Cloud resource"><span className="font-mono text-xs">{deployment.resourceName}</span></Fact>
          <Fact label="Release"><span className="font-mono text-xs" title={deployment.releaseHash}>{shortHash(deployment.releaseHash)}</span></Fact>
          <Fact label="Previous good release">
            {lastGood ? <span className="font-mono text-xs" title={lastGood}>{shortHash(lastGood)}</span> : <span className="text-grey-500">None</span>}
          </Fact>
          <Fact label="Serving revision"><span className="font-mono text-xs">{deployment.currentRevision ?? '-'}</span></Fact>
          <Fact label="Fallback revision"><span className="font-mono text-xs">{deployment.lastGoodRevision ?? '-'}</span></Fact>
          <Fact label="Updated">{when(deployment.updatedAt)}</Fact>
        </dl>
      </Panel>
      <Panel title="Journal" description="Every change this deployment went through, oldest first." flush>
        {journal.isLoading ? (
          <SectionLoading label="Loading the journal..." />
        ) : journal.error ? (
          <div className="p-4"><SectionError onRetry={() => void journal.refetch()}>{deployErrorMessage(journal.error)}</SectionError></div>
        ) : (
          <ol className="divide-y divide-grey-300">
            {(journal.data ?? []).map((entry) => <JournalRow key={entry.seq} entry={entry} />)}
          </ol>
        )}
      </Panel>
    </>
  );
}

function JournalRow({ entry }: { entry: IJournalEntry }) {
  const hasObserved = entry.observed && Object.keys(entry.observed).length > 0;
  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="w-6 text-xs text-grey-500">{entry.seq}</span>
        <StatePill state={entry.state} />
        <span className="text-sm text-grey">{entry.step.replace(/_/g, ' ')}</span>
        <span className="ml-auto text-xs text-grey-500">{when(entry.at)}</span>
      </div>
      {entry.actor ? <p className="mt-1 pl-9 text-xs text-grey-500">by {entry.actor}</p> : null}
      {entry.error ? (
        <p className="mt-2 rounded-md bg-red/5 px-3 py-2 text-xs text-red sm:ml-9">
          <span className="font-medium">{entry.error.code}</span>: {entry.error.message}
        </p>
      ) : null}
      {hasObserved ? (
        <details className="mt-1 pl-9">
          <summary className="cursor-pointer text-xs text-primary">What the provider reported</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-grey-100 p-2 text-[11px] text-grey-700">{JSON.stringify(entry.observed, null, 2)}</pre>
        </details>
      ) : null}
    </li>
  );
}

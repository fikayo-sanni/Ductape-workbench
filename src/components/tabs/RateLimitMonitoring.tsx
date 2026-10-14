import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, GitBranchPlus, Pencil, Plus, RefreshCw, Timer, Trash2 } from 'lucide-react';
import { useAuth } from '@/store/useAuth';
import { fetchWorkspaceLogs } from '@/services/logsServices';
import { decisionDetails, mergePolicies, summarizeDecisions, type PolicyView, type StoredPolicy } from '@/utils/rateLimitSummary';
import { describePolicy, describeStrategy, describeWindow } from '@/utils/rateLimitForm';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RateLimitFormDialog, { type RateLimitDialogMode } from './RateLimitFormDialog';
import { DataTable, Panel, Pill, SectionEmpty, SectionError, SectionLoading, SectionPage, StatTile, TEAL, type Tone } from './ProductSection';

const PAGE_SIZE = 25;
/** The logs API returns at most 1000 rows per page; the policy roll-up reads one such page. */
const SUMMARY_SAMPLE = 1000;

const RANGES = [
  { id: '1', label: 'Last 24 hours', days: 1 },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
];

const OUTCOMES: Record<string, { label: string; tone: Tone; help: string }> = {
  allowed: { label: 'Allowed', tone: 'good', help: 'Within the limit' },
  rejected: { label: 'Rejected', tone: 'bad', help: 'Over the limit' },
  bypassed: { label: 'Bypassed', tone: 'warn', help: 'Limiter was unavailable, request let through' },
  unavailable: { label: 'Unavailable', tone: 'warn', help: 'Limiter could not be reached, request blocked' },
  drift: { label: 'Policy changed', tone: 'warn', help: 'Policy definition changed without a new version tag' },
};

const day = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

function outcomeOf(name: string) {
  return OUTCOMES[name] ?? { label: name, tone: 'neutral' as Tone, help: '' };
}

function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export default function RateLimitMonitoring({ product, onRefresh }: { product: any; onRefresh?: () => void }) {
  const { user, currentWorkspaceId } = useAuth();
  const proxy = useResilienceProxy();
  const [env, setEnv] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [range, setRange] = useState('7');
  const [policy, setPolicy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: RateLimitDialogMode; policy: StoredPolicy | null } | null>(null);
  const [removing, setRemoving] = useState<StoredPolicy | null>(null);
  const [page, setPage] = useState(1);

  const days = RANGES.find(item => item.id === range)?.days ?? 7;
  const start = day(days);
  const end = day(0);
  const enabled = Boolean(currentWorkspaceId && user?._id && user?.public_key && product?.tag);
  const auth = () => ({ workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key });
  const scope = { product_tag: product?.tag, type: 'rate_limit', env: env === 'all' ? undefined : env, start_date: start, end_date: end };

  // Roll-up: one large page, so the per-policy cards describe the whole period, not just the visible table page.
  const rollup = useQuery({
    queryKey: ['rate-limit-rollup', currentWorkspaceId, product?.tag, env, range],
    enabled,
    queryFn: () => fetchWorkspaceLogs(auth(), { ...scope, page: 1, limit: SUMMARY_SAMPLE }),
  });
  const decisions = useQuery({
    queryKey: ['rate-limit-decisions', currentWorkspaceId, product?.tag, env, outcome, range, policy, page],
    enabled,
    queryFn: () =>
      fetchWorkspaceLogs(auth(), {
        ...scope,
        action: outcome === 'all' ? undefined : outcome,
        parent_tag: policy ?? undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const sample: any[] = rollup.data?.data?.logs?.data ?? [];
  const sampleTotal: number = rollup.data?.data?.logs?.metadata?.total ?? sample.length;
  const summary = useMemo(() => summarizeDecisions(sample), [sample]);
  const stored: StoredPolicy[] = useMemo(() => product?.rateLimits ?? [], [product?.rateLimits]);
  const takenTags = useMemo(() => stored.map(item => item.tag), [stored]);
  const views = useMemo(() => mergePolicies(stored, summary.policies), [stored, summary.policies]);
  const rows: any[] = decisions.data?.data?.logs?.data ?? [];
  const meta = decisions.data?.data?.logs?.metadata;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };
  const refetch = () => {
    onRefresh?.();
    void rollup.refetch();
    void decisions.refetch();
  };
  const remove = useMutation({
    mutationFn: async (target: StoredPolicy) => {
      if (!proxy) throw new Error('Not signed in to a workspace');
      return proxy.rateLimits.policies.delete(product.tag, target.tag);
    },
    onSuccess: (_, target) => {
      toast.success(`Deleted ${target.tag}`);
      setRemoving(null);
      if (policy === target.tag) setPolicy(null);
      onRefresh?.();
    },
    onError: (error: any) => toast.error(String(error?.message || 'Could not delete the rate limit').replace(/^Validation error:\s*/i, '')),
  });
  const busy = rollup.isFetching || decisions.isFetching;
  const rejectedShare = percent(summary.rejected, summary.total);

  const filters = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Select value={env} onValueChange={reset(setEnv)}>
        <SelectTrigger className="h-9 w-44 bg-white" aria-label="Environment">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All environments</SelectItem>
          {(product?.envs ?? []).map((item: any) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.name ?? item.slug}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={outcome} onValueChange={reset(setOutcome)}>
        <SelectTrigger className="h-9 w-44 bg-white" aria-label="Decision">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All decisions</SelectItem>
          {Object.entries(OUTCOMES).map(([id, item]) => (
            <SelectItem key={id} value={id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={range} onValueChange={reset(setRange)}>
        <SelectTrigger className="h-9 w-44 bg-white" aria-label="Time range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <SectionPage
      icon={Timer}
      tint={TEAL}
      title="Rate Limits"
      subtitle={
        rollup.isLoading && !stored.length
          ? 'Loading...'
          : `${views.length} ${views.length === 1 ? 'policy' : 'policies'}`
      }
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={refetch}>
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" className="gap-1 shadow-sm sm:gap-2" onClick={() => setDialog({ mode: 'create', policy: null })}>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            Add
          </Button>
        </>
      }
      toolbar={filters}
    >
      {rollup.isError ? <SectionError onRetry={() => void rollup.refetch()}>Could not load rate limit activity.</SectionError> : null}

      {rollup.isLoading && !stored.length ? (
        <SectionLoading label="Loading rate limits..." />
      ) : views.length === 0 && !rollup.isError ? (
        <SectionEmpty
          icon={Timer}
          tint={TEAL}
          title="No rate limits yet"
          description="A rate limit caps how often something can happen, such as sign-in attempts per user or API calls per key. Add one here, or define it in your code with ductape.rateLimit.define(). Every decision is recorded on this page."
          action={
            <Button size="sm" className="gap-2" onClick={() => setDialog({ mode: 'create', policy: null })}>
              <Plus className="h-4 w-4" />
              Add rate limit
            </Button>
          }
        />
      ) : (
        <>
          {summary.total > 0 ? (
          <Panel
            title="Overview"
            description={
              sampleTotal > sample.length
                ? `Based on the most recent ${sample.length.toLocaleString()} of ${sampleTotal.toLocaleString()} decisions in this period.`
                : `All ${summary.total.toLocaleString()} decisions in this period.`
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
              <StatTile label="Decisions" value={summary.total.toLocaleString()} tone="info" />
              <StatTile label="Allowed" value={summary.allowed.toLocaleString()} tone="good" />
              <StatTile label="Rejected" value={summary.rejected.toLocaleString()} hint={`${rejectedShare}% of decisions`} tone={summary.rejected ? 'bad' : 'neutral'} />
              <StatTile label="Limiter problems" value={summary.other.toLocaleString()} hint="bypassed or unavailable" tone={summary.other ? 'warn' : 'neutral'} />
            </div>
          </Panel>
          ) : null}

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-grey sm:text-base">Policies</h2>
              {policy ? (
                <Button variant="ghost" size="sm" onClick={() => reset(setPolicy)(null)}>
                  Show all policies
                </Button>
              ) : (
                <p className="text-xs text-grey-500">{summary.total > 0 ? 'Select a policy to filter the decisions below.' : 'Decisions appear here once a policy is used.'}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-5 lg:grid-cols-3">
              {views.map(view => (
                <PolicyCard
                  key={view.tag}
                  view={view}
                  selected={policy === view.tag}
                  onSelect={() => reset(setPolicy)(policy === view.tag ? null : view.tag)}
                  onNewVersion={() => view.stored && setDialog({ mode: 'version', policy: view.stored })}
                  onEdit={() => view.stored && setDialog({ mode: 'details', policy: view.stored })}
                  onDelete={() => view.stored && setRemoving(view.stored)}
                />
              ))}
            </div>
          </div>

          {summary.total > 0 ? (
          <Panel
            title={policy ? `Decisions for ${policy}` : 'Recent decisions'}
            description={meta ? `${(meta.total ?? 0).toLocaleString()} matching ${meta.total === 1 ? 'decision' : 'decisions'}` : undefined}
            flush
          >
            {decisions.isError ? (
              <div className="p-4">
                <SectionError onRetry={() => void decisions.refetch()}>Could not load decisions.</SectionError>
              </div>
            ) : decisions.isLoading ? (
              <SectionLoading label="Loading decisions..." />
            ) : rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-grey-500">No decisions match these filters.</p>
            ) : (
              <DataTable head={['When', 'Policy', 'Environment', 'Decision', 'Capacity', 'Latency']} minWidth={720}>
                {rows.map(row => {
                  const details = decisionDetails(row);
                  const decision = outcomeOf(details.outcome);
                  const used = details.limit !== undefined && details.remaining !== undefined ? Math.max(0, details.limit - details.remaining) : undefined;
                  return (
                    <tr key={row._id} className="hover:bg-grey-100">
                      <td className="whitespace-nowrap px-4 py-3 text-grey" title={new Date(row.timestamp).toLocaleString()}>
                        {formatDistanceToNow(new Date(row.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-grey sm:text-sm">{row.parent_tag}</td>
                      <td className="px-4 py-3">{row.env ? <Pill>{row.env}</Pill> : '-'}</td>
                      <td className="px-4 py-3">
                        <span title={decision.help}>
                          <Pill tone={decision.tone}>{decision.label}</Pill>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {details.limit !== undefined && details.remaining !== undefined && used !== undefined ? (
                          <div className="w-40">
                            <p className="text-xs text-grey-600">
                              {details.remaining.toLocaleString()} left of {details.limit.toLocaleString()}
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-grey-100">
                              <div className={cn('h-full rounded-full', details.remaining === 0 ? 'bg-red' : 'bg-primary')} style={{ width: `${Math.min(100, percent(used, details.limit))}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-grey-500">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-grey-600">{details.latency !== undefined ? `${Math.round(details.latency)} ms` : '-'}</td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
            {rows.length > 0 ? (
              <div className="flex items-center justify-between gap-3 border-t border-grey-300 px-4 py-3 text-xs text-grey-600 sm:text-sm">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={page === 1 || decisions.isFetching} onClick={() => setPage(value => value - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={page >= totalPages || decisions.isFetching} onClick={() => setPage(value => value + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </Panel>
          ) : null}
        </>
      )}

      <RateLimitFormDialog
        open={dialog !== null}
        onOpenChange={open => !open && setDialog(null)}
        mode={dialog?.mode ?? 'create'}
        product={product}
        policy={dialog?.policy}
        takenTags={takenTags}
        onDone={() => onRefresh?.()}
      />

      <Dialog open={removing !== null} onOpenChange={open => !open && !remove.isPending && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-grey">Delete {removing?.tag}?</DialogTitle>
            <DialogDescription>
              Requests using this policy will stop being limited and calls that name it will fail with "not defined". The tag stays reserved, so it cannot be reused with different limits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={remove.isPending} onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button className="bg-red text-white hover:bg-red/90" disabled={remove.isPending} onClick={() => removing && remove.mutate(removing)}>
              {remove.isPending ? 'Deleting...' : 'Delete rate limit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPage>
  );
}

function PolicyCard({
  view,
  selected,
  onSelect,
  onNewVersion,
  onEdit,
  onDelete,
}: {
  view: PolicyView;
  selected: boolean;
  onSelect: () => void;
  onNewVersion: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { stored, stats } = view;
  const allowedShare = stats ? percent(stats.allowed, stats.total) : 0;
  const rejectedShare = stats ? percent(stats.rejected, stats.total) : 0;
  const title = stored?.name && stored.name !== stored.tag ? stored.name : view.tag;
  const overrides = stored?.envs?.length ?? 0;
  const definition = stored ? describePolicy(stored) : stats?.limit !== undefined ? `Limit ${stats.limit.toLocaleString()}${stats.window ? ` per ${describeWindow(stats.window)}` : ' per window'}` : 'Limit not recorded';

  return (
    <div className={cn('flex flex-col rounded-lg border bg-white transition-all hover:border-primary hover:shadow-md', selected ? 'border-primary ring-1 ring-primary' : 'border-grey-400')}>
      <button type="button" onClick={onSelect} aria-pressed={selected} disabled={!stats} className="flex-1 rounded-t-lg p-3 text-left disabled:cursor-default sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600/10 sm:h-10 sm:w-10">
            <Timer className="h-4 w-4 text-teal-600 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-medium text-grey sm:text-sm">{title}</h3>
            {title !== view.tag ? <p className="truncate font-mono text-[11px] text-grey-500">{view.tag}</p> : null}
          </div>
          {stats ? stats.rejected > 0 ? <Pill tone="bad">{rejectedShare}% rejected</Pill> : <Pill tone="good">No rejections</Pill> : <Pill>No decisions yet</Pill>}
        </div>

        <p className="mt-3 text-xs text-grey sm:text-sm">{definition}</p>
        {stored?.description ? <p className="mt-1 line-clamp-2 text-[11px] text-grey-500 sm:text-xs">{stored.description}</p> : null}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {view.source === 'code' ? <Pill tone="info">Defined in code</Pill> : null}
          {stored ? <Pill>{describeStrategy(stored.strategy)}</Pill> : null}
          {stored ? <Pill>{stored.failurePolicy === 'fail_open' ? 'Lets requests through if limiter is down' : 'Blocks requests if limiter is down'}</Pill> : null}
          {overrides ? <Pill>{overrides} environment {overrides === 1 ? 'override' : 'overrides'}</Pill> : null}
          {stored?.supersedes ? <Pill tone="info">Replaces {stored.supersedes}</Pill> : null}
          {view.supersededBy ? <Pill tone="warn">Replaced by {view.supersededBy}</Pill> : null}
        </div>

        {stats ? (
          <>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-grey-100" aria-hidden="true">
              <div className="h-full bg-green" style={{ width: `${allowedShare}%` }} />
              <div className="h-full bg-red" style={{ width: `${rejectedShare}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-grey-600 sm:text-xs">
              <span>{stats.total.toLocaleString()} decisions</span>
              <span>{stats.allowed.toLocaleString()} allowed</span>
              <span>{stats.rejected.toLocaleString()} rejected</span>
              {stats.other ? <span>{stats.other.toLocaleString()} limiter problems</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-grey-300 pt-3 text-[11px] text-grey-500">
              {stats.envs.map(slug => (
                <Pill key={slug}>{slug}</Pill>
              ))}
              {stats.lastAt ? <span className="ml-auto">Last decision {formatDistanceToNow(stats.lastAt, { addSuffix: true })}</span> : null}
            </div>
          </>
        ) : null}
      </button>

      {stored ? (
        <div className="flex items-center gap-1 border-t border-grey-300 px-2 py-1.5">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onNewVersion} title="Publish different limits under a new tag">
            <GitBranchPlus className="h-3.5 w-3.5" />
            New version
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit details
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto h-8 gap-1.5 px-2 text-xs text-red hover:text-red" onClick={onDelete} aria-label={`Delete ${view.tag}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Code2,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Loader2,
  List,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { JsonViewer } from '@/components/JsonViewer';
import CodeSidebar from '@/components/CodeSidebar';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { fetchLogs } from '@/services/logsServices';

type ResilienceKind = 'healthcheck' | 'quota' | 'fallback';
type View = 'overview' | 'invocations';
type InvocationStatus = 'all' | 'completed' | 'failed' | 'running';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

interface ResilienceComponentTabProps {
  kind: ResilienceKind;
  resource: Record<string, any>;
  product: { tag: string; name?: string; logo?: string; envs?: Array<{ slug: string; name?: string }> };
  env: { slug: string; name?: string };
}

const META = {
  healthcheck: { label: 'Healthcheck', icon: HeartPulse, accent: 'text-rose-600', tint: 'bg-rose-500/10' },
  quota: { label: 'Quota', icon: Gauge, accent: 'text-orange-600', tint: 'bg-orange-500/10' },
  fallback: { label: 'Fallback', icon: Shield, accent: 'text-red', tint: 'bg-red/10' },
} as const;

function envConfig(resource: Record<string, any>, envSlug: string) {
  return (resource.envs || []).find((item: any) => item.slug === envSlug) || resource.env || null;
}

function exampleValue(definition: any): unknown {
  const type = typeof definition === 'string' ? definition : definition?.type;
  if (definition?.default !== undefined) return definition.default;
  if (definition?.example !== undefined) return definition.example;
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'boolean') return false;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return '';
}

function exampleInput(resource: Record<string, any>) {
  const schema = resource.inputs || resource.input || resource.inputSchema || {};
  const properties = schema.properties || schema;
  if (!properties || Array.isArray(properties) || typeof properties !== 'object') return {};
  return Object.fromEntries(Object.entries(properties).map(([key, definition]) => [key, exampleValue(definition)]));
}

function optionProvider(option: Record<string, any>): string {
  const appValue = option.appName || option.app_name || option.app;
  if (appValue) {
    const raw = typeof appValue === 'object'
      ? appValue.name || appValue.tag || appValue.id || ''
      : String(appValue);
    const appParts = raw
      .split(':')
      .map((part: string) => part.trim())
      .filter((part: string) => part && part.toLowerCase() !== 'ductape');
    if (appParts.length > 0) return appParts[0].toLowerCase();
  }

  const value =
    option.providerName || option.provider ||
    option.databaseName || option.database ||
    option.graphName || option.graph ||
    option.vectorName || option.vector ||
    option.cacheName || option.cache ||
    option.storageName || option.storage ||
    option.notificationName || option.notification;
  if (value && typeof value === 'object') return value.name || value.tag || value.id || 'Provider';
  return value ? String(value) : String(option.type || 'Action').replace(/_/g, ' ');
}

function invocationTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function invocationDuration(value: unknown) {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return '—';
  return ms < 1_000 ? `${Math.round(ms)}ms` : `${(ms / 1_000).toFixed(2)}s`;
}

function invocationAttempts(item: any): any[] {
  const candidates = [item?.data, item?.result, item?.data?.result, item?.result?.details, item?.data?.result?.details];
  for (const candidate of candidates) {
    let value = candidate;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { continue; }
    }
    const providers = value?.details?.providers || value?.providers;
    if (Array.isArray(providers)) {
      const attempts = providers.flatMap((provider: any) => Array.isArray(provider?.attempts) ? provider.attempts : [provider]);
      if (attempts.length) return attempts;
    }
  }
  return [];
}

function InvocationList({ items, loading, onViewAll, onOpen, total, hasMore, loadingMore, onLoadMore }: {
  items: any[];
  loading: boolean;
  onViewAll?: () => void;
  onOpen: (item: any) => void;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-white dark:bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-sm text-grey-600">Showing <span className="font-medium text-grey">{items.length}</span>{typeof total === 'number' && total > items.length ? ` of ${total}` : ''} invocations</span>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background-secondary p-1">
          <button type="button" className="rounded bg-white p-1.5 text-grey shadow-sm dark:bg-background" title="Invocation list"><List className="h-4 w-4" /></button>
          <button type="button" className="rounded p-1.5 text-grey-600" title="Invocation timeline"><BarChart3 className="h-4 w-4" /></button>
        </div>
      </div>
      {onViewAll && items.length > 0 ? <div className="flex justify-end border-b border-border px-6 py-2"><Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={onViewAll}>View all invocations</Button></div> : null}
      <div className="sticky top-0 z-10 border-b border-border bg-background-secondary">
        <div className="grid grid-cols-[1fr,120px,140px,120px,100px,180px,40px] gap-4 px-6 py-3 text-xs font-medium uppercase tracking-wider text-grey-600">
          <div>Invocation</div><div>Status</div><div>Trigger</div><div>Started</div><div>Duration</div><div>Progress</div><div />
        </div>
      </div>
      {loading ? <p className="p-8 text-center text-sm text-grey-500">Loading invocations…</p> : items.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-border"><Search className="h-6 w-6 text-grey-500" /></div><p className="font-medium text-grey">No invocations found</p><p className="mt-1 text-sm text-grey-500">Try adjusting your filters</p></div> : (
        <div className="divide-y divide-border">
          {items.map((item, index) => {
            const state = String(item.status || item.outcome || (item.error ? 'failed' : 'completed')).toLowerCase();
            const failed = state.includes('fail') || state.includes('error');
            const running = state.includes('run') || state.includes('pending');
            const id = item.process_id || item.execution_id || item._id || item.id || `invocation-${index + 1}`;
            const duration = item.duration_ms ?? item.latency ?? item.duration;
            const attempts = invocationAttempts(item);
            const completed = attempts.filter((attempt) => !attempt.error && !attempt.message).length;
            return (
              <button type="button" key={String(id)} onClick={() => onOpen(item)} className={cn('grid w-full grid-cols-[1fr,120px,140px,120px,100px,180px,40px] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-background-secondary', running && 'bg-primary/5', failed && 'bg-red/5')}>
                <div className="flex min-w-0 items-center gap-3"><span className={cn('h-2 w-2 flex-shrink-0 rounded-full', failed ? 'bg-red' : running ? 'bg-primary' : 'bg-green')} /><div className="min-w-0"><p className="truncate font-semibold text-grey">{invocationTime(item.timestamp || item.created_at || item.startedAt)}</p><p className="truncate font-mono text-xs text-grey-700">{String(id).slice(0, 8)}{String(id).length > 8 ? '…' : ''}</p></div></div>
                <div><span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium capitalize', failed ? 'border-red/20 bg-red/10 text-red' : running ? 'border-primary/20 bg-primary/10 text-primary' : 'border-green/20 bg-green/10 text-green')}>{failed ? <XCircle className="h-3 w-3" /> : running ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}{state}</span></div>
                <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><span className="truncate text-sm capitalize text-grey">{item.event || item.action || item.type || 'API'}</span></div>
                <span className="text-sm text-grey-600">{invocationTime(item.timestamp || item.created_at || item.startedAt)}</span>
                <span className="font-mono text-sm text-grey-600">{invocationDuration(duration)}</span>
                <div className="flex items-center gap-2"><div className="flex flex-1 gap-[3px]">{(attempts.length ? attempts : [item]).map((attempt, attemptIndex) => <span key={attemptIndex} className={cn('h-1.5 flex-1 rounded-full', attempt.error || attempt.message ? 'bg-red' : running ? 'bg-primary animate-pulse' : 'bg-green')} />)}</div><span className="w-10 text-right text-xs tabular-nums text-grey-700">{attempts.length ? `${completed}/${attempts.length}` : '1/1'}</span></div>
                <div className="flex justify-end"><ChevronRight className="h-4 w-4 text-grey-500" /></div>
              </button>
            );
          })}
        </div>
      )}
      {hasMore && onLoadMore ? (
        <div className="flex justify-center border-t border-border px-6 py-4">
          <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load more invocations
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default function ResilienceComponentTab({ kind, resource, product, env }: ResilienceComponentTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvocationStatus>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const meta = META[kind];
  const Icon = meta.icon;
  const currentEnv = envConfig(resource, env.slug);

  useEffect(() => setSidebarCollapsed(true), [setSidebarCollapsed]);

  const rawStatus = kind === 'healthcheck' ? currentEnv?.status : undefined;
  const status = rawStatus === 'available'
    ? 'healthy'
    : rawStatus === 'unavailable'
      ? 'unhealthy'
      : rawStatus;
  const options = Array.isArray(resource.options) ? resource.options : [];
  const input = useMemo(() => exampleInput(resource), [resource]);
  const {
    data: invocationPages,
    isLoading: invocationsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['resilience-invocations', kind, currentWorkspaceId, product.tag, resource.tag, env.slug],
    queryFn: ({ pageParam }) => fetchLogs(
        { workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key },
        { product_tag: product.tag, parent_tag: resource.tag, env: env.slug, type: kind, limit: 100, page: pageParam, only_completed_execution: true },
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const metadata = lastPage.data?.logs?.metadata ?? lastPage.metadata;
      return metadata && metadata.page < metadata.totalPages ? metadata.page + 1 : undefined;
    },
    enabled: Boolean(currentWorkspaceId && user?._id && user?.public_key && product.tag && resource.tag),
    staleTime: 30_000,
  });
  const invocations = useMemo(
    () => invocationPages?.pages.flatMap((page) => page.data?.logs?.data || []) ?? [],
    [invocationPages],
  );
  const invocationTotal = invocationPages?.pages[0]?.data?.logs?.metadata?.total
    ?? invocationPages?.pages[0]?.metadata?.total
    ?? invocations.length;
  const invocationAllTotal = invocationPages?.pages[0]?.data?.logs?.metadata?.statusCounts?.all
    ?? invocationTotal;
  const summary = useMemo(() => {
    if (kind === 'healthcheck') {
      return [
        { label: 'Checks', value: invocationAllTotal, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
        { label: 'Current status', value: status || 'Unknown', icon: status === 'healthy' ? CheckCircle2 : XCircle, color: status === 'healthy' ? 'text-green' : 'text-red', tint: status === 'healthy' ? 'bg-green/10' : 'bg-red/10' },
        { label: 'Average latency', value: currentEnv?.averageLatency || '—', icon: Gauge, color: 'text-blue', tint: 'bg-blue/10' },
      ];
    }
    if (kind === 'quota') {
      return [
        { label: 'Invocations', value: invocationAllTotal, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
        { label: 'Options', value: options.length, icon: List, color: 'text-orange-600', tint: 'bg-orange-500/10' },
        { label: 'Quota units', value: options.reduce((sum: number, option: any) => sum + Number(option.quota || 0), 0), icon: Gauge, color: 'text-green', tint: 'bg-green/10' },
      ];
    }
    return [
      { label: 'Invocations', value: invocationAllTotal, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
      { label: 'Failover options', value: options.length, icon: List, color: 'text-red', tint: 'bg-red/10' },
      { label: 'Health-gated', value: options.filter((option: any) => option.healthcheck).length, icon: HeartPulse, color: 'text-green', tint: 'bg-green/10' },
    ];
  }, [currentEnv, invocationAllTotal, kind, options, status]);

  const optionUsage = useMemo(() => {
    const total = Math.max(invocations.length, 1);
    return options.map((option: any) => {
      const keys = [option.event, option.tag, option.name].filter(Boolean).map((value) => String(value).toLowerCase());
      const count = invocations.filter((item: any) => {
        const haystack = JSON.stringify(item).toLowerCase();
        return keys.some((key) => haystack.includes(key));
      }).length;
      return { option, count, percent: Math.round((count / total) * 100) };
    });
  }, [invocations, options]);

  const invocationState = (item: any): Exclude<InvocationStatus, 'all'> => {
    const value = String(item.status || item.outcome || (item.error ? 'failed' : 'completed')).toLowerCase();
    if (value.includes('fail') || value.includes('error')) return 'failed';
    if (value.includes('run') || value.includes('pending')) return 'running';
    return 'completed';
  };
  const statusCounts = invocationPages?.pages[0]?.data?.logs?.metadata?.statusCounts ?? {
    all: invocations.length,
    completed: invocations.filter((item: any) => invocationState(item) === 'completed').length,
    failed: invocations.filter((item: any) => invocationState(item) === 'failed').length,
    running: invocations.filter((item: any) => invocationState(item) === 'running').length,
  };
  const filteredInvocations = useMemo(() => {
    const now = Date.now();
    const ranges: Record<Exclude<TimeRange, 'all'>, number> = { '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 };
    return invocations.filter((item: any) => {
      if (statusFilter !== 'all' && invocationState(item) !== statusFilter) return false;
      const timestamp = item.timestamp || item.created_at || item.startedAt;
      if (timeRange !== 'all' && timestamp && now - new Date(timestamp).getTime() > ranges[timeRange]) return false;
      if (searchQuery && !JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [invocations, searchQuery, statusFilter, timeRange]);

  const openInvocation = (item: any) => {
    const id = String(item.process_id || item.execution_id || item._id || item.id);
    openTab({
      id: `resilience-invocation-${kind}-${id}`,
      type: 'resilience-invocation',
      title: `Invocation ${invocationTime(item.timestamp || item.created_at || item.startedAt)}`,
      itemId: id,
      data: {
        invocation: item,
        kind,
        resourceName: resource.name || resource.tag,
        resourceTag: resource.tag,
        productTag: product.tag,
        env: env.slug,
      },
    });
  };

  const generateCodeSections = (language: string) => {
    const prefix = language === 'typescript' ? 'import Ductape from "@ductape/sdk";\n\n' : '';
    if (kind === 'healthcheck') return [{ title: 'Check health', code: `${prefix}const status = await ductape.health.check({\n  product: '${product.tag}',\n  healthcheck: '${resource.tag}',\n  env: '${env.slug}'\n});` }];
    const formattedInput = JSON.stringify(input, null, 2).replace(/\n/g, '\n  ');
    if (kind === 'quota') return [{ title: 'Check quota', code: `${prefix}const allowed = await ductape.quotas.check({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: ${formattedInput}\n});` }];
    return [{ title: 'Execute fallback', code: `${prefix}const result = await ductape.processor.fallback.execute({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: ${formattedInput}\n});` }];
  };

  if (!resource?.tag || !env?.slug || !product?.tag) {
    return <div className="flex h-full items-center justify-center bg-grey-100 text-sm text-grey-600 dark:bg-background">This tab is missing component or environment data. Reopen it from the product page.</div>;
  }

  return (
    <div className="flex h-full min-h-0 bg-grey-100 dark:bg-background">
      <aside className={cn('flex min-h-0 flex-shrink-0 flex-col border-r border-grey-400 bg-white transition-[width] dark:bg-background', collapsed ? 'w-[52px]' : 'w-[256px]')}>
        <div className={cn('border-b border-grey-400', collapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', meta.tint, meta.accent)}><Icon className="h-5 w-5" /></div>
            {!collapsed && <><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-grey">{resource.name || resource.tag}</p><p className="truncate text-xs text-grey-500">{env.name || env.slug}</p></div><button type="button" className="rounded p-1.5 text-grey-500 hover:bg-grey-100 dark:hover:bg-grey-400/20" onClick={() => setCollapsed(true)} title="Collapse sidebar"><PanelLeftClose className="h-4 w-4" /></button></>}
          </div>
        </div>
        {!collapsed && <div className="border-b border-grey-300 p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-500" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search invocations..." className="h-9 pl-9 text-sm" /></div></div>}
        <nav className="flex-1 overflow-y-auto p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button type="button" title="Overview" onClick={() => { setView('overview'); setCollapsed(false); }} className={cn('flex h-10 w-10 items-center justify-center rounded-lg', view === 'overview' ? 'bg-primary/10 text-primary' : 'text-grey-600 hover:bg-grey-100 dark:hover:bg-grey-400/20')}><LayoutDashboard className="h-5 w-5" /></button>
              {(['all', 'running', 'completed', 'failed'] as InvocationStatus[]).map((value) => { const StatusIcon = value === 'running' ? Loader2 : value === 'completed' ? CheckCircle2 : value === 'failed' ? XCircle : List; return <button key={value} type="button" title={value === 'all' ? 'All invocations' : value} onClick={() => { setStatusFilter(value); setView('invocations'); setCollapsed(false); }} className={cn('flex h-10 w-10 items-center justify-center rounded-lg', view === 'invocations' && statusFilter === value ? 'bg-primary/10 text-primary' : 'text-grey-600 hover:bg-grey-100 dark:hover:bg-grey-400/20')}><StatusIcon className={cn('h-5 w-5', value === 'running' && 'animate-spin')} /></button>; })}
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setView('overview')} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm', view === 'overview' ? 'bg-primary/10 text-primary' : 'text-grey hover:bg-grey-100 dark:hover:bg-grey-400/20')}><LayoutDashboard className="h-4 w-4" /><span className="flex-1 text-left font-medium">Overview</span></button>
              <div className="mt-4 flex items-center justify-between px-2 py-2"><span className="text-xs font-semibold uppercase text-grey-600">Status</span><button type="button" title="Refresh invocations" onClick={() => queryClient.invalidateQueries({ queryKey: ['resilience-invocations', kind] })}><RefreshCw className="h-3.5 w-3.5 text-grey-500" /></button></div>
              <div className="space-y-0.5">
                {([
                  { value: 'all', label: 'All Invocations', icon: List, count: statusCounts.all },
                  { value: 'running', label: 'Running', icon: Loader2, count: statusCounts.running },
                  { value: 'completed', label: 'Completed', icon: CheckCircle2, count: statusCounts.completed },
                  { value: 'failed', label: 'Failed', icon: XCircle, count: statusCounts.failed },
                ] as const).map(({ value, label, icon: StatusIcon, count }) => <button key={value} type="button" onClick={() => { setStatusFilter(value); setView('invocations'); }} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm', view === 'invocations' && statusFilter === value ? 'bg-primary/10 text-primary' : 'text-grey hover:bg-grey-100 dark:hover:bg-grey-400/20')}><StatusIcon className={cn('h-4 w-4', value === 'running' && 'animate-spin')} /><span className="flex-1 text-left">{label}</span><span className="min-w-[20px] rounded bg-grey-100 px-1.5 py-0.5 text-center text-xs text-grey-600 dark:bg-grey-400/20">{count}</span></button>)}
              </div>
              <div className="mt-4 px-2"><p className="mb-2 text-xs font-semibold uppercase text-grey-600">Time Range</p><div className="space-y-0.5">{([{ value: '1h', label: 'Last Hour' }, { value: '24h', label: 'Last 24 Hours' }, { value: '7d', label: 'Last 7 Days' }, { value: '30d', label: 'Last 30 Days' }, { value: 'all', label: 'All Time' }] as const).map(({ value, label }) => <button key={value} type="button" onClick={() => setTimeRange(value)} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm', timeRange === value ? 'bg-primary/10 text-primary' : 'text-grey hover:bg-grey-100 dark:hover:bg-grey-400/20')}><Calendar className="h-4 w-4" /><span>{label}</span></button>)}</div></div>
            </>
          )}
        </nav>
        <div className="border-t border-grey-400 p-2">{collapsed ? <button type="button" className="flex h-9 w-full items-center justify-center rounded text-grey-500 hover:bg-grey-100 dark:hover:bg-grey-400/20" onClick={() => setCollapsed(false)} title="Expand sidebar"><PanelLeft className="h-4 w-4" /></button> : null}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-grey-300 bg-white px-6 py-5 dark:border-grey-400 dark:bg-background">
          <div className="flex min-w-0 items-center gap-4"><div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg', meta.tint, meta.accent)}><Icon className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-xl font-semibold text-grey">{resource.name || resource.tag}</h1><div className="mt-1 flex items-center gap-2"><code className="truncate text-sm text-grey-500">{resource.tag}</code><Badge variant="outline">{env.slug}</Badge></div></div></div>
          <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowCode(true)}><Code2 className="mr-2 h-4 w-4" />View code</Button><Button type="button" variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['activity-timeline', kind] }); queryClient.invalidateQueries({ queryKey: ['resilience-invocations', kind] }); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {view === 'overview' && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm dark:border-grey-400 dark:bg-background">
                    <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg', item.tint, item.color)}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className={cn('text-2xl font-bold capitalize', item.color)}>{String(item.value)}</p>
                    <p className="mt-1 text-xs font-medium text-grey-600">{item.label}</p>
                  </div>
                ))}
              </div>

              <ActivityTimelinePanel kind={kind} productTag={product.tag} componentTag={resource.tag} env={env.slug} title={`${meta.label} activity`} countLabel={kind === 'healthcheck' ? 'checks' : 'invocations'} />

              {kind !== 'healthcheck' && (
                <section className="rounded-lg border border-grey-300 bg-white shadow-sm dark:border-grey-400 dark:bg-background">
                  <div className="px-5 pb-2 pt-4">
                    <h2 className="text-sm font-semibold text-grey">Options</h2>
                    <p className="mt-1 text-xs text-grey-500">Ordered execution path and share of recent invocations</p>
                  </div>
                  <div className="p-5">
                    {optionUsage.length ? (
                      <div className="space-y-4">
                        {optionUsage.map(({ option, count, percent }, index) => (
                          <div key={option.id || `${option.event}-${index}`} className="grid grid-cols-[180px_1fr_72px] items-center gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-grey-100 text-xs font-semibold text-grey-600 dark:bg-grey-400/20">{index + 1}</span>
                              <div className="min-w-0"><p className="truncate text-sm font-medium text-grey">{option.name || option.event || option.tag}</p><p className="mt-0.5 truncate text-xs capitalize text-grey-500">{optionProvider(option)}</p></div>
                            </div>
                            <div className="relative h-7 overflow-hidden rounded bg-grey-100 dark:bg-grey-400/20">
                              <div className={cn('h-full min-w-[3px] rounded', kind === 'quota' ? 'bg-orange-500' : 'bg-red')} style={{ width: `${percent}%` }} />
                            </div>
                            <div className="text-right"><p className="text-sm font-semibold text-grey">{percent}%</p><p className="text-[10px] text-grey-500">{count} calls</p></div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="py-6 text-center text-sm text-grey-500">No options configured.</p>}
                  </div>
                </section>
              )}

              {kind === 'healthcheck' && currentEnv && (
                <section className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm dark:border-grey-400 dark:bg-background">
                  <h2 className="text-sm font-semibold text-grey">Latest probe</h2>
                  <div className="mt-4"><JsonViewer data={currentEnv.response ?? currentEnv.payload ?? { status: status || 'unknown', ...(currentEnv.lastError ? { error: currentEnv.lastError } : {}) }} /></div>
                </section>
              )}

              <InvocationList items={invocations.slice(0, 5)} loading={invocationsLoading} onViewAll={() => setView('invocations')} onOpen={openInvocation} />
            </div>
          )}
          {view === 'invocations' && <div className="mx-auto max-w-6xl"><InvocationList items={filteredInvocations} loading={invocationsLoading} onOpen={openInvocation} total={invocationTotal} hasMore={hasNextPage} loadingMore={isFetchingNextPage} onLoadMore={() => void fetchNextPage()} /></div>}
        </div>
      </main>

      {showCode && <CodeSidebar title={resource.name || resource.tag} subtitle={`${meta.label} / ${env.slug}`} tag={resource.tag} onClose={() => setShowCode(false)} generateCodeSections={generateCodeSections} environments={[env]} />}
    </div>
  );
}

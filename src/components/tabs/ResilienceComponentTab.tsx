import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Code2,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  List,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/JsonViewer';
import CodeSidebar from '@/components/CodeSidebar';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { fetchLogs } from '@/services/logsServices';

type ResilienceKind = 'healthcheck' | 'quota' | 'fallback';
type View = 'overview' | 'invocations';

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

function invocationTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InvocationList({ items, loading, onViewAll }: { items: any[]; loading: boolean; onViewAll?: () => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-grey-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-grey-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-grey">Past invocations</h2>
        {onViewAll && items.length > 0 ? <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={onViewAll}>View all</Button> : null}
      </div>
      {loading ? <p className="p-8 text-center text-sm text-grey-500">Loading invocations…</p> : items.length === 0 ? <p className="p-8 text-center text-sm text-grey-500">No invocations recorded for this environment.</p> : (
        <div className="divide-y divide-grey-200">
          {items.map((item, index) => {
            const state = String(item.status || item.outcome || (item.error ? 'failed' : 'completed')).toLowerCase();
            const failed = state.includes('fail') || state.includes('error');
            const id = item.process_id || item.execution_id || item._id || item.id || `invocation-${index + 1}`;
            const duration = item.duration_ms ?? item.latency ?? item.duration;
            return (
              <div key={String(id)} className="grid grid-cols-[1fr_120px_140px_100px] items-center gap-4 px-5 py-3 hover:bg-grey-50">
                <div className="flex min-w-0 items-center gap-3"><span className={cn('h-2 w-2 flex-shrink-0 rounded-full', failed ? 'bg-red' : 'bg-green')} /><div className="min-w-0"><p className="truncate text-sm font-medium text-grey">{invocationTime(item.timestamp || item.created_at || item.startedAt)}</p><p className="truncate font-mono text-xs text-grey-500">{String(id)}</p></div></div>
                <span className={cn('text-xs font-medium capitalize', failed ? 'text-red' : 'text-green')}>{state}</span>
                <span className="text-xs text-grey-500">{item.event || item.action || item.type || '—'}</span>
                <span className="text-right text-xs tabular-nums text-grey-500">{duration == null ? '—' : typeof duration === 'number' ? `${duration}ms` : String(duration)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ResilienceComponentTab({ kind, resource, product, env }: ResilienceComponentTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const meta = META[kind];
  const Icon = meta.icon;
  const currentEnv = envConfig(resource, env.slug);

  useEffect(() => setSidebarCollapsed(true), [setSidebarCollapsed]);

  const status = kind === 'healthcheck' ? currentEnv?.status : undefined;
  const options = Array.isArray(resource.options) ? resource.options : [];
  const input = useMemo(() => exampleInput(resource), [resource]);
  const { data: invocations = [], isLoading: invocationsLoading } = useQuery({
    queryKey: ['resilience-invocations', kind, currentWorkspaceId, product.tag, resource.tag, env.slug],
    queryFn: async () => {
      const response = await fetchLogs(
        { workspace_id: currentWorkspaceId!, user_id: user!._id, public_key: user!.public_key },
        { product_tag: product.tag, parent_tag: resource.tag, env: env.slug, type: kind, limit: 100, page: 1, only_completed_execution: true },
      );
      return response.data?.logs?.data || [];
    },
    enabled: Boolean(currentWorkspaceId && user?._id && user?.public_key && product.tag && resource.tag),
    staleTime: 30_000,
  });
  const summary = useMemo(() => {
    if (kind === 'healthcheck') {
      return [
        { label: 'Checks', value: invocations.length, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
        { label: 'Current status', value: status || 'Unknown', icon: status === 'healthy' ? CheckCircle2 : XCircle, color: status === 'healthy' ? 'text-green' : 'text-red', tint: status === 'healthy' ? 'bg-green/10' : 'bg-red/10' },
        { label: 'Average latency', value: currentEnv?.averageLatency || '—', icon: Gauge, color: 'text-blue', tint: 'bg-blue/10' },
      ];
    }
    if (kind === 'quota') {
      return [
        { label: 'Invocations', value: invocations.length, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
        { label: 'Options', value: options.length, icon: List, color: 'text-orange-600', tint: 'bg-orange-500/10' },
        { label: 'Quota units', value: options.reduce((sum: number, option: any) => sum + Number(option.quota || 0), 0), icon: Gauge, color: 'text-green', tint: 'bg-green/10' },
      ];
    }
    return [
      { label: 'Invocations', value: invocations.length, icon: Activity, color: 'text-primary', tint: 'bg-primary/10' },
      { label: 'Failover options', value: options.length, icon: List, color: 'text-red', tint: 'bg-red/10' },
      { label: 'Health-gated', value: options.filter((option: any) => option.healthcheck).length, icon: HeartPulse, color: 'text-green', tint: 'bg-green/10' },
    ];
  }, [currentEnv, invocations.length, kind, options, status]);

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

  const generateCodeSections = (language: string) => {
    const prefix = language === 'typescript' ? 'import Ductape from "@ductape/sdk";\n\n' : '';
    if (kind === 'healthcheck') return [{ title: 'Check health', code: `${prefix}const status = await ductape.health.check({\n  product: '${product.tag}',\n  healthcheck: '${resource.tag}',\n  env: '${env.slug}'\n});` }];
    const formattedInput = JSON.stringify(input, null, 2).replace(/\n/g, '\n  ');
    if (kind === 'quota') return [{ title: 'Check quota', code: `${prefix}const allowed = await ductape.quotas.check({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: ${formattedInput}\n});` }];
    return [{ title: 'Execute fallback', code: `${prefix}const result = await ductape.processor.fallback.execute({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: ${formattedInput}\n});` }];
  };

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'invocations' as const, label: 'Invocations', icon: List },
  ];

  if (!resource?.tag || !env?.slug || !product?.tag) {
    return <div className="flex h-full items-center justify-center bg-grey-100 text-sm text-grey-600">This tab is missing component or environment data. Reopen it from the product page.</div>;
  }

  return (
    <div className="flex h-full min-h-0 bg-grey-100">
      <aside className={cn('flex min-h-0 flex-shrink-0 flex-col border-r border-grey-400 bg-white transition-[width]', collapsed ? 'w-[52px]' : 'w-[256px]')}>
        <div className={cn('border-b border-grey-400', collapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', meta.tint, meta.accent)}><Icon className="h-5 w-5" /></div>
            {!collapsed && <><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-grey">{resource.name || resource.tag}</p><p className="truncate text-xs text-grey-500">{env.name || env.slug}</p></div><button type="button" className="rounded p-1.5 text-grey-500 hover:bg-grey-100" onClick={() => setCollapsed(true)} title="Collapse sidebar"><PanelLeftClose className="h-4 w-4" /></button></>}
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {nav.map(({ id, label, icon: NavIcon }) => <button key={id} type="button" title={label} onClick={() => { setView(id); if (collapsed) setCollapsed(false); }} className={cn('flex h-9 w-full items-center rounded-md text-sm transition-colors', collapsed ? 'justify-center' : 'gap-2 px-3', view === id ? 'bg-primary/10 text-primary' : 'text-grey-600 hover:bg-grey-100 hover:text-grey')}><NavIcon className="h-4 w-4 flex-shrink-0" />{!collapsed && <span>{label}</span>}</button>)}
        </nav>
        <div className="border-t border-grey-400 p-2">{collapsed ? <button type="button" className="flex h-9 w-full items-center justify-center rounded text-grey-500 hover:bg-grey-100" onClick={() => setCollapsed(false)} title="Expand sidebar"><PanelLeft className="h-4 w-4" /></button> : null}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-grey-300 bg-white px-6 py-5">
          <div className="flex min-w-0 items-center gap-4"><div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg', meta.tint, meta.accent)}><Icon className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-xl font-semibold text-grey">{resource.name || resource.tag}</h1><div className="mt-1 flex items-center gap-2"><code className="truncate text-sm text-grey-500">{resource.tag}</code><Badge variant="outline">{env.slug}</Badge></div></div></div>
          <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowCode(true)}><Code2 className="mr-2 h-4 w-4" />View code</Button><Button type="button" variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['activity-timeline', kind] }); queryClient.invalidateQueries({ queryKey: ['resilience-invocations', kind] }); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {view === 'overview' && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm">
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
                <section className="rounded-lg border border-grey-300 bg-white shadow-sm">
                  <div className="border-b border-grey-200 px-5 py-4">
                    <h2 className="text-sm font-semibold text-grey">Options</h2>
                    <p className="mt-1 text-xs text-grey-500">Ordered execution path and share of recent invocations</p>
                  </div>
                  <div className="p-5">
                    {optionUsage.length ? (
                      <div className="space-y-4">
                        {optionUsage.map(({ option, count, percent }, index) => (
                          <div key={option.id || `${option.event}-${index}`} className="grid grid-cols-[180px_1fr_72px] items-center gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-grey-100 text-xs font-semibold text-grey-600">{index + 1}</span>
                              <div className="min-w-0"><p className="truncate text-sm font-medium text-grey">{option.name || option.event || option.tag}</p><p className="truncate text-xs text-grey-500">{option.type || 'action'}</p></div>
                            </div>
                            <div className="relative h-7 overflow-hidden rounded bg-grey-100">
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
                <section className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-grey">Latest probe</h2>
                  <div className="mt-4"><JsonViewer data={currentEnv.response ?? currentEnv.payload ?? { status: status || 'unknown' }} /></div>
                </section>
              )}

              <InvocationList items={invocations.slice(0, 5)} loading={invocationsLoading} onViewAll={() => setView('invocations')} />
            </div>
          )}
          {view === 'invocations' && <div className="mx-auto max-w-6xl"><InvocationList items={invocations} loading={invocationsLoading} /></div>}
        </div>
      </main>

      {showCode && <CodeSidebar title={resource.name || resource.tag} subtitle={`${meta.label} / ${env.slug}`} tag={resource.tag} onClose={() => setShowCode(false)} generateCodeSections={generateCodeSections} environments={[env]} />}
    </div>
  );
}

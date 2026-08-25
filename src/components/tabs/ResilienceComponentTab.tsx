import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Code2,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Settings2,
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

type ResilienceKind = 'healthcheck' | 'quota' | 'fallback';
type View = 'overview' | 'activity' | 'configuration';

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

export default function ResilienceComponentTab({ kind, resource, product, env }: ResilienceComponentTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const meta = META[kind];
  const Icon = meta.icon;
  const currentEnv = envConfig(resource, env.slug);

  useEffect(() => setSidebarCollapsed(true), [setSidebarCollapsed]);

  const status = kind === 'healthcheck' ? currentEnv?.status : undefined;
  const options = Array.isArray(resource.options) ? resource.options : [];
  const summary = useMemo(() => {
    if (kind === 'healthcheck') {
      return [
        { label: 'Status', value: status || 'Unknown' },
        { label: 'Last latency', value: currentEnv?.lastLatency || '—' },
        { label: 'Average latency', value: currentEnv?.averageLatency || '—' },
        { label: 'Retries', value: resource.retries ?? '—' },
      ];
    }
    if (kind === 'quota') {
      return [
        { label: 'Options', value: options.length },
        { label: 'Total units', value: options.reduce((sum: number, option: any) => sum + Number(option.quota || 0), 0) },
        { label: 'Environment', value: env.name || env.slug },
        { label: 'Tag', value: resource.tag },
      ];
    }
    return [
      { label: 'Failover options', value: options.length },
      { label: 'Health-gated', value: options.filter((option: any) => option.healthcheck).length },
      { label: 'Environment', value: env.name || env.slug },
      { label: 'Tag', value: resource.tag },
    ];
  }, [currentEnv, env.name, env.slug, kind, options, resource.retries, resource.tag, status]);

  const generateCodeSections = (language: string) => {
    const prefix = language === 'typescript' ? 'import Ductape from "@ductape/sdk";\n\n' : '';
    if (kind === 'healthcheck') return [{ title: 'Check health', code: `${prefix}const status = await ductape.health.check({\n  product: '${product.tag}',\n  healthcheck: '${resource.tag}',\n  env: '${env.slug}'\n});` }];
    if (kind === 'quota') return [{ title: 'Check quota', code: `${prefix}const allowed = await ductape.quotas.check({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: {}\n});` }];
    return [{ title: 'Execute fallback', code: `${prefix}const result = await ductape.processor.fallback.execute({\n  product: '${product.tag}',\n  event: '${resource.tag}',\n  env: '${env.slug}',\n  input: {}\n});` }];
  };

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'configuration' as const, label: 'Configuration', icon: Settings2 },
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
        <div className="border-t border-grey-400 p-2">{collapsed ? <button type="button" className="flex h-9 w-full items-center justify-center rounded text-grey-500 hover:bg-grey-100" onClick={() => setCollapsed(false)} title="Expand sidebar"><PanelLeft className="h-4 w-4" /></button> : <Button type="button" variant="outline" className="w-full" onClick={() => setShowCode(true)}><Code2 className="mr-2 h-4 w-4" />View code</Button>}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-grey-300 bg-white px-6 py-5">
          <div className="flex min-w-0 items-center gap-4"><div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg', meta.tint, meta.accent)}><Icon className="h-6 w-6" /></div><div className="min-w-0"><h1 className="truncate text-xl font-semibold text-grey">{resource.name || resource.tag}</h1><div className="mt-1 flex items-center gap-2"><code className="truncate text-sm text-grey-500">{resource.tag}</code><Badge variant="outline">{env.slug}</Badge></div></div></div>
          <Button type="button" variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['activity-timeline', kind] })}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {view === 'overview' && <div className="mx-auto max-w-6xl space-y-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{summary.map(item => <div key={item.label} className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-grey-500">{item.label}</p><p className="mt-2 truncate text-2xl font-semibold capitalize text-grey">{String(item.value)}</p></div>)}</div>{kind === 'healthcheck' && <div className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm"><div className="flex items-center gap-2">{status === 'healthy' ? <CheckCircle2 className="h-5 w-5 text-green" /> : <XCircle className="h-5 w-5 text-red" />}<h2 className="text-sm font-semibold text-grey">Latest probe</h2></div><div className="mt-4"><JsonViewer data={currentEnv?.response ?? currentEnv?.payload ?? { status: status || 'unknown' }} /></div></div>}{kind !== 'healthcheck' && <div className="rounded-lg border border-grey-300 bg-white shadow-sm"><div className="border-b border-grey-200 px-5 py-4"><h2 className="text-sm font-semibold text-grey">Execution order</h2></div><div className="divide-y divide-grey-200">{options.length ? options.map((option: any, index: number) => <div key={option.id || `${option.event}-${index}`} className="flex items-center gap-4 px-5 py-4"><span className="flex h-7 w-7 items-center justify-center rounded bg-grey-100 text-xs font-semibold text-grey-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-grey">{option.name || option.event || option.tag}</p><p className="truncate text-xs text-grey-500">{option.type || 'action'}{option.app ? ` / ${option.app}` : ''}</p></div>{kind === 'quota' && <span className="text-sm font-semibold text-orange-600">{option.quota ?? '—'} units</span>}</div>) : <p className="p-8 text-center text-sm text-grey-500">No options configured.</p>}</div></div>}</div>}
          {view === 'activity' && <div className="mx-auto max-w-6xl"><ActivityTimelinePanel kind={kind} productTag={product.tag} componentTag={resource.tag} env={env.slug} title={`${meta.label} activity`} countLabel={kind === 'healthcheck' ? 'checks' : 'executions'} /></div>}
          {view === 'configuration' && <div className="mx-auto max-w-4xl rounded-lg border border-grey-300 bg-white p-6 shadow-sm"><div className="mb-5"><h2 className="text-lg font-semibold text-grey">Configuration</h2><p className="mt-1 text-sm text-grey-500">Resolved for {env.name || env.slug}</p></div><JsonViewer data={{ ...resource, env: currentEnv || env }} /></div>}
        </div>
      </main>

      {showCode && <CodeSidebar title={resource.name || resource.tag} subtitle={`${meta.label} / ${env.slug}`} tag={resource.tag} onClose={() => setShowCode(false)} generateCodeSections={generateCodeSections} environments={[env]} />}
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import {
  ExternalLink,
  Heart,
  Shield,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { FlowCanvas } from '@/components/flow-diagram/FlowCanvas';
import {
  fallbackToFlow,
  healthcheckToFlow,
  quotaToFlow,
} from '@/components/flow-diagram/flowModels';

export type ResilienceFlowKind = 'healthcheck' | 'fallback' | 'quota';

interface ResilienceFlowTabProps {
  kind: ResilienceFlowKind;
  component: Record<string, unknown>;
  productTag?: string;
  productName?: string;
  productEnvs?: Array<{ slug: string; name?: string }>;
}

const KIND_META: Record<
  ResilienceFlowKind,
  { title: string; icon: typeof Heart; color: string }
> = {
  healthcheck: {
    title: 'Healthcheck',
    icon: Heart,
    color: 'text-rose-600 bg-rose-500/10',
  },
  fallback: {
    title: 'Fallback',
    icon: Shield,
    color: 'text-orange-600 bg-orange-500/10',
  },
  quota: {
    title: 'Quota',
    icon: Timer,
    color: 'text-amber-600 bg-amber-500/10',
  },
};

export default function ResilienceFlowTab({
  kind,
  component,
  productTag,
  productName,
  productEnvs = [],
}: ResilienceFlowTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const flow = useMemo(() => {
    if (kind === 'healthcheck') return healthcheckToFlow(component);
    if (kind === 'fallback') return fallbackToFlow(component);
    return quotaToFlow(component);
  }, [kind, component]);

  const openEnvExplorer = (envSlug: string) => {
    if (!component.tag || !productTag) return;
    openTab({
      id: `${kind}-${String(component.tag)}-${envSlug}`,
      type: kind,
      title: `${component.name || component.tag} (${envSlug})`,
      itemId: `${String(component.tag)}-${envSlug}`,
      data: {
        isExplorer: true,
        product: {
          tag: productTag,
          name: productName,
          envs: productEnvs,
        },
        resource: component,
        env: { slug: envSlug, name: envSlug },
        selectedEnv: { slug: envSlug },
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-grey-100">
      <div className="shrink-0 border-b border-grey-300 bg-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-grey-500">
              {meta.title} flow
            </p>
            <h1 className="text-base font-semibold text-grey truncate">
              {String(component.name || component.tag || meta.title)}
            </h1>
            <p className="text-xs text-grey-600 font-mono truncate">{String(component.tag || '')}</p>
          </div>
        </div>
        {productEnvs.length > 0 ? (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <span className="text-[10px] text-grey-500 uppercase tracking-wide mr-1 hidden sm:inline">
              Activity
            </span>
            {productEnvs.map((env) => (
              <Button
                key={env.slug}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => openEnvExplorer(env.slug)}
              >
                {env.slug}
                <ExternalLink className="h-3 w-3" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {component.description ? (
        <p className="shrink-0 px-4 py-2 text-sm text-grey-600 bg-white border-b border-grey-200">
          {String(component.description)}
        </p>
      ) : null}

      <div className="flex-1 min-h-0">
        <FlowCanvas initialNodes={flow.nodes} initialEdges={flow.edges} editable={false} />
      </div>
    </div>
  );
}

import type { Edge, Node } from '@xyflow/react';
import type { WorkflowStepDraft } from '@/components/workflow-builder/types';
import { resolveStepParents } from '@/components/workflow-builder/workflowGraphParents';

export type FlowNodeKind =
  | 'start'
  | 'end'
  | 'action'
  | 'produce'
  | 'storage'
  | 'notification'
  | 'database'
  | 'graph'
  | 'vector'
  | 'workflow'
  | 'quota'
  | 'fallback'
  | 'healthcheck'
  | 'condition'
  | 'provider'
  | 'router';

export interface FlowStepNodeData extends Record<string, unknown> {
  label: string;
  subtitle?: string;
  kind: FlowNodeKind;
  meta?: Record<string, string>;
}

const NODE_GAP_Y = 150;
const NODE_GAP_X = 300;
const LAYOUT_ORIGIN_X = 80;
const LAYOUT_ORIGIN_Y = 60;
const ENV_NODES_PER_ROW = 3;

type FlowNodeItem = { id: string; data: FlowStepNodeData };

function assignLayers(nodeIds: string[], edges: Edge[], startId: string): Map<string, number> {
  const layer = new Map<string, number>();
  layer.set(startId, 0);

  let changed = true;
  while (changed) {
    changed = false;
    edges.forEach((edge) => {
      const sourceLayer = layer.get(edge.source);
      if (sourceLayer === undefined) return;
      const nextLayer = sourceLayer + 1;
      const previous = layer.get(edge.target) ?? -1;
      if (nextLayer > previous) {
        layer.set(edge.target, nextLayer);
        changed = true;
      }
    });
  }

  nodeIds.forEach((id) => {
    if (!layer.has(id)) layer.set(id, 1);
  });

  return layer;
}

/** Layer nodes top-to-bottom; spread siblings horizontally and center each row. */
function layoutHierarchicalNodes(
  items: FlowNodeItem[],
  edges: Edge[],
  startId = 'start',
): Node<FlowStepNodeData>[] {
  const nodeIds = items.map((item) => item.id);
  const nodeById = new Map(items.map((item) => [item.id, item]));
  const layers = assignLayers(nodeIds, edges, startId);

  const byLayer = new Map<number, string[]>();
  nodeIds.forEach((id) => {
    const layer = layers.get(id) ?? 0;
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(id);
  });

  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b);
  const maxRowWidth = Math.max(
    ...sortedLayers.map((layer) => (byLayer.get(layer)?.length ?? 1) - 1),
    0,
  );
  const canvasWidth = maxRowWidth * NODE_GAP_X;

  return sortedLayers.flatMap((layer) => {
    const ids = byLayer.get(layer) ?? [];
    const rowWidth = Math.max(ids.length - 1, 0) * NODE_GAP_X;
    const rowOffsetX = (canvasWidth - rowWidth) / 2;

    return ids.map((id, index) => ({
      id,
      type: 'flowStep' as const,
      position: {
        x: LAYOUT_ORIGIN_X + rowOffsetX + index * NODE_GAP_X,
        y: LAYOUT_ORIGIN_Y + layer * NODE_GAP_Y,
      },
      data: nodeById.get(id)!.data,
    }));
  });
}

/** Request → router → fan-out providers → response (fallback / quota). */
function layoutRouterFanOut(config: {
  start: FlowNodeItem;
  router: FlowNodeItem;
  providers: FlowNodeItem[];
  end: FlowNodeItem;
}): Node<FlowStepNodeData>[] {
  const providerCount = config.providers.length;
  const rowWidth = Math.max(providerCount - 1, 0) * NODE_GAP_X;
  const centerX = LAYOUT_ORIGIN_X + rowWidth / 2;
  const yStart = LAYOUT_ORIGIN_Y;
  const yRouter = yStart + NODE_GAP_Y;
  const yProviders = yRouter + NODE_GAP_Y;
  const yEnd = yProviders + NODE_GAP_Y;

  return [
    {
      id: config.start.id,
      type: 'flowStep',
      position: { x: centerX, y: yStart },
      data: config.start.data,
    },
    {
      id: config.router.id,
      type: 'flowStep',
      position: { x: centerX, y: yRouter },
      data: config.router.data,
    },
    ...config.providers.map((provider, index) => ({
      id: provider.id,
      type: 'flowStep' as const,
      position: { x: LAYOUT_ORIGIN_X + index * NODE_GAP_X, y: yProviders },
      data: provider.data,
    })),
    {
      id: config.end.id,
      type: 'flowStep',
      position: { x: centerX, y: yEnd },
      data: config.end.data,
    },
  ];
}

function chainEdges(ids: string[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < ids.length - 1; i++) {
    edges.push({
      id: `e-${ids[i]}-${ids[i + 1]}`,
      source: ids[i],
      target: ids[i + 1],
      animated: true,
    });
  }
  return edges;
}

function stepKind(type?: string): FlowNodeKind {
  const t = String(type || 'action').toLowerCase();
  if (t === 'produce' || t === 'publish') return 'produce';
  if (t === 'storage') return 'storage';
  if (t === 'notification') return 'notification';
  if (t === 'database' || t === 'database_action') return 'database';
  if (t === 'graph') return 'graph';
  if (t === 'vector') return 'vector';
  if (t === 'workflow') return 'workflow';
  if (t === 'quota') return 'quota';
  if (t === 'fallback') return 'fallback';
  if (t === 'healthcheck') return 'healthcheck';
  if (t === 'condition') return 'condition';
  return 'action';
}

export function workflowStepsToFlow(steps: Array<Record<string, unknown>> = []) {
  const startId = 'start';
  const endId = 'end';
  const stepNodes = steps.map((step, index) => {
    const tag = String(step.tag || `step-${index + 1}`);
    const type = String(step.type || 'action');
    const meta: Record<string, string> = {};
    if (step.app) meta.app = String(step.app);
    if (step.event) meta.event = String(step.event);
    if (step.broker) meta.broker = String(step.broker);
    if (step.storage) meta.storage = String(step.storage);
    if (step.notification) meta.notification = String(step.notification);
    const deps = Array.isArray(step.depends_on) ? step.depends_on.map(String) : [];
    if (deps.length) meta.parents = deps.join(', ');
    else if (!step.depends_on || (Array.isArray(step.depends_on) && step.depends_on.length === 0)) {
      meta.parents = '$Input';
    }
    return {
      id: tag,
      data: {
        label: String(step.name || tag),
        subtitle: type,
        kind: stepKind(type),
        meta,
      } satisfies FlowStepNodeData,
    };
  });

  const allNodeItems: FlowNodeItem[] = [
    { id: startId, data: { label: 'Start', kind: 'start' } },
    ...stepNodes,
    { id: endId, data: { label: 'Complete', kind: 'end' } },
  ];

  const stepTags = stepNodes.map((n) => n.id);
  const hasExplicitDeps = steps.some(
    (s) => Array.isArray(s.depends_on) && s.depends_on.length > 0,
  );

  if (!hasExplicitDeps) {
    const edgeIds = [startId, ...stepTags, endId];
    const edges = chainEdges(edgeIds);
    const nodes = layoutHierarchicalNodes(allNodeItems, edges, startId);
    return { nodes, edges };
  }

  const edges: Edge[] = [];
  steps.forEach((step, index) => {
    const tag = stepTags[index];
    const deps = Array.isArray(step.depends_on) ? step.depends_on.map(String) : [];

    if (deps.length === 0) {
      edges.push({
        id: `e-start-${tag}`,
        source: startId,
        target: tag,
        animated: true,
      });
    } else {
      deps.forEach((dep) => {
        edges.push({
          id: `e-${dep}-${tag}`,
          source: dep,
          target: tag,
          animated: true,
        });
      });
    }
  });

  stepTags.forEach((tag) => {
    const isParentOfAnother = steps.some((s) => {
      const deps = Array.isArray(s.depends_on) ? s.depends_on.map(String) : [];
      return deps.includes(tag);
    });
    if (!isParentOfAnother) {
      edges.push({
        id: `e-${tag}-end`,
        source: tag,
        target: endId,
        animated: false,
      });
    }
  });

  const nodes = layoutHierarchicalNodes(allNodeItems, edges, startId);
  return { nodes, edges };
}

export function healthcheckToFlow(healthcheck: Record<string, unknown>) {
  const tag = String(healthcheck.tag || 'healthcheck');
  const envs = Array.isArray(healthcheck.envs) ? healthcheck.envs : [];
  const probeId = 'probe';
  const envItems: FlowNodeItem[] = envs.map((env: Record<string, unknown>, index: number) => {
    const slug = String(env.slug || `env-${index}`);
    return {
      id: `env-${slug}`,
      data: {
        label: slug,
        subtitle: String(env.status || 'unknown'),
        kind: (env.status === 'healthy' ? 'action' : 'condition') as FlowNodeKind,
        meta: {
          latency: String(env.averageLatency || env.lastLatency || '—'),
          lastChecked: env.lastChecked ? String(env.lastChecked) : '—',
        },
      },
    };
  });

  const envsInWidestRow = envItems.length
    ? Math.min(envItems.length, ENV_NODES_PER_ROW)
    : 1;
  const envRowWidth = Math.max(envsInWidestRow - 1, 0) * NODE_GAP_X;
  const centerX = LAYOUT_ORIGIN_X + envRowWidth / 2;
  const yInput = LAYOUT_ORIGIN_Y;
  const yProbe = yInput + NODE_GAP_Y;
  const yEnvs = yProbe + NODE_GAP_Y;

  const nodes: Node<FlowStepNodeData>[] = [
    {
      id: 'input',
      type: 'flowStep',
      position: { x: centerX, y: yInput },
      data: { label: 'Input', subtitle: 'Probe payload', kind: 'start' },
    },
    {
      id: probeId,
      type: 'flowStep',
      position: { x: centerX, y: yProbe },
      data: {
        label: String(healthcheck.name || tag),
        subtitle: 'Health probe',
        kind: 'healthcheck',
        meta: {
          interval: String(healthcheck.checkIntervals || '—'),
          retries: String(healthcheck.retries ?? '—'),
        },
      },
    },
  ];

  if (envItems.length === 0) {
    nodes.push({
      id: 'envs',
      type: 'flowStep',
      position: { x: centerX, y: yEnvs },
      data: { label: 'Environments', subtitle: 'No env status yet', kind: 'router' },
    });
  } else {
    envItems.forEach((item, index) => {
      const row = Math.floor(index / ENV_NODES_PER_ROW);
      const col = index % ENV_NODES_PER_ROW;
      const itemsInRow = Math.min(
        ENV_NODES_PER_ROW,
        envItems.length - row * ENV_NODES_PER_ROW,
      );
      const rowWidth = Math.max(itemsInRow - 1, 0) * NODE_GAP_X;
      const rowOffsetX = (envRowWidth - rowWidth) / 2;

      nodes.push({
        id: item.id,
        type: 'flowStep',
        position: {
          x: LAYOUT_ORIGIN_X + rowOffsetX + col * NODE_GAP_X,
          y: yEnvs + row * NODE_GAP_Y,
        },
        data: item.data,
      });
    });
  }

  const envIds = envs.map((env: Record<string, unknown>, i: number) => `env-${String(env.slug || `env-${i}`)}`);
  const targetIds = envIds.length ? envIds : ['envs'];
  const edges: Edge[] = [
    { id: 'e-input-probe', source: 'input', target: probeId, animated: true },
    ...targetIds.map((id) => ({
      id: `e-probe-${id}`,
      source: probeId,
      target: id,
      animated: true,
    })),
  ];

  return { nodes, edges };
}

export function fallbackToFlow(fallback: Record<string, unknown>) {
  const options = Array.isArray(fallback.options) ? fallback.options : [];
  const startId = 'request';
  const routerId = 'router';
  const endId = 'response';

  const providerNodes = options.map((opt: Record<string, unknown>, index: number) => {
    const id = `provider-${index}`;
    const type = String(opt.type || 'action');
    return {
      id,
      data: {
        label: String(opt.event || `Provider ${index + 1}`),
        subtitle: type,
        kind: 'provider' as FlowNodeKind,
        meta: {
          type,
          app: opt.app ? String(opt.app) : '—',
          retries: String(opt.retries ?? '—'),
          healthcheck: opt.healthcheck ? String(opt.healthcheck) : 'none',
        },
      } satisfies FlowStepNodeData,
      col: index,
    };
  });

  const nodes = layoutRouterFanOut({
    start: {
      id: startId,
      data: { label: 'Request', subtitle: String(fallback.tag || 'fallback'), kind: 'start' },
    },
    router: {
      id: routerId,
      data: {
        label: String(fallback.name || 'Fallback chain'),
        subtitle: `${options.length} provider(s)`,
        kind: 'router',
      },
    },
    providers: providerNodes.map((node) => ({ id: node.id, data: node.data })),
    end: {
      id: endId,
      data: { label: 'Response', subtitle: 'Uniform output', kind: 'end' },
    },
  });

  const edges: Edge[] = [
    { id: 'e-req-router', source: startId, target: routerId, animated: true },
    ...providerNodes.map((node, index) => ({
      id: `e-router-${node.id}`,
      source: routerId,
      target: node.id,
      label: index === 0 ? 'primary' : `fallback ${index}`,
      animated: index === 0,
    })),
    ...providerNodes.map((node) => ({
      id: `e-${node.id}-response`,
      source: node.id,
      target: endId,
      animated: false,
    })),
  ];

  return { nodes, edges };
}

export function quotaToFlow(quota: Record<string, unknown>) {
  const options = Array.isArray(quota.options) ? quota.options : [];
  const startId = 'request';
  const routerId = 'quota-router';
  const endId = 'response';

  const providerNodes = options.map((opt: Record<string, unknown>, index: number) => {
    const id = `quota-${index}`;
    const weight = opt.quota != null ? String(opt.quota) : '1';
    return {
      id,
      data: {
        label: String(opt.event || `Provider ${index + 1}`),
        subtitle: `weight ${weight}`,
        kind: 'provider' as FlowNodeKind,
        meta: {
          type: String(opt.type || 'action'),
          app: opt.app ? String(opt.app) : '—',
          quota: weight,
          healthcheck: opt.healthcheck ? String(opt.healthcheck) : 'none',
        },
      } satisfies FlowStepNodeData,
    };
  });

  const nodes = layoutRouterFanOut({
    start: {
      id: startId,
      data: { label: 'Request', subtitle: String(quota.tag || 'quota'), kind: 'start' },
    },
    router: {
      id: routerId,
      data: {
        label: String(quota.name || 'Quota router'),
        subtitle: 'Weighted distribution',
        kind: 'router',
      },
    },
    providers: providerNodes.map((node) => ({ id: node.id, data: node.data })),
    end: {
      id: endId,
      data: { label: 'Response', subtitle: 'Mapped output', kind: 'end' },
    },
  });

  const edges: Edge[] = [
    { id: 'e-req-router', source: startId, target: routerId, animated: true },
    ...providerNodes.map((node) => ({
      id: `e-router-${node.id}`,
      source: routerId,
      target: node.id,
      animated: true,
    })),
    ...providerNodes.map((node) => ({
      id: `e-${node.id}-response`,
      source: node.id,
      target: endId,
    })),
  ];

  return { nodes, edges };
}

export const WORKFLOW_PALETTE_ITEMS: Array<{ type: string; label: string; kind: FlowNodeKind }> = [
  { type: 'action', label: 'App action', kind: 'action' },
  { type: 'produce', label: 'Publish event', kind: 'produce' },
  { type: 'storage', label: 'Storage', kind: 'storage' },
  { type: 'notification', label: 'Notification', kind: 'notification' },
  { type: 'database', label: 'Database', kind: 'database' },
  { type: 'graph', label: 'Graph', kind: 'graph' },
  { type: 'vector', label: 'Vector DB', kind: 'vector' },
  { type: 'condition', label: 'Condition', kind: 'condition' },
  { type: 'workflow', label: 'Sub-workflow', kind: 'workflow' },
  { type: 'quota', label: 'Quota', kind: 'quota' },
  { type: 'fallback', label: 'Fallback', kind: 'fallback' },
];

const TERMINAL_NODE_KINDS = new Set<FlowNodeKind>(['start', 'end', 'condition']);

function kindToStepType(kind: FlowNodeKind, subtitle?: string): string {
  if (subtitle && subtitle !== kind) return subtitle;
  const map: Record<FlowNodeKind, string> = {
    start: 'action',
    end: 'action',
    action: 'action',
    produce: 'produce',
    storage: 'storage',
    notification: 'notification',
    database: 'database_action',
    graph: 'graph',
    vector: 'vector',
    workflow: 'child_workflow',
    quota: 'quota',
    fallback: 'fallback',
    healthcheck: 'healthcheck',
    condition: 'condition',
    provider: 'action',
    router: 'action',
  };
  return map[kind] || 'action';
}

/** Serialize React Flow graph into workflow step definitions (supports branching via edge conditions). */
export function flowGraphToWorkflowSteps(
  nodes: Node<FlowStepNodeData>[],
  edges: Edge[],
  existingSteps: WorkflowStepDraft[] = [],
): WorkflowStepDraft[] {
  const stepByTag = new Map<string, WorkflowStepDraft>();
  existingSteps.forEach((s) => stepByTag.set(s.tag, { ...s }));

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const outEdges = new Map<string, Edge[]>();
  const inEdges = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    if (!outEdges.has(edge.source)) outEdges.set(edge.source, []);
    outEdges.get(edge.source)!.push(edge);
    if (!inEdges.has(edge.target)) inEdges.set(edge.target, []);
    inEdges.get(edge.target)!.push(edge);
  });

  const startId = nodes.find((n) => n.data.kind === 'start')?.id || 'start';
  const visited = new Set<string>();
  const order: string[] = [];

  const walk = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodeById.get(nodeId);
    if (!node) return;

    if (!TERMINAL_NODE_KINDS.has(node.data.kind) && nodeId !== 'end') {
      order.push(nodeId);
    }

    const outs = outEdges.get(nodeId) || [];
    outs.forEach((e) => walk(e.target));
  };

  walk(startId);
  nodes.forEach((n) => {
    if (!visited.has(n.id) && !TERMINAL_NODE_KINDS.has(n.data.kind) && n.id !== 'end') {
      order.push(n.id);
    }
  });

  return order.map((nodeId) => {
    const node = nodeById.get(nodeId)!;
    const existing = stepByTag.get(nodeId);
    const incoming = inEdges.get(nodeId) || [];

    const { isLayer1, parentTags } = resolveStepParents(nodeId, nodes, edges);
    const depends_on = isLayer1 ? undefined : parentTags.length ? parentTags : undefined;

    let condition = existing?.condition;
    const conditionalEdge = incoming.find((e) => {
      const src = nodeById.get(e.source);
      return src?.data.kind === 'condition' || e.label || (e.data as any)?.condition;
    });
    if (conditionalEdge) {
      const edgeCondition = String(
        (conditionalEdge.data as any)?.condition || conditionalEdge.label || '',
      ).trim();
      const srcNode = nodeById.get(conditionalEdge.source);
      const nodeCondition = String(srcNode?.data.meta?.condition || '').trim();
      condition = edgeCondition || nodeCondition || condition;
    }

    const meta = node.data.meta || {};
    return {
      tag: nodeId,
      name: node.data.label,
      type: existing?.type || kindToStepType(node.data.kind, node.data.subtitle),
      app: existing?.app || (meta.app as string | undefined),
      database: existing?.database,
      graph: existing?.graph,
      storage: existing?.storage,
      vector: existing?.vector,
      notification: existing?.notification,
      broker: existing?.broker || (meta.broker as string | undefined),
      quota: existing?.quota,
      fallback: existing?.fallback,
      workflow: existing?.workflow,
      event: existing?.event || String(meta.event || 'run'),
      input: existing?.input || {},
      output: existing?.output,
      depends_on,
      condition: condition || undefined,
      options: existing?.options,
    } satisfies WorkflowStepDraft;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  GripVertical,
  Loader2,
  Save,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import type { Edge, Node } from '@xyflow/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { FlowCanvas } from '@/components/flow-diagram/FlowCanvas';
import { WorkflowStepPalette } from '@/components/flow-diagram/WorkflowStepPalette';
import {
  WORKFLOW_PALETTE_ITEMS,
  workflowStepsToFlow,
  flowGraphToWorkflowSteps,
  type FlowNodeKind,
  type FlowStepNodeData,
} from '@/components/flow-diagram/flowModels';
import {
  WorkflowStepInspector,
  resolveStepParents,
  validateWorkflowParentGraph,
} from '@/components/workflow-builder';
import type { ProductContext, WorkflowStepDraft } from '@/components/workflow-builder/types';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { useAuth } from '@/store/useAuth';
import productServices from '@/services/productServices';
import toast from 'react-hot-toast';

interface WorkflowBuilderTabProps {
  tabId?: string;
  workflow: {
    tag?: string;
    name?: string;
    description?: string;
    input?: Record<string, unknown>;
    steps?: Array<Record<string, unknown>>;
  };
  productTag?: string;
  productName?: string;
  productId?: string;
  productEnvs?: Array<{ slug: string; name?: string }>;
}

function nextStepTag(existing: Node<FlowStepNodeData>[]): string {
  const nums = existing
    .map((n) => n.id.match(/^step-(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `step-${next}`;
}

function stepsToDrafts(steps: Array<Record<string, unknown>> = []): WorkflowStepDraft[] {
  return steps.map((step, index) => ({
    tag: String(step.tag || `step-${index + 1}`),
    name: step.name ? String(step.name) : undefined,
    type: String(step.type || 'action'),
    app: step.app ? String(step.app) : undefined,
    database: step.database ? String(step.database) : undefined,
    graph: step.graph ? String(step.graph) : undefined,
    storage: step.storage ? String(step.storage) : undefined,
    vector: step.vector ? String(step.vector) : undefined,
    notification: step.notification ? String(step.notification) : undefined,
    broker: step.broker ? String(step.broker) : undefined,
    quota: step.quota ? String(step.quota) : undefined,
    fallback: step.fallback ? String(step.fallback) : undefined,
    workflow: step.workflow ? String(step.workflow) : undefined,
    event: String(step.event || 'run'),
    input: (step.input as Record<string, unknown>) || {},
    output: step.output as Record<string, unknown> | undefined,
    depends_on: step.depends_on as string[] | undefined,
    condition: step.condition ? String(step.condition) : undefined,
    options: step.options as Record<string, unknown> | undefined,
  }));
}

export default function WorkflowBuilderTab({
  workflow,
  productTag,
  productName,
  productId,
  productEnvs = [],
}: WorkflowBuilderTabProps) {
  const { setSidebarCollapsed, openTab } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const proxy = useResilienceProxy();

  const [editMode, setEditMode] = useState(false);
  const [stepDrafts, setStepDrafts] = useState<WorkflowStepDraft[]>(() =>
    stepsToDrafts(workflow.steps || []),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const baseFlow = useMemo(() => workflowStepsToFlow(stepDrafts as any), [stepDrafts]);
  const [builderNodes, setBuilderNodes] = useState<Node<FlowStepNodeData>[]>(baseFlow.nodes);
  const [builderEdges, setBuilderEdges] = useState<Edge[]>(baseFlow.edges);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    if (!editMode) {
      const flow = workflowStepsToFlow(stepDrafts as any);
      setBuilderNodes(flow.nodes);
      setBuilderEdges(flow.edges);
    }
  }, [stepDrafts, editMode]);

  const { data: productAppsRes } = useQuery({
    queryKey: ['workflow-product-apps', productId],
    queryFn: () =>
      productServices.fetchProductApps({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: productId || '',
      }),
    enabled: !!user?._id && !!productId && !!currentWorkspaceId,
  });

  const { data: productDetailsRes } = useQuery({
    queryKey: ['workflow-product-details', productId],
    queryFn: () =>
      productServices.fetchProduct({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
        product_id: productId || '',
      }),
    enabled: !!user?._id && !!productId && !!currentWorkspaceId,
  });

  const productContext: ProductContext = useMemo(() => {
    const details = productDetailsRes?.data;
    return {
      _id: productId,
      tag: productTag,
      name: productName,
      envs: productEnvs,
      apps: productAppsRes?.data || [],
      databases: details?.databases || [],
      storages: details?.storage || details?.storages || [],
      notifications: details?.notifications || [],
      graphs: details?.graphs || [],
      vectors: details?.vectors || [],
      messageBrokers: details?.messageBrokers || [],
      workflows: details?.workflows || [],
      features: details?.features || [],
    };
  }, [productAppsRes, productDetailsRes, productId, productTag, productName, productEnvs]);

  const connectedApps = productAppsRes?.data || [];

  const selectedNode = useMemo(
    () => builderNodes.find((n) => n.id === selectedNodeId) || null,
    [builderNodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => builderEdges.find((e) => e.id === selectedEdgeId) || null,
    [builderEdges, selectedEdgeId],
  );

  const selectedStepDraft = useMemo(
    () => stepDrafts.find((s) => s.tag === selectedNodeId) || null,
    [stepDrafts, selectedNodeId],
  );

  const withParentMeta = useCallback(
    (nodes: Node<FlowStepNodeData>[], edges: Edge[]) =>
      nodes.map((n) => {
        if (n.data.kind === 'start' || n.data.kind === 'end' || n.data.kind === 'condition') {
          return n;
        }
        const { isLayer1, parentTags } = resolveStepParents(n.id, nodes, edges);
        const parentsLabel = isLayer1 ? '$Input' : parentTags.join(', ') || '—';
        return {
          ...n,
          data: {
            ...n.data,
            meta: { ...n.data.meta, parents: parentsLabel },
          },
        };
      }),
    [],
  );

  const syncStepsFromGraph = useCallback(
    (nodes: Node<FlowStepNodeData>[], edges: Edge[]) => {
      setStepDrafts((prev) => flowGraphToWorkflowSteps(nodes, edges, prev));
    },
    [],
  );

  const addStepNode = useCallback(
    (type: string, label: string, kind: FlowNodeKind, yOffset?: number) => {
      const stepTag = kind === 'condition' ? `condition-${Date.now()}` : nextStepTag(builderNodes);
      const isCondition = kind === 'condition';
      const newNode: Node<FlowStepNodeData> = {
        id: stepTag,
        type: 'flowStep',
        position: { x: 120, y: yOffset ?? 180 + builderNodes.length * 80 },
        data: {
          label,
          subtitle: type,
          kind,
          meta: isCondition ? {} : { event: kind === 'action' ? '' : type },
        },
      };
      setBuilderNodes((nodes) => [...nodes, newNode]);

      if (!isCondition) {
        setBuilderEdges((edges) => [
          ...edges,
          {
            id: `e-start-${stepTag}`,
            source: 'start',
            target: stepTag,
            animated: true,
          },
        ]);
        const draft: WorkflowStepDraft = {
          tag: stepTag,
          type,
          name: label,
          event: kind === 'database' ? 'read' : kind === 'produce' ? '' : 'run',
          input: {},
        };
        setStepDrafts((steps) => [...steps, draft]);
      }

      toast.success(`Added ${label}`);
    },
    [builderNodes],
  );

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/ductape-workflow-step');
      if (!raw) return;
      try {
        const item = JSON.parse(raw) as (typeof WORKFLOW_PALETTE_ITEMS)[number];
        addStepNode(item.type, item.label, item.kind);
      } catch {
        /* ignore */
      }
    },
    [addStepNode],
  );

  const handleUpdateStep = useCallback((tag: string, updates: Partial<WorkflowStepDraft>) => {
    setStepDrafts((steps) =>
      steps.map((s) => (s.tag === tag ? { ...s, ...updates } : s)),
    );
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, data: Partial<FlowStepNodeData>) => {
    setBuilderNodes((nodes) =>
      nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
  }, []);

  const handleUpdateEdge = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setBuilderEdges((edges) =>
      edges.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
    );
  }, []);

  const { mutateAsync: saveWorkflow, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!proxy) throw new Error('SDK proxy not available');
      if (!productTag || !workflow.tag) throw new Error('Product or workflow tag missing');

      const parentCheck = validateWorkflowParentGraph(builderNodes, builderEdges, stepDrafts);
      if (!parentCheck.valid) {
        throw new Error(parentCheck.errors[0] || 'Every step must have a parent');
      }

      await proxy.product.init(productTag);

      const serialized = flowGraphToWorkflowSteps(builderNodes, builderEdges, stepDrafts);
      const payload = {
        name: workflow.name,
        description: workflow.description,
        tag: workflow.tag,
        input: workflow.input,
        steps: serialized.map((s) => ({
          ...s,
          input: s.input || {},
        })),
      };

      try {
        await proxy.workflow.update(workflow.tag, productTag, payload);
      } catch {
        await proxy.workflow.create(productTag, payload);
      }

      return payload;
    },
    onSuccess: () => {
      toast.success('Workflow saved');
      setEditMode(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save workflow');
    },
  });

  const openEnvExplorer = (envSlug: string) => {
    if (!workflow.tag || !productTag) return;
    openTab({
      id: `workflow-explorer-${workflow.tag}-${envSlug}`,
      type: 'workflow',
      title: `${workflow.name || workflow.tag} (${envSlug})`,
      itemId: `${workflow.tag}-${envSlug}`,
      data: {
        isExplorer: true,
        product: {
          tag: productTag,
          name: productName,
          envs: productEnvs,
        },
        workflow: {
          ...workflow,
          tag: workflow.tag,
          productTag,
          env: { slug: envSlug },
        },
      },
    });
  };

  useEffect(() => {
    if (!editMode) return;
    const withMeta = withParentMeta(builderNodes, builderEdges);
    syncStepsFromGraph(withMeta, builderEdges);
  }, [builderEdges, editMode, withParentMeta, syncStepsFromGraph]);

  const selectedParentInfo = useMemo(() => {
    if (!selectedNodeId) return { isLayer1: false, parentTags: [] };
    return resolveStepParents(selectedNodeId, builderNodes, builderEdges);
  }, [selectedNodeId, builderNodes, builderEdges]);

  const selectedParentSteps = useMemo(
    () => stepDrafts.filter((s) => selectedParentInfo.parentTags.includes(s.tag)),
    [stepDrafts, selectedParentInfo.parentTags],
  );

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      {editMode ? (
        <WorkflowStepPalette onAddStep={addStepNode} />
      ) : null}

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="shrink-0 border-b border-grey-300 bg-white px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <WorkflowIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-grey truncate">
                {workflow.name || workflow.tag || 'Workflow'}
              </h1>
              <p className="text-xs text-grey-600 font-mono truncate">{workflow.tag}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {productEnvs.length > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 mr-2">
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
            <Button
              type="button"
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => {
                setEditMode((v) => !v);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
            >
              <GripVertical className="h-3.5 w-3.5 mr-1" />
              {editMode ? 'Done editing' : 'Edit flow'}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              disabled={isSaving || !workflow.tag || !productTag}
              onClick={() => saveWorkflow()}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>

        {workflow.description ? (
          <p className="shrink-0 px-4 py-2 text-sm text-grey-600 bg-white border-b border-grey-200">
            {workflow.description}
          </p>
        ) : null}

        <div className="flex-1 flex min-h-0">
          <div
            className="flex-1 min-h-0 relative"
            onDragOver={(e) => {
              if (editMode) e.preventDefault();
            }}
            onDrop={editMode ? handleCanvasDrop : undefined}
          >
            {stepDrafts.length === 0 && !editMode ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center max-w-sm px-4">
                  <p className="text-sm text-grey-600">No steps defined yet.</p>
                  <p className="text-xs text-grey-500 mt-1">
                    Click <strong>Edit flow</strong> to add steps from the palette.
                  </p>
                </div>
              </div>
            ) : null}
            <FlowCanvas
              key={`${editMode}-${stepDrafts.map((s) => s.tag).join(',')}`}
              initialNodes={builderNodes}
              initialEdges={builderEdges}
              editable={editMode}
              className="h-full w-full"
              onNodesChangeExternal={(nodes) => {
                setBuilderNodes(nodes);
              }}
              onEdgesChangeExternal={(edges) => {
                setBuilderEdges(edges);
                setBuilderNodes((prevNodes) => withParentMeta(prevNodes, edges));
              }}
              onNodeClick={(node) => {
                if (!editMode) return;
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(edge) => {
                if (!editMode) return;
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
            />
          </div>

          {editMode && (selectedNode || selectedEdge) ? (
            <WorkflowStepInspector
              node={selectedNode}
              edge={selectedEdge}
              stepDraft={selectedStepDraft}
              product={productContext}
              connectedApps={connectedApps}
              parentInfo={selectedParentInfo}
              parentSteps={selectedParentSteps}
              workflowInputs={workflow.input}
              onClose={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              onUpdateStep={handleUpdateStep}
              onUpdateNode={handleUpdateNode}
              onUpdateEdge={handleUpdateEdge}
            />
          ) : null}
        </div>

        {editMode ? (
          <div className="shrink-0 border-t border-grey-300 bg-white px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-grey-600">Quick add:</span>
            <Input
              className="h-8 max-w-xs text-sm"
              placeholder="Step name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    addStepNode('action', value, 'action');
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <span className="text-[11px] text-grey-500">
              Connect steps from Start (layer 1 → workflow input) or from parent steps (map from $Step output)
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

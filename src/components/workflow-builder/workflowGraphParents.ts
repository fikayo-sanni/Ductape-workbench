import type { Edge, Node } from '@xyflow/react';
import type { FlowNodeKind, FlowStepNodeData } from '@/components/flow-diagram/flowModels';
import type { WorkflowStepDraft } from './types';

const NON_STEP_KINDS = new Set<FlowNodeKind>(['start', 'end', 'condition', 'router']);

export interface StepParentInfo {
  /** Connected from Start — maps inputs from workflow $Input{} */
  isLayer1: boolean;
  /** Direct or transitive parent step tags (via condition/router nodes) */
  parentTags: string[];
}

function isStepNode(node: Node<FlowStepNodeData> | undefined): boolean {
  if (!node) return false;
  return !NON_STEP_KINDS.has(node.data.kind);
}

/** Resolve parent steps for a node from the flow graph. */
export function resolveStepParents(
  nodeId: string,
  nodes: Node<FlowStepNodeData>[],
  edges: Edge[],
): StepParentInfo {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const inEdges = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    if (!inEdges.has(edge.target)) inEdges.set(edge.target, []);
    inEdges.get(edge.target)!.push(edge);
  });

  const parentTags = new Set<string>();
  let hasStartParent = false;

  const walkIncoming = (targetId: string, visited: Set<string>) => {
    const incoming = inEdges.get(targetId) || [];
    for (const edge of incoming) {
      const src = edge.source;
      if (src === 'start') {
        hasStartParent = true;
        continue;
      }
      const srcNode = nodeById.get(src);
      if (!srcNode) continue;

      if (srcNode.data.kind === 'condition' || srcNode.data.kind === 'router') {
        if (!visited.has(src)) {
          visited.add(src);
          walkIncoming(src, visited);
        }
        continue;
      }

      if (isStepNode(srcNode)) {
        parentTags.add(src);
      }
    }
  };

  walkIncoming(nodeId, new Set());

  return {
    isLayer1: hasStartParent && parentTags.size === 0,
    parentTags: Array.from(parentTags),
  };
}

export function stepHasValidParent(
  nodeId: string,
  nodes: Node<FlowStepNodeData>[],
  edges: Edge[],
): boolean {
  const { isLayer1, parentTags } = resolveStepParents(nodeId, nodes, edges);
  return isLayer1 || parentTags.length > 0;
}

export function validateWorkflowParentGraph(
  nodes: Node<FlowStepNodeData>[],
  edges: Edge[],
  stepDrafts: WorkflowStepDraft[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const step of stepDrafts) {
    const node = nodes.find((n) => n.id === step.tag);
    if (!node || !isStepNode(node)) continue;

    const { isLayer1, parentTags } = resolveStepParents(step.tag, nodes, edges);
    if (!isLayer1 && parentTags.length === 0) {
      errors.push(
        `"${step.name || step.tag}" has no parent — connect it from Start (layer 1) or from another step`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Build mapping sources from resolved parents. */
export function buildParentMappingSources(
  parentInfo: StepParentInfo,
  parentSteps: WorkflowStepDraft[],
  workflowInputs: Record<string, unknown> = {},
) {
  const sources = [];

  if (parentInfo.isLayer1) {
    const inputKeys = Object.keys(workflowInputs);
    sources.push({
      id: 'input',
      label: 'Workflow input (layer 1)',
      prefix: '$Input',
      fields: inputKeys.length
        ? inputKeys.map((k) => ({ key: k }))
        : [{ key: 'field' }],
    });
  }

  for (const parent of parentSteps) {
    const outputFields = Object.keys(parent.output || {});
    const inputFields = Object.keys(parent.input || {});
    const fields = (outputFields.length ? outputFields : inputFields).map((k) => ({ key: k }));

    sources.push({
      id: parent.tag,
      label: `${parent.name || parent.tag} (parent)`,
      prefix: `$Step{${parent.tag}}`,
      fields: fields.length ? fields : [{ key: 'result' }],
    });
  }

  return sources;
}

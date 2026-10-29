import { useMemo } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { layoutGraph, type IWorkItem, type WorkStatus } from '@/utils/workBoard';
import { StatusChip } from './WorkChips';

type NodeData = { ref: string; title: string; status: WorkStatus; components: number; live: boolean };

const EDGE: Record<string, string> = { done: 'border-green', blocked: 'border-orange', awaiting_approval: 'border-orange', claimed: 'border-primary', in_progress: 'border-primary', in_review: 'border-primary' };

function WorkNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div className={cn('w-[220px] rounded-lg border-2 bg-white p-2.5 shadow-sm', EDGE[data.status] ?? 'border-grey-400')}>
      <Handle type="target" position={Position.Left} className="!bg-grey-400" />
      <div className="mb-1 flex items-center gap-1.5">
        <span className="font-mono text-[11px] font-semibold text-grey-600">{data.ref}</span>
        <StatusChip status={data.status} />
        {data.live ? <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-green" aria-label="an agent is on it" /> : null}
      </div>
      <div className="text-xs font-medium leading-snug text-grey">{data.title}</div>
      <Handle type="source" position={Position.Right} className="!bg-grey-400" />
    </div>
  );
}

const nodeTypes = { work: WorkNode };

/** A plan as an execution graph: left to right in the order work can happen, each item coloured by where it is. */
export default function WorkGraph({ items, edges, liveIds, onOpen }: { items: IWorkItem[]; edges: Array<{ from: string; to: string; type: string }>; liveIds: Set<string>; onOpen: (ref: string) => void }) {
  const blocking = useMemo(() => edges.filter((e) => e.type === 'blocks'), [edges]);
  const nodes: Node<NodeData>[] = useMemo(
    () =>
      layoutGraph(items, blocking).map((n) => {
        const item = items.find((i) => i.id === n.id) as IWorkItem;
        return { id: n.id, type: 'work', position: { x: n.x, y: n.y }, data: { ref: n.ref, title: n.title, status: n.status, components: item.components.length, live: liveIds.has(n.id) } };
      }),
    [items, blocking, liveIds],
  );
  const flowEdges: Edge[] = useMemo(
    () =>
      blocking
        .filter((e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to))
        .map((e) => {
          const from = items.find((i) => i.id === e.from);
          const done = from?.status === 'done';
          return {
            id: `${e.from}-${e.to}`,
            source: e.from,
            target: e.to,
            animated: !done,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: done ? '#00875A' : '#9AA0A6', strokeWidth: 1.5 },
          };
        }),
    [blocking, nodes, items],
  );
  if (!nodes.length) return <div className="rounded-xl border border-grey-400 bg-white p-8 text-center text-sm text-grey-600">No work in this plan yet.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-grey-400 bg-white" style={{ height: Math.max(320, Math.min(720, (Math.max(...nodes.map((n) => n.position.y)) + 110) + 120)) }} data-testid="work-graph">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1.1 }}
          minZoom={0.3}
          onInit={(flow) => setTimeout(() => flow.fitView({ padding: 0.15, maxZoom: 1.1 }), 60)}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => onOpen((node.data as NodeData).ref)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

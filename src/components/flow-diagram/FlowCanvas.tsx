import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlowStepNode } from './FlowStepNode';
import type { FlowStepNodeData } from './flowModels';

const nodeTypes = { flowStep: FlowStepNode };

interface FlowCanvasProps {
  initialNodes: Node<FlowStepNodeData>[];
  initialEdges: Edge[];
  editable?: boolean;
  onNodesChangeExternal?: (nodes: Node<FlowStepNodeData>[]) => void;
  onEdgesChangeExternal?: (edges: Edge[]) => void;
  onNodeClick?: (node: Node<FlowStepNodeData>) => void;
  onEdgeClick?: (edge: Edge) => void;
  className?: string;
}

function FlowCanvasInner({
  initialNodes,
  initialEdges,
  editable = false,
  onNodesChangeExternal,
  onEdgesChangeExternal,
  onNodeClick,
  onEdgeClick,
  className,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodesChangeExternalRef = useRef(onNodesChangeExternal);
  const onEdgesChangeExternalRef = useRef(onEdgesChangeExternal);
  onNodesChangeExternalRef.current = onNodesChangeExternal;
  onEdgesChangeExternalRef.current = onEdgesChangeExternal;

  const isFirstNodesSync = useRef(true);
  const isFirstEdgesSync = useRef(true);

  useEffect(() => {
    if (isFirstNodesSync.current) {
      isFirstNodesSync.current = false;
      return;
    }
    onNodesChangeExternalRef.current?.(nodes as Node<FlowStepNodeData>[]);
  }, [nodes]);

  useEffect(() => {
    if (isFirstEdgesSync.current) {
      isFirstEdgesSync.current = false;
      return;
    }
    onEdgesChangeExternalRef.current?.(edges);
  }, [edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editable) return;
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [editable, setEdges],
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className={className || 'h-full w-full'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick?.(node as Node<FlowStepNodeData>)}
        onEdgeClick={(_, edge) => onEdgeClick?.(edge)}
        nodeTypes={nodeTypes}
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={proOptions}
        minZoom={0.4}
        maxZoom={1.5}
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <Controls showInteractive={editable} />
        <MiniMap
          nodeStrokeWidth={2}
          pannable
          zoomable
          className="!bg-white/90 !border !border-grey-300"
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

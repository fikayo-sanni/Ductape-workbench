import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Activity,
  Bell,
  Boxes,
  Database,
  GitBranch,
  Heart,
  Play,
  Send,
  Share2,
  Shield,
  Square,
  Timer,
  Workflow,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowNodeKind, FlowStepNodeData } from './flowModels';

const KIND_STYLES: Record<
  FlowNodeKind,
  { icon: typeof Zap; border: string; bg: string; text: string }
> = {
  start: { icon: Play, border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  end: { icon: Square, border: 'border-grey-400', bg: 'bg-grey-100', text: 'text-grey-700' },
  action: { icon: Zap, border: 'border-primary/40', bg: 'bg-primary/5', text: 'text-primary' },
  produce: { icon: Send, border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
  storage: { icon: Boxes, border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  notification: { icon: Bell, border: 'border-pink-400', bg: 'bg-pink-50', text: 'text-pink-700' },
  database: { icon: Database, border: 'border-violet-400', bg: 'bg-violet-50', text: 'text-violet-700' },
  graph: { icon: Share2, border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700' },
  vector: { icon: Share2, border: 'border-fuchsia-400', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  workflow: { icon: Workflow, border: 'border-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  quota: { icon: Timer, border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' },
  fallback: { icon: Shield, border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' },
  healthcheck: { icon: Heart, border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' },
  condition: { icon: GitBranch, border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  provider: { icon: Activity, border: 'border-teal-400', bg: 'bg-teal-50', text: 'text-teal-700' },
  router: { icon: GitBranch, border: 'border-sky-400', bg: 'bg-sky-50', text: 'text-sky-700' },
};

function FlowStepNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowStepNodeData;
  const kind = nodeData.kind || 'action';
  const style = KIND_STYLES[kind] || KIND_STYLES.action;
  const Icon = style.icon;
  const isTerminal = kind === 'start' || kind === 'end';

  return (
    <div
      className={cn(
        'rounded-lg border-2 shadow-sm min-w-[200px] max-w-[240px] bg-white transition-shadow',
        style.border,
        selected && 'ring-2 ring-primary/30 shadow-md',
      )}
    >
      {kind !== 'start' && (
        <Handle type="target" position={Position.Top} className="!bg-grey-400 !w-2 !h-2" />
      )}
      <div className={cn('px-3 py-2.5 rounded-t-md', style.bg)}>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', style.text)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-grey truncate">{nodeData.label}</p>
            {nodeData.subtitle ? (
              <p className="text-[11px] text-grey-600 truncate">{nodeData.subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {nodeData.meta && Object.keys(nodeData.meta).length > 0 ? (
        <div className="px-3 py-2 space-y-0.5 border-t border-grey-200">
          {Object.entries(nodeData.meta).slice(0, 3).map(([key, value]) => (
            <p key={key} className="text-[10px] text-grey-600 truncate">
              <span className="font-medium text-grey">{key}:</span> {value}
            </p>
          ))}
        </div>
      ) : null}
      {!isTerminal ? (
        <Handle type="source" position={Position.Bottom} className="!bg-grey-400 !w-2 !h-2" />
      ) : null}
      {kind === 'end' && (
        <Handle type="target" position={Position.Top} className="!bg-grey-400 !w-2 !h-2" />
      )}
    </div>
  );
}

export const FlowStepNode = memo(FlowStepNodeComponent);

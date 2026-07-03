import { FEATURE_PALETTE_ITEMS, type FlowNodeKind } from './flowModels';
import { cn } from '@/lib/utils';

interface FeatureStepPaletteProps {
  onAddStep: (type: string, label: string, kind: FlowNodeKind) => void;
}

export function FeatureStepPalette({ onAddStep }: FeatureStepPaletteProps) {
  return (
    <div className="w-56 shrink-0 border-r border-grey-300 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-grey-300">
        <p className="text-xs font-semibold uppercase tracking-wide text-grey-600">Steps</p>
        <p className="text-[11px] text-grey-500 mt-0.5">Drag or click to add to canvas</p>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {FEATURE_PALETTE_ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/ductape-feature-step', JSON.stringify(item));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onAddStep(item.type, item.label, item.kind)}
            className={cn(
              'w-full text-left rounded-md border border-grey-300 px-3 py-2',
              'hover:border-primary hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing',
            )}
          >
            <p className="text-sm font-medium text-grey">{item.label}</p>
            <p className="text-[10px] text-grey-500 font-mono">{item.type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

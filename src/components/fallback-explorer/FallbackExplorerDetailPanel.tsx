import { Shield, Code, Settings2, Trash2, Zap, Database, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductFallback, FallbackOption } from './types';

function optionIcon(type: string) {
  switch (type) {
    case 'action':
      return <Zap className="h-3.5 w-3.5" />;
    case 'db_action':
      return <Database className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function formatOptionLabel(opt: FallbackOption, index: number) {
  const role = index === 0 ? 'Primary' : index === 1 ? 'Fallback' : `Option ${index + 1}`;
  const target = opt.app ? `${opt.app} · ${opt.event}` : opt.event;
  return { role, target };
}

interface FallbackExplorerDetailPanelProps {
  fallback: ProductFallback | undefined;
  selectedEnv: string;
  onOpenTab: () => void;
  onViewCode: () => void;
  onDelete: () => void;
}

export function FallbackExplorerDetailPanel({
  fallback,
  selectedEnv,
  onOpenTab,
  onViewCode,
  onDelete,
}: FallbackExplorerDetailPanelProps) {
  if (!fallback) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-50/50 p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-lg bg-red/10 border border-red/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red" />
          </div>
          <h3 className="text-base font-semibold text-grey mb-1">Select a fallback</h3>
          <p className="text-sm text-grey-500">
            Pick one from the sidebar to see ordered options and configuration for an environment.
          </p>
        </div>
      </div>
    );
  }

  const options = fallback.options || [];

  return (
    <div className="flex-1 overflow-auto bg-grey-50/30">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red/10 border border-red/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-grey">{fallback.name}</h2>
              <code className="text-sm font-mono text-grey-500">{fallback.tag}</code>
              {fallback.description && (
                <p className="text-sm text-grey-600 mt-2">{fallback.description}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {options.length} option{options.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenTab} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Edit configuration
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onViewCode} className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Code
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-1.5 text-red hover:text-red"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        <div className="rounded-lg border border-grey-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-2">Environment</p>
          <p className="text-sm font-medium text-grey">{selectedEnv}</p>
        </div>

        <div className="rounded-lg border border-grey-300 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-grey-200">
            <h3 className="text-sm font-semibold text-grey">Options (ordered)</h3>
            <p className="text-xs text-grey-500 mt-0.5">Automatic failover runs top to bottom</p>
          </div>
          <div className="p-4 space-y-2">
            {options.length === 0 ? (
              <p className="text-sm text-grey-500 text-center py-4">No options configured</p>
            ) : (
              options.map((opt, idx) => {
                const { role, target } = formatOptionLabel(opt, idx);
                return (
                  <div
                    key={`${opt.event}-${idx}`}
                    className="rounded-lg border border-grey-200 bg-white px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={cn(
                          'mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                          idx === 0 ? 'bg-green' : 'bg-grey-400'
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-grey">{role}</p>
                        <p className="text-xs text-grey-500 truncate flex items-center gap-1 mt-0.5">
                          {optionIcon(opt.type)}
                          <span className="truncate">{target}</span>
                        </p>
                        {opt.healthcheck && (
                          <p className="text-[10px] text-grey-500 mt-1">Healthcheck: {opt.healthcheck}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-grey-500 tabular-nums flex-shrink-0">weight {idx + 1}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-grey-300 bg-grey-50/80 p-4">
          <p className="text-xs font-semibold text-grey mb-2">Last runtime trace</p>
          <p className="text-xs font-mono text-grey-500 leading-relaxed">
            Traces from fallback runs appear in workspace logs. Filter by product and event{' '}
            <code className="text-grey-600">{fallback.tag}</code> to inspect primary failures and failover
            invocations.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Timer, Code, Settings2, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductQuota } from './types';

interface QuotaExplorerDetailPanelProps {
  quota: ProductQuota | undefined;
  selectedEnv: string;
  usageSummary?: string;
  onOpenTab: () => void;
  onViewCode: () => void;
  onDelete: () => void;
}

export function QuotaExplorerDetailPanel({
  quota,
  selectedEnv,
  usageSummary,
  onOpenTab,
  onViewCode,
  onDelete,
}: QuotaExplorerDetailPanelProps) {
  if (!quota) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-50/50 p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Timer className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-base font-semibold text-grey mb-1">Select a quota</h3>
          <p className="text-sm text-grey-500">
            Pick one from the sidebar to see limits, options, and usage for the selected environment.
          </p>
        </div>
      </div>
    );
  }

  const options = quota.options || [];

  return (
    <div className="flex-1 overflow-auto bg-grey-50/30">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Timer className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-grey">{quota.name}</h2>
              <code className="text-sm font-mono text-grey-500">{quota.tag}</code>
              {quota.description && (
                <p className="text-sm text-grey-600 mt-2">{quota.description}</p>
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

        <div className="rounded-lg border border-grey-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            <p className="text-xs font-semibold text-grey-500 uppercase tracking-wide">Usage window</p>
          </div>
          <p className="text-sm text-grey-600">
            {usageSummary ||
              `Check and consume quota in ${selectedEnv} via the SDK. Usage metrics sync when you call quotas.check or quotas.consume.`}
          </p>
        </div>

        <div className="rounded-lg border border-grey-300 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-grey-200">
            <h3 className="text-sm font-semibold text-grey">Quota options</h3>
          </div>
          <div className="p-4 space-y-2">
            {options.length === 0 ? (
              <p className="text-sm text-grey-500 text-center py-4">No options configured</p>
            ) : (
              options.map((opt, idx) => (
                <div
                  key={`${opt.event}-${idx}`}
                  className="rounded-lg border border-grey-200 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-grey truncate">
                      {opt.app ? `${opt.app} · ` : ''}
                      {opt.event}
                    </p>
                    <p className="text-xs text-grey-500 capitalize">{opt.type.replace('_', ' ')}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600 tabular-nums flex-shrink-0">
                    {opt.quota ?? '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

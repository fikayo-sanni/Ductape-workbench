import { Timer, BarChart3, Zap, Layers, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductQuota } from './types';

interface QuotaExplorerOverviewProps {
  metrics: {
    total: number;
    options: number;
    totalQuotaWeight: number;
    byType: Record<string, number>;
  };
  quotas: ProductQuota[];
  onViewAll: () => void;
  onSelect: (q: ProductQuota) => void;
}

export function QuotaExplorerOverview({ metrics, quotas, onViewAll, onSelect }: QuotaExplorerOverviewProps) {
  const statCards = [
    { label: 'Quotas', value: metrics.total, icon: Timer, className: 'text-orange-600 bg-orange-500/10' },
    { label: 'Options', value: metrics.options, icon: Layers, className: 'text-blue bg-blue/10' },
    {
      label: 'Quota units',
      value: metrics.totalQuotaWeight,
      icon: BarChart3,
      className: 'text-purple-600 bg-purple-500/10',
    },
    {
      label: 'Action options',
      value: metrics.byType['action'] || 0,
      icon: Zap,
      className: 'text-green bg-green/10',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-grey-300 bg-white p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${card.className}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-grey tabular-nums">{card.value}</p>
              <p className="text-xs text-grey-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-grey-300 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-grey-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-grey">All quotas</h3>
            <Button type="button" variant="ghost" size="sm" className="text-orange-600 text-xs h-8" onClick={onViewAll}>
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-grey-200">
            {quotas.length === 0 ? (
              <div className="py-10 text-center">
                <Timer className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                <p className="text-sm text-grey-600">No quotas yet</p>
                <p className="text-xs text-grey-500 mt-1">Define limits and usage windows per environment</p>
              </div>
            ) : (
              quotas.slice(0, 8).map((q) => (
                <button
                  key={q.tag}
                  type="button"
                  onClick={() => onSelect(q)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-grey-50/80 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Timer className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-grey truncate">{q.name}</p>
                      <p className="text-xs text-grey-500 font-mono truncate">
                        {q.tag} · {q.options?.length || 0} options
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-grey-400 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

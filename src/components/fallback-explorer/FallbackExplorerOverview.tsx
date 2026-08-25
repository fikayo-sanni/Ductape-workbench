import { Shield, Zap, Activity, LayoutDashboard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductFallback } from './types';

interface FallbackExplorerOverviewProps {
  metrics: {
    total: number;
    options: number;
    withHealthcheck: number;
    byType: Record<string, number>;
  };
  fallbacks: ProductFallback[];
  onViewAll: () => void;
  onSelect: (f: ProductFallback) => void;
}

export function FallbackExplorerOverview({
  metrics,
  fallbacks,
  onViewAll,
  onSelect,
}: FallbackExplorerOverviewProps) {
  const statCards = [
    { label: 'Fallbacks', value: metrics.total, icon: Shield, className: 'text-red bg-red/10' },
    { label: 'Options', value: metrics.options, icon: Zap, className: 'text-blue bg-blue/10' },
    {
      label: 'With healthcheck',
      value: metrics.withHealthcheck,
      icon: Activity,
      className: 'text-green bg-green/10',
    },
    {
      label: 'Action options',
      value: metrics.byType['action'] || 0,
      icon: LayoutDashboard,
      className: 'text-purple-600 bg-purple-500/10',
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
            <h3 className="text-sm font-semibold text-grey">All fallbacks</h3>
            <Button type="button" variant="ghost" size="sm" className="text-red text-xs h-8" onClick={onViewAll}>
              View all
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-grey-200">
            {fallbacks.length === 0 ? (
              <div className="py-10 text-center">
                <Shield className="h-8 w-8 text-grey-400 mx-auto mb-2" />
                <p className="text-sm text-grey-600">No fallbacks yet</p>
                <p className="text-xs text-grey-500 mt-1">Create one to configure ordered failover options</p>
              </div>
            ) : (
              fallbacks.slice(0, 8).map((f) => (
                <button
                  key={f.tag}
                  type="button"
                  onClick={() => onSelect(f)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-grey-50/80 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-red" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-grey truncate">{f.name}</p>
                      <p className="text-xs text-grey-500 font-mono truncate">
                        {f.tag} · {f.options?.length || 0} options
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

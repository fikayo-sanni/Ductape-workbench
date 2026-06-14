import {
  Heart,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { IHealthCheck } from '@/types/healthcheck';
import { formatAgo, getEnvStatusForSlug } from './utils';

interface HealthcheckExplorerOverviewProps {
  metrics: {
    total: number;
    healthy: number;
    unhealthy: number;
    avgLatency: string;
    recentlyChecked: number;
    byEnv: Record<string, { healthy: number; unhealthy: number }>;
  };
  healthchecks: IHealthCheck[];
  selectedEnv: string;
  onViewAll: () => void;
  onSelect: (h: IHealthCheck) => void;
}

export function HealthcheckExplorerOverview({
  metrics,
  healthchecks,
  selectedEnv,
  onViewAll,
  onSelect,
}: HealthcheckExplorerOverviewProps) {
  const statCards = [
    { label: 'Healthchecks', value: metrics.total, icon: Heart, className: 'text-rose-600 bg-rose-500/10' },
    { label: 'Healthy', value: metrics.healthy, icon: CheckCircle, className: 'text-green bg-green/10' },
    { label: 'Unhealthy', value: metrics.unhealthy, icon: XCircle, className: 'text-red bg-red/10' },
    { label: 'Avg latency', value: metrics.avgLatency, icon: Zap, className: 'text-blue bg-blue/10' },
    {
      label: 'Recent (5m)',
      value: metrics.recentlyChecked,
      icon: Clock,
      className: 'text-purple-600 bg-purple-500/10',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', card.className)}>
                <card.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-grey tabular-nums">{card.value}</p>
              <p className="text-xs text-grey-500">{card.label}</p>
            </div>
          ))}
        </div>

        {Object.keys(metrics.byEnv).length > 0 && (
          <div className="rounded-xl border border-grey-300 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-grey-200">
              <h3 className="text-sm font-semibold text-grey">By environment</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(metrics.byEnv).map(([env, status]) => {
                const total = status.healthy + status.unhealthy;
                const pct = total > 0 ? Math.round((status.healthy / total) * 100) : 100;
                return (
                  <div key={env} className="rounded-lg border border-grey-200 bg-grey-50/80 p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-grey uppercase">{env}</span>
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          status.unhealthy > 0 ? 'bg-red' : 'bg-green'
                        )}
                      />
                    </div>
                    <div className="h-1.5 bg-grey-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={cn('h-full rounded-full', status.unhealthy > 0 ? 'bg-orange-400' : 'bg-green')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-grey-500">
                      {status.healthy} healthy · {status.unhealthy} unhealthy
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-grey-300 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-grey-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-grey">Healthchecks</h3>
            <button type="button" onClick={onViewAll} className="text-xs text-rose-600 font-medium flex items-center gap-0.5 hover:underline">
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {healthchecks.length === 0 ? (
            <p className="px-4 py-8 text-sm text-grey-500 text-center">No healthchecks configured</p>
          ) : (
            <ul className="divide-y divide-grey-100">
              {healthchecks.slice(0, 8).map((h) => {
                const envStatus = getEnvStatusForSlug(h, selectedEnv);
                const healthy = envStatus?.status === 'healthy';
                return (
                  <li key={h.tag}>
                    <button
                      type="button"
                      onClick={() => onSelect(h)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-grey-50 text-left"
                    >
                      <Heart className={cn('h-4 w-4', healthy ? 'text-green' : 'text-red')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-grey truncate">{h.name}</p>
                        <p className="text-xs text-grey-500 font-mono">{h.tag}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          healthy ? 'border-green/30 text-green' : 'border-red/30 text-red'
                        )}
                      >
                        {healthy ? 'Healthy' : 'Unhealthy'}
                      </Badge>
                      <span className="text-xs text-grey-400">{formatAgo(envStatus?.lastChecked)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { Heart, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IHealthCheck } from '@/types/healthcheck';
import { formatAgo, getEnvStatusForSlug, parseLatency } from './utils';

interface HealthcheckExplorerStatusViewProps {
  healthchecks: IHealthCheck[];
  selectedEnv: string;
  onSelect: (h: IHealthCheck) => void;
}

export function HealthcheckExplorerStatusView({
  healthchecks,
  selectedEnv,
  onSelect,
}: HealthcheckExplorerStatusViewProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs text-grey-500">Auto-refreshing every minute</span>
        </div>
        <div className="rounded-xl border border-grey-300 bg-white shadow-sm divide-y divide-grey-100">
          {healthchecks.length === 0 ? (
            <p className="p-8 text-sm text-grey-500 text-center">No healthchecks</p>
          ) : (
            healthchecks.map((h) => {
              const envStatus = getEnvStatusForSlug(h, selectedEnv);
              const healthy = envStatus?.status === 'healthy';
              const latency = parseLatency(envStatus?.lastLatency || '0ms');
              return (
                <button
                  key={h.tag}
                  type="button"
                  onClick={() => onSelect(h)}
                  className="w-full px-4 py-4 hover:bg-grey-50 text-left transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          healthy ? 'bg-green/10' : 'bg-red/10'
                        )}
                      >
                        <Heart className={cn('h-5 w-5', healthy ? 'text-green' : 'text-red')} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-grey truncate">{h.name}</p>
                        <p className="text-xs text-grey-500 font-mono">{h.tag}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p
                          className={cn(
                            'text-lg font-semibold tabular-nums',
                            latency < 100 ? 'text-green' : latency < 500 ? 'text-orange-500' : 'text-red'
                          )}
                        >
                          {envStatus?.lastLatency || '—'}
                        </p>
                        <p className="text-[10px] text-grey-500">latency</p>
                      </div>
                      {healthy ? (
                        <CheckCircle className="h-6 w-6 text-green" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 ml-[52px] flex flex-wrap gap-x-4 gap-y-1 text-xs text-grey-500">
                    <span>Interval {h.checkIntervals}</span>
                    <span>Checked {formatAgo(envStatus?.lastChecked)}</span>
                    {!healthy && envStatus?.lastAvailable && (
                      <span className="text-orange-600 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Up {formatAgo(envStatus.lastAvailable)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

import {
  Heart,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { IHealthCheck } from '@/types/healthcheck';
import { formatAgo, getEnvStatusForSlug, parseLatency } from './utils';

interface HealthcheckExplorerDetailPanelProps {
  healthcheck: IHealthCheck | undefined;
  selectedEnv: string;
  onOpenTab: () => void;
  onViewCode: () => void;
  onDelete: () => void;
}

export function HealthcheckExplorerDetailPanel({
  healthcheck,
  selectedEnv,
  onOpenTab,
  onViewCode,
  onDelete,
}: HealthcheckExplorerDetailPanelProps) {
  if (!healthcheck) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-50/50 p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-rose-600" />
          </div>
          <h3 className="text-base font-semibold text-grey mb-1">Select a healthcheck</h3>
          <p className="text-sm text-grey-500">
            Pick one from the sidebar to see status, latency, and actions for the selected environment.
          </p>
        </div>
      </div>
    );
  }

  const envStatus = getEnvStatusForSlug(healthcheck, selectedEnv);
  const healthy = envStatus?.status === 'healthy';
  const latency = parseLatency(envStatus?.lastLatency || '0ms');

  return (
    <div className="flex-1 overflow-auto bg-grey-50/30">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center border',
                healthy ? 'bg-green/10 border-green/20' : 'bg-red/10 border-red/20'
              )}
            >
              <Heart className={cn('h-6 w-6', healthy ? 'text-green' : 'text-red')} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-grey">{healthcheck.name}</h2>
              <code className="text-sm font-mono text-grey-500">{healthcheck.tag}</code>
              {healthcheck.description && (
                <p className="text-sm text-grey-600 mt-2">{healthcheck.description}</p>
              )}
            </div>
          </div>
          {healthy ? (
            <Badge className="bg-green/10 text-green border-green/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Healthy
            </Badge>
          ) : (
            <Badge className="bg-red/10 text-red border-red/20">
              <XCircle className="h-3 w-3 mr-1" />
              Unhealthy
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenTab} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Open details
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onViewCode} className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Code
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-red hover:text-red">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        <div className="rounded-xl border border-grey-300 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">
            {selectedEnv} environment
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-grey-500 uppercase">Last latency</p>
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  latency < 100 ? 'text-green' : latency < 500 ? 'text-orange-500' : 'text-red'
                )}
              >
                {envStatus?.lastLatency || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-grey-500 uppercase">Average</p>
              <p className="text-lg font-semibold text-grey tabular-nums">
                {envStatus?.averageLatency || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-grey-500 uppercase">Interval</p>
              <p className="text-sm font-medium text-grey flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {healthcheck.checkIntervals}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-grey-500 uppercase">Retries</p>
              <p className="text-sm font-medium text-grey">{healthcheck.retries}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-grey-500 uppercase">Last checked</p>
              <p className="text-sm text-grey">{formatAgo(envStatus?.lastChecked)}</p>
            </div>
            {!healthy && envStatus?.lastAvailable && (
              <div className="col-span-2 flex items-start gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-2 border border-orange-100">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Last available {formatAgo(envStatus.lastAvailable)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

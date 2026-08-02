import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, Heart, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/JsonViewer';
import { cn } from '@/lib/utils';
import { CheckEnvStatus, IHealthCheck } from '@/types/healthcheck';
import { formatAgo, parseLatency } from '@/components/healthcheck-explorer/utils';

interface HealthcheckTabContentProps {
  data?: IHealthCheck;
}

type HealthcheckEnvironment = CheckEnvStatus & {
  response?: unknown;
};

function ResponseSection({
  title,
  value,
  empty,
}: {
  title: string;
  value: unknown;
  empty: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-grey">{title}</h2>
      {value === undefined || value === null ? (
        <p className="text-sm text-grey-500">{empty}</p>
      ) : (
        <JsonViewer data={value} />
      )}
    </div>
  );
}

export default function HealthcheckTabContent({ data }: HealthcheckTabContentProps) {
  const healthcheck = data;
  const environment = useMemo(
    () => healthcheck?.envs?.[0] as HealthcheckEnvironment | undefined,
    [healthcheck?.envs]
  );

  if (!healthcheck?.name || !healthcheck?.tag) {
    return (
      <div className="flex h-full items-center justify-center bg-grey-50/30">
        <div className="max-w-sm text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-grey-400" />
          <p className="text-sm font-medium text-grey">Healthcheck data is unavailable</p>
          <p className="mt-1 text-sm text-grey-500">
            Close this tab and reopen the healthcheck to reload it.
          </p>
        </div>
      </div>
    );
  }

  const healthy = environment?.status === 'healthy';
  const latency = parseLatency(environment?.lastLatency || '0ms');

  return (
    <div className="h-full overflow-auto bg-grey-50/30">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border',
                healthy ? 'border-green/20 bg-green/10' : 'border-red/20 bg-red/10'
              )}
            >
              <Heart className={cn('h-6 w-6', healthy ? 'text-green' : 'text-red')} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-grey">{healthcheck.name}</h1>
              <code className="font-mono text-sm text-grey-500">{healthcheck.tag}</code>
              {healthcheck.description && (
                <p className="mt-2 text-sm text-grey-600">{healthcheck.description}</p>
              )}
            </div>
          </div>

          {environment &&
            (healthy ? (
              <Badge className="flex-shrink-0 border-green/20 bg-green/10 text-green">
                <CheckCircle className="mr-1 h-3 w-3" />
                Healthy
              </Badge>
            ) : (
              <Badge className="flex-shrink-0 border-red/20 bg-red/10 text-red">
                <XCircle className="mr-1 h-3 w-3" />
                Unhealthy
              </Badge>
            ))}
        </div>

        {environment ? (
          <>
            <div className="rounded-xl border border-grey-300 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-grey-500">
                {environment.slug} environment
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase text-grey-500">Last latency</p>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      latency < 100 ? 'text-green' : latency < 500 ? 'text-orange-500' : 'text-red'
                    )}
                  >
                    {environment.lastLatency || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-grey-500">Average</p>
                  <p className="text-lg font-semibold tabular-nums text-grey">
                    {environment.averageLatency || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-grey-500">Interval</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-grey">
                    <Clock className="h-3.5 w-3.5" />
                    {healthcheck.checkIntervals}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-grey-500">Retries</p>
                  <p className="text-sm font-medium text-grey">{healthcheck.retries}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-grey-500">Last checked</p>
                  <p className="text-sm text-grey">{formatAgo(environment.lastChecked)}</p>
                </div>
                {!healthy && environment.lastAvailable && (
                  <div className="col-span-2 flex items-start gap-2 rounded-lg border border-orange-100 bg-orange-50 p-2 text-sm text-orange-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>Last available {formatAgo(environment.lastAvailable)}</span>
                  </div>
                )}
              </div>
            </div>

            <ResponseSection
              title="Response"
              value={environment.response}
              empty="No response was recorded for the latest check."
            />

            <ResponseSection
              title="Probe input"
              value={environment.payload}
              empty="This check does not have a recorded probe payload."
            />
          </>
        ) : (
          <div className="rounded-xl border border-grey-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-grey">No environments configured</p>
            <p className="mt-1 text-sm text-grey-500">
              Add an environment to this healthcheck to start tracking status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

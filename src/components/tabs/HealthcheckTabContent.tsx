import { useState } from 'react';
import { Heart, Activity, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IHealthCheck, CheckEnvStatus } from '@/types/healthcheck';
import { formatDistanceToNow } from 'date-fns';

interface HealthcheckTabContentProps {
  data?: any;
}

function JsonHighlighter({ data }: { data: any }) {
  try {
    return (
      <pre className="text-xs whitespace-pre-wrap break-words font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  } catch {
    return <span className="text-grey-600">{String(data)}</span>;
  }
}

function formatAgo(timestamp?: string | Date): string {
  if (!timestamp) return 'never';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'never';
  }
}

function DetailRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-grey-300">
      <span className="text-sm text-grey-600">{label}</span>
      <span className="text-sm font-medium text-grey">{value}</span>
    </div>
  );
}

export default function HealthcheckTabContent({ data }: HealthcheckTabContentProps) {
  const healthcheck: IHealthCheck = data;
  const [selectedEnv, setSelectedEnv] = useState<string>(healthcheck?.envs?.[0]?.slug || '');

  // Show error if healthcheck data is incomplete and can't be fetched
  if (!healthcheck?.name && !healthcheck?.tag) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Heart className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete health check data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the health check from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  if (!healthcheck) {
    return (
      <div className="bg-grey-100 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm text-center">
            <Heart className="h-12 w-12 text-grey-400 mx-auto mb-3" />
            <p className="text-sm text-grey-600">No health check data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-red" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey">{healthcheck.name}</h1>
              <p className="text-sm text-grey-600">{healthcheck.tag}</p>
              {healthcheck.description && (
                <p className="text-sm text-grey-600 mt-2">{healthcheck.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                Interval: {healthcheck.checkIntervals}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-grey-200 text-grey-800">
                Retries: {healthcheck.retries}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthcheck.envs?.map((env: CheckEnvStatus) => {
            const isHealthy = env.status === 'healthy';
            return (
              <div
                key={env.slug}
                onClick={() => setSelectedEnv(env.slug)}
                className={cn(
                  "bg-white rounded-lg border p-4 shadow-sm transition-colors hover:border-primary cursor-pointer",
                  selectedEnv === env.slug ? 'border-primary bg-primary/5' : 'border-grey-400'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-grey uppercase">{env.slug}</span>
                  {isHealthy ? (
                    <CheckCircle className="h-5 w-5 text-green" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-grey-600">
                    Last: {formatAgo(env.lastChecked)}
                  </p>
                  <p className="text-xs text-grey-600">
                    Latency: {env.lastLatency}
                  </p>
                  <p className="text-xs text-grey-600">
                    Avg: {env.averageLatency}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Environment Information */}
        {selectedEnv && healthcheck.envs && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Environment Details: {selectedEnv}
            </h2>

            {(() => {
              const env = healthcheck.envs.find((e) => e.slug === selectedEnv);
              if (!env) return null;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <DetailRow
                        label="Status"
                        value={
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            env.status === 'healthy'
                              ? 'bg-green/10 text-green'
                              : 'bg-red/10 text-red'
                          )}>
                            {env.status}
                          </span>
                        }
                      />
                      <DetailRow
                        label="Last Latency"
                        value={env.lastLatency}
                      />
                      <DetailRow
                        label="Average Latency"
                        value={env.averageLatency}
                      />
                    </div>
                    <div className="space-y-2">
                      <DetailRow
                        label="Last Available"
                        value={env.lastAvailable ? formatAgo(env.lastAvailable) : 'never'}
                      />
                      <DetailRow
                        label="Last Checked"
                        value={env.lastChecked ? formatAgo(env.lastChecked) : 'never'}
                      />
                    </div>
                  </div>

                  <div className="border-t border-grey-400 pt-4">
                    <h3 className="text-sm font-semibold text-grey mb-2">Payload:</h3>
                    <div className="bg-grey-100 rounded p-3 overflow-x-auto">
                      <JsonHighlighter data={env.payload} />
                    </div>
                  </div>

                  <div className="border-t border-grey-400 pt-4">
                    <h3 className="text-sm font-semibold text-grey mb-2">Last Response:</h3>
                    <div className="bg-grey-100 rounded p-3 overflow-x-auto">
                      <JsonHighlighter data={env.payload} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}


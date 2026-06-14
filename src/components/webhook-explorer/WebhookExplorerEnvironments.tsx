import { Globe, Copy, Check, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { WebhookEnvMetrics } from './WebhookExplorerMetrics';
import { getEnvAccent } from './utils';

interface WebhookExplorerEnvironmentsProps {
  webhookTag: string;
  appTag: string;
  productTag?: string;
  appEnvironments: Array<{
    slug: string;
    description?: string;
    base_url?: string;
    registration_url?: string;
    webhook_url?: string;
  }>;
  webhookConfig?: Array<{ appEnv?: string; productEnv?: string; url?: string; method?: string }>;
  copiedText: string | null;
  onCopy: (text: string, label: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function WebhookExplorerEnvironments({
  webhookTag,
  appTag,
  productTag,
  appEnvironments,
  webhookConfig,
  copiedText,
  onCopy,
  isRefreshing,
  onRefresh,
}: WebhookExplorerEnvironmentsProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-grey">Environments</h2>
            <p className="text-sm text-grey-500 mt-0.5">
              {appEnvironments.length} endpoint{appEnvironments.length === 1 ? '' : 's'} for incoming webhooks
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {appEnvironments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-grey-300 bg-white py-16 text-center">
            <Globe className="h-10 w-10 text-grey-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-grey">No environments configured</p>
            <p className="text-xs text-grey-500 mt-1 max-w-xs mx-auto">
              Add environments in the app version to expose webhook endpoints per stage.
            </p>
          </div>
        ) : (
          appEnvironments.map((env, index) => {
            const envConfig = webhookConfig?.find(
              (c) => c.appEnv === env.slug || c.productEnv === env.slug
            );
            const isRegistered = !!envConfig;
            const accent = getEnvAccent(env.slug);
            const webhookUrl =
              envConfig?.url ||
              env.registration_url ||
              env.webhook_url ||
              `https://api.ductape.app/webhooks/${appTag}/${webhookTag}/${env.slug}`;

            return (
              <div key={index} className="rounded-xl border border-grey-300 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', accent.bg)}>
                      <Globe className={cn('h-5 w-5', accent.text)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-grey">{env.slug}</h3>
                        {productTag && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1',
                              isRegistered ? 'bg-green/10 text-green' : 'bg-grey-100 text-grey-500'
                            )}
                          >
                            {isRegistered ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Registered
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                Not registered
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      {env.description && <p className="text-xs text-grey-500 mt-0.5">{env.description}</p>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8 text-xs flex-shrink-0"
                    onClick={() => onCopy(webhookUrl, 'URL')}
                  >
                    {copiedText === webhookUrl ? <Check className="h-3 w-3 text-green" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>

                <Label className="text-[10px] uppercase tracking-wide text-grey-500">Endpoint</Label>
                <div className="flex items-center gap-2 mt-1 mb-4 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green/10 text-green">POST</span>
                  <code className="flex-1 text-xs font-mono text-grey-700 break-all">{webhookUrl}</code>
                </div>

                {productTag && isRegistered && envConfig && (
                  <div className="mb-4 p-3 rounded-lg bg-green/5 border border-green/15 text-xs">
                    <p className="text-grey-600">
                      Callback: <span className="font-mono text-grey">{envConfig.url || '—'}</span>
                    </p>
                  </div>
                )}

                {productTag && !isRegistered && (
                  <p className="text-xs text-grey-500 mb-4">
                    Register via the SDK to receive events in this environment.
                  </p>
                )}

                <WebhookEnvMetrics webhookTag={webhookTag} appTag={appTag} env={env.slug} productTag={productTag} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

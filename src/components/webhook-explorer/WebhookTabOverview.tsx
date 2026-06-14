import { Zap, Filter, BarChart3, Globe, ChevronRight, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IWebhook, IWebhookEvent } from '@/types/webhook';
import { WebhookEnvMetrics } from './WebhookExplorerMetrics';
import { ReactNode } from 'react';

interface WebhookTabOverviewProps {
  webhook: IWebhook;
  appTag?: string;
  productTag?: string;
  events: IWebhookEvent[];
  selectorStats: { singleSelector: number; multiSelector: number };
  copiedText: string | null;
  onCopy: (text: string, label: string) => void;
  onViewAllEvents: () => void;
  onViewEnvironments?: () => void;
  onSelectEvent: (id: string) => void;
  registrationPanel?: ReactNode;
}

export function WebhookTabOverview({
  webhook,
  appTag,
  productTag,
  events,
  selectorStats,
  copiedText,
  onCopy,
  onViewAllEvents,
  onViewEnvironments,
  onSelectEvent,
  registrationPanel,
}: WebhookTabOverviewProps) {
  const statCards = [
    { label: 'Events', value: events.length, icon: Zap, iconClass: 'text-purple-600 bg-purple-500/10' },
    {
      label: 'Single selector',
      value: selectorStats.singleSelector,
      icon: Filter,
      iconClass: 'text-blue bg-blue/10',
    },
    {
      label: 'Multi selector',
      value: selectorStats.multiSelector,
      icon: BarChart3,
      iconClass: 'text-purple-600 bg-purple-500/10',
    },
    {
      label: 'Environments',
      value: webhook.envs?.length || 0,
      icon: Globe,
      iconClass: 'text-green bg-green/10',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {registrationPanel}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', card.iconClass)}>
                <card.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-grey tabular-nums">{card.value}</p>
              <p className="text-xs text-grey-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {webhook.description && (
          <p className="text-sm text-grey-600 -mt-2">{webhook.description}</p>
        )}

        {webhook.envs && webhook.envs.length > 0 && appTag && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-grey">Environment endpoints</h3>
            {webhook.envs.slice(0, 3).map((env, index) => {
              const webhookUrl =
                env.registration_url ||
                `https://api.ductape.app/webhooks/${appTag}/${webhook.tag}/${env.slug}`;
              return (
                <div key={env._id || index} className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm text-grey">{env.slug}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green font-medium">
                        {env.method || 'POST'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onCopy(webhookUrl, 'URL')}
                    >
                      {copiedText === webhookUrl ? (
                        <Check className="h-3 w-3 text-green" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <code className="block text-[11px] font-mono text-grey-600 break-all bg-grey-50 border border-grey-200 rounded-md px-2.5 py-2 mb-3">
                    {webhookUrl}
                  </code>
                  <WebhookEnvMetrics webhookTag={webhook.tag} appTag={appTag} env={env.slug} productTag={productTag} />
                </div>
              );
            })}
            {webhook.envs.length > 3 && onViewEnvironments && (
              <button
                type="button"
                onClick={onViewEnvironments}
                className="text-xs text-primary font-medium hover:underline"
              >
                +{webhook.envs.length - 3} more environments (see Environments tab)
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-grey-300 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-grey-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-grey">Events</h3>
              <button
                type="button"
                onClick={onViewAllEvents}
                className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
              >
                View all
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {events.length === 0 ? (
              <p className="px-4 py-6 text-xs text-grey-500 text-center">No events configured</p>
            ) : (
              <ul className="divide-y divide-grey-100 max-h-64 overflow-y-auto">
                {events.slice(0, 8).map((event) => (
                  <li key={event._id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event._id)}
                      className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-grey-50 text-left"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-grey truncate">{event.name}</p>
                        <p className="text-[10px] font-mono text-grey-500">{event.tag}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-blue/20 bg-blue/5 p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-grey mb-1">About webhook channels</h3>
              <p className="text-xs text-grey-600 leading-relaxed">
                One registration point for multiple events. Partners register once and receive payloads for all
                configured events, routed by{' '}
                <code className="bg-white/80 px-1 rounded font-mono text-[10px]">webhook:event</code> tags and
                selectors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

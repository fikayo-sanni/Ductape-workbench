import {
  Send,
  CheckCircle,
  Zap,
  Globe,
  TrendingUp,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import { IWebhookEvent } from '@/types/webhook';
import { WebhookEnvMetrics } from './WebhookExplorerMetrics';
import { parseEventSelectors } from './utils';

interface WebhookExplorerOverviewProps {
  webhookTag: string;
  appTag: string;
  productTag?: string;
  events: IWebhookEvent[];
  appEnvironments: Array<{ slug: string; method?: string; description?: string }>;
  globalMetrics?: {
    totalRequests: number;
    successRate: number;
  };
  isLoadingMetrics: boolean;
  selectorStats: { singleSelector: number; multiSelector: number };
  copiedText: string | null;
  onCopy: (text: string, label: string) => void;
  onViewAllEvents: () => void;
  onSelectEvent: (id: string) => void;
}

export function WebhookExplorerOverview({
  webhookTag,
  appTag,
  productTag,
  events,
  appEnvironments,
  globalMetrics,
  isLoadingMetrics,
  selectorStats,
  copiedText,
  onCopy,
  onViewAllEvents,
  onSelectEvent,
}: WebhookExplorerOverviewProps) {
  const statCards = [
    {
      label: 'Requests (7d)',
      value: isLoadingMetrics ? '…' : globalMetrics?.totalRequests ?? 0,
      icon: Send,
      iconClass: 'text-blue bg-blue/10',
      hint: globalMetrics && globalMetrics.totalRequests > 0 ? 'Active' : null,
    },
    {
      label: 'Success rate',
      value: isLoadingMetrics ? '…' : `${globalMetrics?.successRate ?? 0}%`,
      icon: CheckCircle,
      iconClass: cn(
        'bg-green/10',
        (globalMetrics?.successRate ?? 0) >= 90
          ? 'text-green'
          : (globalMetrics?.successRate ?? 0) >= 70
            ? 'text-orange-500'
            : 'text-red'
      ),
      valueClass: cn(
        (globalMetrics?.successRate ?? 0) >= 90
          ? 'text-green'
          : (globalMetrics?.successRate ?? 0) >= 70
            ? 'text-orange-500'
            : 'text-red'
      ),
    },
    {
      label: 'Events',
      value: events.length,
      icon: Zap,
      iconClass: 'text-amber-600 bg-amber-500/10',
    },
    {
      label: 'Environments',
      value: appEnvironments.length,
      icon: Globe,
      iconClass: 'text-purple-600 bg-purple-500/10',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.iconClass)}>
                  <card.icon className="h-4 w-4" />
                </div>
                {card.hint && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green">
                    <TrendingUp className="h-3 w-3" />
                    {card.hint}
                  </span>
                )}
              </div>
              <p className={cn('text-2xl font-bold tabular-nums', card.valueClass ?? 'text-grey')}>
                {card.value}
              </p>
              <p className="text-xs text-grey-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        <ActivityTimelinePanel
          title="Activity"
          kind="webhook"
          productTag={productTag}
          componentTag={webhookTag}
          countLabel="requests"
          enabled={!!webhookTag}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-grey">Environment endpoints</h3>
            {appEnvironments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-grey-300 bg-white p-8 text-center text-sm text-grey-500">
                No environments configured for this app version.
              </div>
            ) : (
              appEnvironments.map((env, index) => {
                const webhookUrl = `https://api.ductape.app/webhooks/${appTag}/${webhookTag}/${env.slug}`;
                return (
                  <div key={index} className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-grey">{env.slug}</span>
                        <span className="px-1.5 py-0.5 bg-green/10 text-green rounded text-[10px] font-medium">
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
                    <WebhookEnvMetrics webhookTag={webhookTag} appTag={appTag} env={env.slug} productTag={productTag} />
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-grey-300 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-grey mb-3">Selector mix</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-grey-50">
                  <span className="text-xs text-grey-600">Single selector</span>
                  <span className="font-bold text-grey">{selectorStats.singleSelector}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-grey-50">
                  <span className="text-xs text-grey-600">Multi selector</span>
                  <span className="font-bold text-grey">{selectorStats.multiSelector}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-grey-300 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-grey-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-grey">Recent events</h3>
                <button
                  type="button"
                  onClick={onViewAllEvents}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
                >
                  All
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {events.length === 0 ? (
                <p className="px-4 py-6 text-xs text-grey-500 text-center">No events defined</p>
              ) : (
                <ul className="divide-y divide-grey-100">
                  {events.slice(0, 6).map((event) => {
                    const selectors = parseEventSelectors((event as { selector?: string }).selector || '');
                    return (
                      <li key={event._id}>
                        <button
                          type="button"
                          onClick={() => onSelectEvent(event._id)}
                          className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-grey-50 text-left transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-grey truncate">{event.name}</p>
                            <p className="text-[10px] font-mono text-grey-500 truncate">{event.tag}</p>
                          </div>
                          {selectors.length > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue/10 text-blue">
                              {selectors.length}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

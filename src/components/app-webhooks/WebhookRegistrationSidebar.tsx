import { X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WebhookRegistrationPanel from '@/components/webhooks/WebhookRegistrationPanel';
import { IWebhook } from '@/types/webhook';

interface WebhookRegistrationSidebarProps {
  webhook: IWebhook;
  productTag: string;
  accessTag: string;
  productEnvs?: Array<{ slug: string; env_name?: string }>;
  onClose: () => void;
}

export function WebhookRegistrationSidebar({
  webhook,
  productTag,
  accessTag,
  productEnvs = [],
  onClose,
}: WebhookRegistrationSidebarProps) {
  return (
    <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-grey-300 z-50 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-grey-300 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-grey truncate">Register webhook</h2>
              <p className="text-sm text-grey-500 truncate">{webhook.name || webhook.tag}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0"
            onClick={onClose}
            aria-label="Close registration"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <WebhookRegistrationPanel
          webhookTag={webhook.tag}
          webhookName={webhook.name || webhook.tag}
          productTag={productTag}
          accessTag={accessTag}
          productEnvs={productEnvs}
          appEnvSlugs={webhook.envs?.map((e) => e.slug) ?? []}
        />
      </div>
    </div>
  );
}

/**
 * Bulk import schema for webhook collections and events.
 *
 * Import via SDK: ductape.webhooks.importBulk(appTag, payload)
 * or use the Import button on the Webhooks page (internal apps only).
 */
export const WEBHOOKS_IMPORT_SCHEMA_VERSION = '1.0';

export const WEBHOOKS_IMPORT_EXAMPLE = {
  version: WEBHOOKS_IMPORT_SCHEMA_VERSION,
  webhooks: [
    {
      name: 'Payment Notifications',
      tag: 'payment_notifications',
      description: 'Webhook collection for payment lifecycle events',
      envs: [{ slug: 'production' }, { slug: 'sandbox' }],
      events: [
        {
          name: 'Payment Completed',
          tag: 'payment_completed',
          description: 'Fired when a payment succeeds',
          sample: {
            event: 'payment.completed',
            data: { id: 'pay_123', amount: 1000, currency: 'USD' },
          },
          selector: 'event',
        },
        {
          name: 'Payment Failed',
          tag: 'payment_failed',
          description: 'Fired when a payment fails',
          sample: {
            type: 'payment',
            status: 'failed',
            data: { id: 'pay_456', reason: 'insufficient_funds' },
          },
          selector: 'type,status',
        },
      ],
    },
  ],
};

export interface WebhookImportEvent {
  name: string;
  tag: string;
  description: string;
  sample: Record<string, unknown>;
  /** Dot-path field(s) in the sample that identify the event type. Comma-separated for multi-selector events. */
  selector: string;
}

export interface WebhookImportCollection {
  name: string;
  tag: string;
  description: string;
  envs: Array<{ slug: string; registration_url?: string; method?: string; sample?: Record<string, unknown> }>;
  events?: WebhookImportEvent[];
}

export interface WebhooksImportPayload {
  version?: string;
  webhooks: WebhookImportCollection[];
}

export const WEBHOOKS_IMPORT_INSTRUCTIONS = `
Bulk import format (JSON)

Required top-level shape:
{
  "version": "1.0",
  "webhooks": [ ... ]
}

Each webhook collection:
- name (string) – display name
- tag (string) – unique identifier, snake_case
- description (string)
- envs (array) – at least one { "slug": "<app_env_slug>" }
  Optional per env for API-based registration with the 3rd party:
  - registration_url, method, sample (request template with {{url}} placeholder)

Each event (optional, can add later):
- name, tag, description
- sample (object) – example payload from the 3rd party
- selector (string) – dot-path field(s) in sample that identify the event type
  Use comma-separated paths for multi-field matching (e.g. "type,status")

Event tags are namespaced automatically as "<webhook_tag>:<event_tag>".

After import, integrators register their consumer URL on Ductape and receive a proxy URL
to configure on the 3rd party dashboard instead.
`.trim();

function formatSelectorPath(path: string): string {
  return `$Event{${path.split('.').join('}{')}}`;
}

/** Transform import JSON into SDK createWithEvents/importBulk payloads */
export function normalizeWebhooksImportPayload(raw: WebhooksImportPayload, webhookCollectionTag?: string) {
  if (!raw?.webhooks?.length) {
    throw new Error('Import file must contain a non-empty "webhooks" array');
  }

  const webhooks = raw.webhooks.map((wh) => {
    if (!wh.name?.trim() || !wh.tag?.trim() || !wh.description?.trim()) {
      throw new Error('Each webhook requires name, tag, and description');
    }
    if (!wh.envs?.length) {
      throw new Error(`Webhook "${wh.tag}" requires at least one environment in envs`);
    }

    const events = (wh.events ?? []).map((event) => {
      if (!event.name?.trim() || !event.tag?.trim() || !event.selector?.trim()) {
        throw new Error(`Event in "${wh.tag}" requires name, tag, and selector`);
      }

      const selectorPaths = event.selector.split(',').map((s) => s.trim()).filter(Boolean);
      const formattedSelectors = selectorPaths.map(formatSelectorPath);

      return {
        name: event.name,
        tag: `${wh.tag}:${event.tag}`,
        description: event.description || event.name,
        selector: formattedSelectors.join(','),
        sample: event.sample ?? {},
      };
    });

    return {
      name: wh.name,
      tag: wh.tag,
      description: wh.description,
      envs: wh.envs.map((e) => ({ slug: e.slug })),
      events,
    };
  });

  if (webhookCollectionTag) {
    const match = webhooks.find((w) => w.tag === webhookCollectionTag);
    if (!match) {
      throw new Error(`Webhook "${webhookCollectionTag}" not found in import file`);
    }
    return { webhooks: [match] };
  }

  return { webhooks };
}

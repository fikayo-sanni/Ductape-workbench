import { IWebhookEvent } from '@/types/webhook';

export function getEventSampleText(event: IWebhookEvent): string {
  if (event.sample == null || event.sample === '') return '{}';
  if (typeof event.sample === 'string') {
    try {
      return JSON.stringify(JSON.parse(event.sample), null, 2);
    } catch {
      return event.sample;
    }
  }
  return JSON.stringify(event.sample, null, 2);
}

export function getFullEventTag(webhookTag: string, event: IWebhookEvent): string {
  const eventTag = event.tag || '';
  if (eventTag.includes(':')) return eventTag;
  return `${webhookTag}:${eventTag}`;
}

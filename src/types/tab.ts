export type TabType =
  | 'request'
  | 'app'
  | 'product'
  | 'storage'
  | 'session'
  | 'session-activity'
  | 'session-dashboard'
  | 'feature'
  | 'cache'
  | 'cache-values'
  | 'healthcheck'
  | 'database'
  | 'message-broker'
  | 'message-broker-events'
  | 'notification'
  | 'message'
  | 'new-message'
  | 'new-topic'
  | 'fallback'
  | 'quota'
  | 'job'
  | 'webhook'
  | 'auth'
  | 'logs'
  | 'dashboard'
  | 'tokens'
  | 'teams'
  | 'partnership'
  | 'brief'
  | 'marketplace'
  | 'notifier'
  | 'pricing'
  | 'settings';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  itemId?: string; // ID of the actual item (e.g., product_id, app_id)
  data?: any; // Additional data specific to the tab type
  isDirty?: boolean; // Has unsaved changes
}

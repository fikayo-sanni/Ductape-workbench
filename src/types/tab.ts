export type TabType =
  | 'request'
  | 'app'
  | 'product'
  | 'storage'
  | 'session'
  | 'feature'
  | 'cache'
  | 'healthcheck'
  | 'database'
  | 'message-broker'
  | 'notification'
  | 'message'
  | 'new-message'
  | 'fallback'
  | 'quota'
  | 'job'
  | 'webhook'
  | 'auth'
  | 'logs'
  | 'dashboard'
  | 'tokens'
  | 'teams'
  | 'marketplace'
  | 'notifier';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  itemId?: string; // ID of the actual item (e.g., product_id, app_id)
  data?: any; // Additional data specific to the tab type
  isDirty?: boolean; // Has unsaved changes
}

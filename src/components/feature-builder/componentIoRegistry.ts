import type { ResilienceComponentCategory } from './types';

export interface ComponentIoSpec {
  category: ResilienceComponentCategory;
  label: string;
  eventField: 'event' | 'tag';
  resourceKey?: 'app' | 'database' | 'storage' | 'notification' | 'graph' | 'vector' | 'broker';
  defaultEvent?: string;
  inputHints: string[];
  outputHints: string[];
}

export const COMPONENT_IO_REGISTRY: Record<ResilienceComponentCategory, ComponentIoSpec> = {
  action: {
    category: 'action',
    label: 'App action',
    eventField: 'event',
    resourceKey: 'app',
    inputHints: ['$Input{field}', '$Step{tag}{field}'],
    outputHints: ['Map response fields to uniform output schema'],
  },
  database: {
    category: 'database',
    label: 'Database action',
    eventField: 'event',
    resourceKey: 'database',
    defaultEvent: 'read',
    inputHints: ['$Input{field}', '$Step{tag}{data}'],
    outputHints: ['records', 'count', 'id'],
  },
  notification: {
    category: 'notification',
    label: 'Notification',
    eventField: 'tag',
    resourceKey: 'notification',
    defaultEvent: 'dispatch',
    inputHints: ['$Input{recipient}', '$Step{tag}{email}'],
    outputHints: ['messageId', 'status'],
  },
  storage: {
    category: 'storage',
    label: 'Storage',
    eventField: 'event',
    resourceKey: 'storage',
    defaultEvent: 'upload',
    inputHints: ['$Input{path}', '$Step{tag}{buffer}'],
    outputHints: ['url', 'key'],
  },
  graph: {
    category: 'graph',
    label: 'Graph',
    eventField: 'event',
    resourceKey: 'graph',
    defaultEvent: 'query',
    inputHints: ['$Input{query}', '$Step{tag}{nodes}'],
    outputHints: ['nodes', 'relationships'],
  },
  vector: {
    category: 'vector',
    label: 'Vector DB',
    eventField: 'event',
    resourceKey: 'vector',
    defaultEvent: 'search',
    inputHints: ['$Input{query}', '$Step{tag}{embedding}'],
    outputHints: ['matches', 'scores'],
  },
  produce: {
    category: 'produce',
    label: 'Publish event',
    eventField: 'event',
    resourceKey: 'broker',
    inputHints: ['$Input{payload}', '$Step{tag}{message}'],
    outputHints: ['messageId'],
  },
};

export const RESILIENCE_CATEGORIES: ResilienceComponentCategory[] = [
  'action',
  'database',
  'notification',
  'storage',
  'graph',
  'vector',
  'produce',
];

export type WebhookExplorerViewMode = 'overview' | 'environments' | 'events';

export function formatSelector(sel: string) {
  const matches = sel.match(/\{([^}]+)\}/g);
  if (!matches) return sel;
  return matches.map((m) => m.slice(1, -1)).join('.');
}

export function parseEventSelectors(selectorStr: string) {
  return selectorStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getEnvAccent(slug: string) {
  if (slug === 'production' || slug === 'prd') {
    return { bg: 'bg-red/10', text: 'text-red' };
  }
  if (slug === 'staging' || slug === 'stg') {
    return { bg: 'bg-orange-500/10', text: 'text-orange-500' };
  }
  return { bg: 'bg-blue/10', text: 'text-blue' };
}

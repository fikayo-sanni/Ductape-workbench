/**
 * What the product overview page says about a product, worked out from data the platform already has:
 * health checks, recent operations, deployments and how much of the product has been set up.
 * Pure functions, so the rules can be tested without rendering anything.
 */

import { healthView, type EnvState } from './healthcheckStrategy';

export interface HealthProblem {
  check: string;
  name: string;
  env: string;
  label: string;
  note?: string;
}

export interface HealthSummary {
  /** Environments watched across all checks. */
  total: number;
  healthy: number;
  down: number;
  recovering: number;
  /** Anything not simply healthy, worst first. */
  problems: HealthProblem[];
}

interface CheckLike {
  tag?: string;
  name?: string;
  deleted?: boolean;
  envs?: Array<EnvState & { slug?: string }>;
}

/** Counts every (check, environment) pair. A pair that has never been checked counts as healthy: health is assumed. */
export function summarizeHealth(healthchecks: CheckLike[] | undefined): HealthSummary {
  const summary: HealthSummary = { total: 0, healthy: 0, down: 0, recovering: 0, problems: [] };
  for (const check of healthchecks ?? []) {
    if (!check || check.deleted === true) continue;
    for (const env of check.envs ?? []) {
      const view = healthView(env);
      summary.total += 1;
      if (view.tone === 'good') summary.healthy += 1;
      else {
        if (view.tone === 'bad') summary.down += 1;
        else summary.recovering += 1;
        summary.problems.push({
          check: String(check.tag ?? ''),
          name: String(check.name || check.tag || 'Health check'),
          env: String(env.slug ?? ''),
          label: view.label,
          note: view.note,
        });
      }
    }
  }
  summary.problems.sort((a, b) => Number(b.label === 'Down' || b.label === 'Unhealthy') - Number(a.label === 'Down' || a.label === 'Unhealthy'));
  return summary;
}

export type Severity = 'bad' | 'warn' | 'info';

export interface AttentionItem {
  id: string;
  severity: Severity;
  title: string;
  detail?: string;
  /** Which part of the product page to open. */
  target: 'observability' | 'deployments' | 'resilience' | 'environments';
}

export interface AttentionInput {
  health: HealthSummary;
  /** Operations in the chosen period. Undefined while loading or when unavailable. */
  activity?: { total: number; failures: number; errorRatePercent: number; topFailing?: { operation: string; failures: number } };
  /** Undefined when the server cannot say. */
  deployments?: { total: number; attention: number; inFlight: number };
  environments: Array<{ active?: boolean; deleted?: boolean }>;
  periodLabel: string;
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString()} ${count === 1 ? one : many}`;
const rank: Record<Severity, number> = { bad: 0, warn: 1, info: 2 };

/** Things worth looking at now, worst first. Empty means all clear. */
export function attentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const problem of input.health.problems) {
    const down = problem.label === 'Down' || problem.label === 'Unhealthy';
    items.push({
      id: `health:${problem.check}:${problem.env}`,
      severity: down ? 'bad' : 'warn',
      title: `${problem.name} is ${problem.label.toLowerCase()}${problem.env ? ` in ${problem.env}` : ''}`,
      detail: problem.note,
      target: 'resilience',
    });
  }

  const activity = input.activity;
  if (activity && activity.failures > 0) {
    const rate = activity.errorRatePercent >= 10 ? Math.round(activity.errorRatePercent) : Number(activity.errorRatePercent.toFixed(1));
    items.push({
      id: 'activity:failures',
      severity: activity.errorRatePercent >= 10 ? 'bad' : 'warn',
      title: `${plural(activity.failures, 'operation', 'operations')} failed (${rate}%)`,
      detail: [`In the last ${input.periodLabel}.`, activity.topFailing ? `Most in ${activity.topFailing.operation}.` : ''].filter(Boolean).join(' '),
      target: 'observability',
    });
  }

  const deployments = input.deployments;
  if (deployments && deployments.attention > 0) {
    items.push({
      id: 'deployments:attention',
      severity: 'bad',
      title: `${plural(deployments.attention, 'deployment needs', 'deployments need')} attention`,
      target: 'deployments',
    });
  } else if (deployments && deployments.inFlight > 0) {
    items.push({
      id: 'deployments:inflight',
      severity: 'info',
      title: `${plural(deployments.inFlight, 'deployment is', 'deployments are')} in progress`,
      target: 'deployments',
    });
  }

  const live = input.environments.filter(env => env?.deleted !== true);
  if (live.length > 0 && live.every(env => env.active === false)) {
    items.push({
      id: 'environments:inactive',
      severity: 'warn',
      title: 'Every environment is inactive',
      detail: 'Nothing can run until one is switched on.',
      target: 'environments',
    });
  }

  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export interface SetupCounts {
  environments: number;
  apps: number;
  databases: number;
  features: number;
  functions: number;
  healthchecks: number;
  fallbacks: number;
  quotas: number;
}

export interface SetupStep {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  /** Category to open when the step is not done. */
  target: string;
}

/** A short checklist for a product that is still being set up. */
export function setupSteps(counts: SetupCounts): SetupStep[] {
  return [
    {
      id: 'environments',
      label: 'Set up an environment',
      hint: 'Environments hold the settings for dev, staging and production.',
      done: counts.environments > 0,
      target: 'environments',
    },
    {
      id: 'connect',
      label: 'Connect an app or add a database',
      hint: 'Give the product something to talk to.',
      done: counts.apps + counts.databases > 0,
      target: counts.apps === 0 ? 'apps' : 'databases',
    },
    {
      id: 'build',
      label: 'Build a feature or publish a function',
      hint: 'Features chain steps together; functions are your own code.',
      done: counts.features + counts.functions > 0,
      target: 'features',
    },
    {
      id: 'protect',
      label: 'Add a health check or a fallback',
      hint: 'So a failing provider does not take the product down with it.',
      done: counts.healthchecks + counts.fallbacks + counts.quotas > 0,
      target: 'resilience',
    },
  ];
}

export interface ResourceGroup {
  id: 'build' | 'logic' | 'reliability';
  title: string;
  description: string;
  categories: string[];
}

/** How resource categories are grouped on the overview. Every category appears exactly once. */
export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    id: 'build',
    title: 'Connect and store',
    description: 'What the product talks to and keeps data in.',
    categories: ['apps', 'databases', 'storage', 'caches', 'messageBrokers', 'notifications', 'sessions'],
  },
  {
    id: 'logic',
    title: 'Logic',
    description: 'What the product does.',
    categories: ['features', 'functions', 'jobs', 'intelligence'],
  },
  {
    id: 'reliability',
    title: 'Reliability',
    description: 'How the product stays up.',
    categories: ['resilience', 'rateLimits'],
  },
];

/** Splits categories into the groups above, keeping each group's own order and dropping unknown ones. */
export function groupCategories<T extends { id: string }>(categories: T[]): Array<ResourceGroup & { items: T[] }> {
  return RESOURCE_GROUPS.map(group => ({
    ...group,
    items: group.categories.map(id => categories.find(category => category.id === id)).filter((item): item is T => Boolean(item)),
  })).filter(group => group.items.length > 0);
}

/** "Succeeded 98.4%" style figure; null when there was no activity to measure. */
export function successRate(total: number, failures: number): number | null {
  if (!total) return null;
  return Math.max(0, Math.min(100, ((total - failures) / total) * 100));
}

export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  if (value === 100) return '100%';
  return `${value >= 99.95 ? 99.9 : Number(value.toFixed(value >= 10 ? 1 : 2))}%`;
}

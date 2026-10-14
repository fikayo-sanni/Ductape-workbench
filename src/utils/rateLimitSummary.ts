/**
 * Helpers for the Rate Limits section: read one logged rate-limit decision and
 * roll a batch of decisions up into one summary per policy.
 */

export interface DecisionRow {
  parent_tag?: string;
  env?: string;
  timestamp?: string | number | Date;
  status?: string;
  action?: string;
  latency?: number;
  data?: unknown;
}

export interface DecisionDetails {
  outcome: string;
  remaining?: number;
  limit?: number;
  window?: string;
  latency?: number;
}

export interface PolicySummary {
  tag: string;
  total: number;
  allowed: number;
  rejected: number;
  /** Bypassed, unavailable and drift decisions: the limiter could not give a normal answer. */
  other: number;
  limit?: number;
  /** Window the policy had when the decision was recorded, for example "1m". */
  window?: string;
  lastAt?: number;
  envs: string[];
}

export interface DecisionSummary {
  total: number;
  allowed: number;
  rejected: number;
  other: number;
  policies: PolicySummary[];
}

const num = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return value !== null && value !== '' && Number.isFinite(parsed) ? parsed : undefined;
};

/** The payload is stored as JSON text on some rows and as an object on others. */
export function decisionDetails(row: DecisionRow): DecisionDetails {
  let data: any = row.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  data = data && typeof data === 'object' ? data : {};
  const fallback = row.action || (row.status === 'success' ? 'allowed' : 'rejected');
  return {
    outcome: String(data.outcome || fallback),
    remaining: num(data.remaining),
    limit: num(data.limit),
    window: typeof data.window === 'string' && data.window ? data.window : undefined,
    latency: num(row.latency) ?? num(data.latency),
  };
}

export function summarizeDecisions(rows: DecisionRow[]): DecisionSummary {
  const byPolicy = new Map<string, PolicySummary & { envSet: Set<string> }>();
  const summary = { total: 0, allowed: 0, rejected: 0, other: 0 };

  for (const row of rows) {
    const tag = row.parent_tag || 'unknown';
    const { outcome, limit, window } = decisionDetails(row);
    let policy = byPolicy.get(tag);
    if (!policy) {
      policy = { tag, total: 0, allowed: 0, rejected: 0, other: 0, envs: [], envSet: new Set() };
      byPolicy.set(tag, policy);
    }
    policy.total += 1;
    summary.total += 1;
    if (outcome === 'allowed') {
      policy.allowed += 1;
      summary.allowed += 1;
    } else if (outcome === 'rejected') {
      policy.rejected += 1;
      summary.rejected += 1;
    } else {
      policy.other += 1;
      summary.other += 1;
    }
    if (limit !== undefined && policy.limit === undefined) policy.limit = limit;
    if (window && policy.window === undefined) policy.window = window;
    if (row.env) policy.envSet.add(row.env);
    const at = row.timestamp ? new Date(row.timestamp).getTime() : NaN;
    if (Number.isFinite(at) && (policy.lastAt === undefined || at > policy.lastAt)) policy.lastAt = at;
  }

  const policies = [...byPolicy.values()]
    .map(({ envSet, ...policy }) => ({ ...policy, envs: [...envSet].sort() }))
    .sort((a, b) => b.rejected - a.rejected || b.total - a.total || a.tag.localeCompare(b.tag));

  return { ...summary, policies };
}

export interface StoredPolicy {
  _id?: string;
  tag: string;
  name?: string;
  description?: string;
  key?: string[];
  limit?: number;
  window?: string;
  strategy?: 'fixed' | 'sliding';
  failurePolicy?: 'fail_open' | 'fail_closed';
  envs?: Array<{ slug: string; limit?: number; window?: string; strategy?: string; failurePolicy?: string }>;
  supersedes?: string;
  deleted?: boolean;
}

export interface PolicyView {
  tag: string;
  /** Where the policy comes from: stored on the product, or only seen in decisions (defined in code). */
  source: 'workbench' | 'code';
  stored?: StoredPolicy;
  stats?: PolicySummary;
  /** The tag of a newer version that replaces this one, when there is one. */
  supersededBy?: string;
}

/**
 * One entry per policy: those stored on the product (deleted ones left out), then any that only show
 * up in recorded decisions because they are defined in code. Stored policies come first, alphabetically.
 */
export function mergePolicies(stored: StoredPolicy[], summaries: PolicySummary[]): PolicyView[] {
  const live = stored.filter(policy => policy.deleted !== true);
  const stats = new Map(summaries.map(item => [item.tag, item]));
  const replacedBy = new Map<string, string>();
  for (const policy of live) if (policy.supersedes) replacedBy.set(policy.supersedes, policy.tag);

  const configured: PolicyView[] = live
    .map(policy => ({ tag: policy.tag, source: 'workbench' as const, stored: policy, stats: stats.get(policy.tag), supersededBy: replacedBy.get(policy.tag) }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  const known = new Set(live.map(policy => policy.tag));
  // Decisions for a policy that was deleted from the product are still history, but not a live policy.
  const deleted = new Set(stored.filter(policy => policy.deleted === true).map(policy => policy.tag));
  const code: PolicyView[] = summaries
    .filter(item => !known.has(item.tag) && !deleted.has(item.tag))
    .map(item => ({ tag: item.tag, source: 'code' as const, stats: item }));
  return [...configured, ...code];
}

/** What each dashboard tab says about itself, so a problem is visible without opening it. Nothing here touches the network or the screen. */

export type TabTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ITabIndicator {
  tone: TabTone;
  /** How many things need a look, so the tab can carry a number. Zero when nothing does. */
  count: number;
  /** One short line under the tab's name. */
  label: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface DeploymentsInput {
  /** Failed and rolled-back deployments. */
  deploymentsFailing: number;
  failedBuilds: number;
  blockedPlans: number;
  plansAwaitingApproval: number;
  deployments: number;
  connections: number;
  /** Cloud connections that failed, are invalid or were revoked. */
  connectionsBroken: number;
  /** Cloud connections whose setup is not finished. */
  connectionsPending: number;
}

/** Deployments & Cloud: red for something failed or broken, amber for something waiting on a person, green when all is well, grey when there is nothing yet. */
export function deploymentsIndicator(input: DeploymentsInput): ITabIndicator {
  const bad = input.deploymentsFailing + input.failedBuilds + input.blockedPlans + input.connectionsBroken;
  if (bad > 0) return { tone: 'bad', count: bad, label: `${plural(bad, 'issue', 'issues')} to fix` };
  const warn = input.plansAwaitingApproval + input.connectionsPending;
  if (warn > 0) return { tone: 'warn', count: warn, label: `${warn} waiting on you` };
  if (input.deployments > 0 || input.connections > 0) return { tone: 'good', count: 0, label: 'All running' };
  return { tone: 'neutral', count: 0, label: 'Nothing deployed yet' };
}

interface HealthInput {
  /** Null while the health read has not arrived or could not be read. */
  systems: Array<{ status: 'healthy' | 'degraded' | 'down' | 'idle' }> | null;
  /** The health checks that need attention, by how bad they are. */
  attention: Array<{ severity: 'bad' | 'warn' | string }>;
}

/** Platform Health: red when a system is failing or a health check is down, amber for degraded systems and warnings, green when every active system is healthy. */
export function healthIndicator(input: HealthInput): ITabIndicator {
  const down = input.systems?.filter((system) => system.status === 'down').length ?? 0;
  const degraded = input.systems?.filter((system) => system.status === 'degraded').length ?? 0;
  const checksDown = input.attention.filter((item) => item.severity === 'bad').length;
  const checksWarn = input.attention.length - checksDown;

  const bad = down + checksDown;
  if (bad > 0) return { tone: 'bad', count: bad, label: down > 0 ? `${plural(down, 'system', 'systems')} failing` : `${plural(checksDown, 'check', 'checks')} down` };
  const warn = degraded + checksWarn;
  if (warn > 0) return { tone: 'warn', count: warn, label: degraded > 0 ? `${degraded} degraded` : `${plural(checksWarn, 'check', 'checks')} to look at` };
  if (input.systems === null) return { tone: 'neutral', count: 0, label: 'Reading status' };
  const active = input.systems.filter((system) => system.status !== 'idle').length;
  return active > 0 ? { tone: 'good', count: 0, label: 'Everything healthy' } : { tone: 'neutral', count: 0, label: 'No activity yet' };
}

/** The Metrics tab has no problem state; it says how much happened. */
export function metricsIndicator(calls: number | null): ITabIndicator {
  if (calls === null) return { tone: 'neutral', count: 0, label: 'Usage and activity' };
  return { tone: 'neutral', count: 0, label: calls > 0 ? `${calls.toLocaleString('en-US')} ${calls === 1 ? 'call' : 'calls'} this period` : 'No calls this period' };
}

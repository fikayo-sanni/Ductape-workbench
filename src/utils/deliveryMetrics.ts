import type { IBuild, IDeployment } from '@/utils/deployments';

/** Numbers about how releases are going, worked out from the deployments and builds the dashboard already reads. Nothing here touches the network or the screen. */

export interface IDeliveryMetrics {
  /** Share of finished builds that succeeded, 0 to 100, or null when none has finished. */
  buildSuccessRate: number | null;
  finishedBuilds: number;
  /** How long a successful build took, on average and for the slowest, in ms, or null when none succeeded. */
  avgBuildMs: number | null;
  slowestBuildMs: number | null;
  /** Builds started in the last 7 days. */
  buildsThisWeek: number;
  /** Share of deployments that were rolled back, 0 to 100, or null when there are none. */
  rollbackRate: number | null;
  rolledBack: number;
  /** When something was last changed to active, or null. */
  lastDeployedAt: string | null;
  /** Active deployments that are not taking all of the traffic: a canary or a gradual shift. */
  partialTraffic: number;
  /** Deployments per product, most first. */
  byProduct: Array<{ product: string; total: number; active: number; attention: number }>;
}

const WEEK_MS = 7 * 86_400_000;
const time = (iso: string): number => new Date(iso).getTime();

export function summarizeDelivery(deployments: IDeployment[], builds: IBuild[], now: Date = new Date()): IDeliveryMetrics {
  const succeeded = builds.filter((build) => build.status === 'succeeded');
  const failed = builds.filter((build) => build.status === 'failed');
  const finished = succeeded.length + failed.length;
  const durations = succeeded.map((build) => time(build.updatedAt) - time(build.createdAt)).filter((ms) => Number.isFinite(ms) && ms >= 0);

  const active = deployments.filter((deployment) => deployment.state === 'active');
  const lastDeployed = active.reduce<string | null>((latest, deployment) => (latest === null || time(deployment.updatedAt) > time(latest) ? deployment.updatedAt : latest), null);
  const rolledBack = deployments.filter((deployment) => deployment.state === 'rolled_back').length;

  const products = new Map<string, { product: string; total: number; active: number; attention: number }>();
  for (const deployment of deployments) {
    const entry = products.get(deployment.product) ?? { product: deployment.product, total: 0, active: 0, attention: 0 };
    entry.total += 1;
    if (deployment.state === 'active') entry.active += 1;
    if (deployment.state === 'failed' || deployment.state === 'rolled_back') entry.attention += 1;
    products.set(deployment.product, entry);
  }

  return {
    buildSuccessRate: finished > 0 ? (succeeded.length / finished) * 100 : null,
    finishedBuilds: finished,
    avgBuildMs: durations.length > 0 ? durations.reduce((sum, ms) => sum + ms, 0) / durations.length : null,
    slowestBuildMs: durations.length > 0 ? Math.max(...durations) : null,
    buildsThisWeek: builds.filter((build) => now.getTime() - time(build.createdAt) <= WEEK_MS).length,
    rollbackRate: deployments.length > 0 ? (rolledBack / deployments.length) * 100 : null,
    rolledBack,
    lastDeployedAt: lastDeployed,
    partialTraffic: active.filter((deployment) => deployment.trafficPercent > 0 && deployment.trafficPercent < 100).length,
    byProduct: [...products.values()].sort((a, b) => b.total - a.total || a.product.localeCompare(b.product)),
  };
}

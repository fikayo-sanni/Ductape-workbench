/**
 * What the Deployments section shows, worked out from what the deploy control plane returns. Everything here is a plain
 * function of that data: nothing is guessed, and a field the server did not send is shown as missing, never invented.
 */

export type DeployableKind = 'function' | 'service';

export type DeploymentState =
  | 'planned' | 'building' | 'built' | 'provisioning' | 'verifying' | 'promoting' | 'active' | 'failed' | 'rolled_back';

export interface IDeploymentTarget {
  kind: string;
  connection: string;
  region?: string;
}

export interface IDeployment {
  id: string;
  kind: DeployableKind;
  product: string;
  name: string;
  version: string;
  env: string;
  target: IDeploymentTarget;
  resourceName: string;
  releaseHash: string;
  lastGoodReleaseHash?: string;
  trafficPercent: number;
  state: DeploymentState;
  revision: number;
  updatedAt: string;
  currentRevision?: string;
  lastGoodRevision?: string;
  candidateUrl?: string;
}

export interface IEnvironmentPolicy {
  requireHumanApproval: boolean;
  allowAgentApply: boolean;
  /** "default" until a person sets it for this environment. */
  source: 'default' | 'set';
}

export interface IProductEnvironment {
  slug: string;
  name?: string;
  description?: string;
  active: boolean;
  policy: IEnvironmentPolicy;
}

export interface IJournalEntry {
  seq: number;
  state: DeploymentState;
  step: string;
  observed?: Record<string, unknown>;
  error?: { code: string; message: string };
  actor?: string;
  at: string;
}

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'neutral';

const IN_FLIGHT: ReadonlySet<DeploymentState> = new Set(['planned', 'building', 'built', 'provisioning', 'verifying', 'promoting']);

export const isInFlight = (state: DeploymentState): boolean => IN_FLIGHT.has(state);

const STATE_LABEL: Record<DeploymentState, string> = {
  planned: 'Planned',
  building: 'Building',
  built: 'Built',
  provisioning: 'Provisioning',
  verifying: 'Verifying',
  promoting: 'Promoting',
  active: 'Active',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

/** The label and colour for a state. An unknown state is shown as it came, in a neutral colour. */
export function describeState(state: string): { label: string; tone: Tone } {
  const known = state as DeploymentState;
  const label = STATE_LABEL[known] ?? state;
  if (known === 'active') return { label, tone: 'good' };
  if (known === 'failed') return { label, tone: 'bad' };
  if (known === 'rolled_back') return { label, tone: 'warn' };
  if (IN_FLIGHT.has(known) && known !== 'planned') return { label, tone: 'info' };
  return { label, tone: 'neutral' };
}

const TARGET_LABEL: Record<string, string> = {
  cloud_run: 'Cloud Run',
  aws_lambda: 'AWS Lambda',
  aws_fargate: 'AWS Fargate',
  aws_ecs_express: 'AWS ECS Express',
  azure_container_apps: 'Azure Container Apps',
  cloudflare_workers: 'Cloudflare Workers',
  vps: 'VPS',
};

/** A target kind as a person reads it: aws_fargate is "AWS Fargate". A kind with no name here is shown as it came. */
export const targetLabel = (kind: string): string => TARGET_LABEL[kind] ?? kind;

export function describeTarget(target: IDeploymentTarget): string {
  const kind = TARGET_LABEL[target.kind] ?? target.kind;
  return `${kind} · ${target.connection}${target.region ? ` · ${target.region}` : ''}`;
}

export function describePolicy(policy: IEnvironmentPolicy): { label: string; tone: Tone; detail: string } {
  if (policy.requireHumanApproval) {
    return { label: 'Approval required', tone: 'warn', detail: 'A person must approve each plan before it is applied.' };
  }
  if (policy.allowAgentApply) {
    return { label: 'Agents may apply', tone: 'neutral', detail: 'An agent can apply a plan here without approval.' };
  }
  return { label: 'People apply', tone: 'neutral', detail: 'Only a person can apply a plan here.' };
}

/** "100%" for a whole number, one decimal otherwise. */
export function formatTraffic(percent: number): string {
  if (!Number.isFinite(percent)) return '-';
  return Number.isInteger(percent) ? `${percent}%` : `${Number(percent.toFixed(1))}%`;
}

export function shortHash(hash: string | undefined): string {
  if (!hash) return '-';
  return hash.replace(/^sha256:/, '').slice(0, 12);
}

/** Compares versions such as 1.2.3 and 1.2.3-rc.1, newest first when used as a sort. A prerelease is older than its release. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const [core, pre] = value.split('-', 2);
    return { nums: core.split('.').map((part) => Number.parseInt(part, 10) || 0), pre };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.nums.length, right.nums.length); i += 1) {
    const diff = (left.nums[i] ?? 0) - (right.nums[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (left.pre === right.pre) return 0;
  if (left.pre === undefined) return 1;
  if (right.pre === undefined) return -1;
  return left.pre < right.pre ? -1 : 1;
}

export interface IDeploymentFilters {
  kind?: DeployableKind | 'all';
  env?: string | 'all';
  search?: string;
}

export function filterDeployments(deployments: IDeployment[], filters: IDeploymentFilters): IDeployment[] {
  const needle = (filters.search ?? '').trim().toLowerCase();
  return deployments.filter((d) => {
    if (filters.kind && filters.kind !== 'all' && d.kind !== filters.kind) return false;
    if (filters.env && filters.env !== 'all' && d.env !== filters.env) return false;
    if (needle && !`${d.name} ${d.version} ${d.resourceName} ${d.target.connection}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export interface IEnvironmentGroup {
  slug: string;
  name: string;
  /** False for an environment the product no longer has, which still holds deployments. */
  known: boolean;
  active: boolean;
  policy?: IEnvironmentPolicy;
  deployments: IDeployment[];
}

/**
 * Deployments grouped by the product's environments, in the order the product lists them. An environment with nothing deployed
 * is still shown, so it is clear nothing is there. A deployment whose environment the product no longer lists gets its own
 * group at the end rather than being hidden.
 */
export function groupByEnvironment(deployments: IDeployment[], environments: IProductEnvironment[]): IEnvironmentGroup[] {
  const sorted = [...deployments].sort((a, b) => a.name.localeCompare(b.name) || compareVersions(b.version, a.version));
  const groups: IEnvironmentGroup[] = environments.map((env) => ({
    slug: env.slug, name: env.name || env.slug, known: true, active: env.active, policy: env.policy,
    deployments: sorted.filter((d) => d.env === env.slug),
  }));
  const known = new Set(environments.map((env) => env.slug));
  for (const slug of [...new Set(sorted.map((d) => d.env))].filter((slug) => !known.has(slug)).sort()) {
    groups.push({ slug, name: slug, known: false, active: false, deployments: sorted.filter((d) => d.env === slug) });
  }
  return groups;
}

export interface IDeploymentTotals {
  total: number;
  active: number;
  inFlight: number;
  attention: number;
}

/** Failed and rolled-back deployments need a look; in-flight ones are still moving. */
export function totals(deployments: IDeployment[]): IDeploymentTotals {
  return {
    total: deployments.length,
    active: deployments.filter((d) => d.state === 'active').length,
    inFlight: deployments.filter((d) => isInFlight(d.state)).length,
    attention: deployments.filter((d) => d.state === 'failed' || d.state === 'rolled_back').length,
  };
}

/** The server's explanation when it gave one, else a plain description of what went wrong. */
export function deployErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { errors?: unknown; meta?: { code?: string } } } })?.response;
  if (response?.status === 404 && !response.data?.meta?.code) {
    return 'This server does not offer Ductape Deploy yet, so there is nothing to show.';
  }
  const detail = response?.data?.errors;
  const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.join('; ') : undefined;
  if (message) return response?.data?.meta?.code ? `${message} [${response.data.meta.code}]` : message;
  return error instanceof Error ? error.message : 'The deployments could not be loaded.';
}

// ---- Builds -------------------------------------------------------------------------------------------------------------------

export type BuildStatus = 'awaiting_upload' | 'building' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

/** A build of source code into an image in the customer's own cloud account. */
export interface IBuild {
  id: string;
  kind: DeployableKind;
  product: string;
  name: string;
  version: string;
  connection: string;
  region: string;
  status: BuildStatus;
  builder: string;
  imageRepository: string;
  imageDigest?: string;
  releaseHash?: string;
  logUrl?: string;
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
}

const BUILD_LABEL: Record<BuildStatus, string> = {
  awaiting_upload: 'Waiting for source',
  building: 'Building',
  succeeded: 'Succeeded',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export function describeBuildStatus(status: string): { label: string; tone: Tone } {
  const known = status as BuildStatus;
  const label = BUILD_LABEL[known] ?? status;
  if (known === 'succeeded') return { label, tone: 'good' };
  if (known === 'failed') return { label, tone: 'bad' };
  if (known === 'expired' || known === 'cancelled') return { label, tone: 'warn' };
  if (known === 'building') return { label, tone: 'info' };
  return { label, tone: 'neutral' };
}

/** Builds that are still moving: waiting for their source, or running. */
export const isBuildInFlight = (status: string): boolean => status === 'awaiting_upload' || status === 'building';

export interface IBuildTotals {
  total: number;
  inFlight: number;
  succeeded: number;
  failed: number;
}

export function buildTotals(builds: IBuild[]): IBuildTotals {
  return {
    total: builds.length,
    inFlight: builds.filter((b) => isBuildInFlight(b.status)).length,
    succeeded: builds.filter((b) => b.status === 'succeeded').length,
    failed: builds.filter((b) => b.status === 'failed').length,
  };
}

/** Which providers Ductape Deploy can use today. Others cannot have anything deployed or built through them yet. */
export const DEPLOY_PROVIDERS: ReadonlySet<string> = new Set(['gcp', 'aws', 'azure', 'cloudflare']);

/** Whether a connection was created with the deploy scope, which a build or deploy through it needs. */
export const hasDeployScope = (scopes: readonly string[] | undefined): boolean => Boolean(scopes?.includes('deploy'));

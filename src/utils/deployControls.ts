/**
 * The rules behind the Deploy controls in the workbench, as plain functions of what the control plane returns. A button is only
 * ever on when the server would accept the click, and when it is off the reason is given in words, so nobody learns by failing.
 * The server remains the authority: everything here mirrors a rule it also enforces, and a refusal from it is shown as it came.
 */

import type { DeploymentState, IDeployment, Tone } from './deployments';

// ---- What the control plane will do -----------------------------------------------------------------------------------------

export interface IDeployCapabilities {
  mutationsEnabled: boolean;
  reconcilerEnabled: boolean;
  observeFromProvider: boolean;
  adminOnly: boolean;
  stepUp: { mode: 'off' | 'production' | 'all' | 'misconfigured'; ready: boolean; method: string };
  /** The target kinds a writer exists for, such as cloud_run. */
  targets: string[];
  /** Whether any worker has checked in lately. A plan that is applied only moves forward while one is running. */
  worker?: { alive: boolean; lastSeenAt?: string; inFlight?: number; oldestInFlightSeconds?: number; lastError?: string };
}

/** A deployment that has been moving this long is probably stuck, not slow. */
export const STUCK_AFTER_SECONDS = 20 * 60;

/** A control that is on, or off with the reason. */
export interface IControl {
  enabled: boolean;
  reason?: string;
}

const on = (): IControl => ({ enabled: true });
const off = (reason: string): IControl => ({ enabled: false, reason });

/** Things about this server a person should know before they start, most important first. */
export function capabilityNotices(caps: IDeployCapabilities | undefined): Array<{ tone: Tone; text: string }> {
  if (!caps) return [];
  const notices: Array<{ tone: Tone; text: string }> = [];
  if (!caps.mutationsEnabled) {
    notices.push({ tone: 'warn', text: 'This server has changes to your cloud switched off, so plans can be made and approved but not applied.' });
  }
  if (caps.stepUp.mode === 'misconfigured' || (caps.stepUp.mode !== 'off' && !caps.stepUp.ready)) {
    notices.push({ tone: 'bad', text: 'This server asks for an emailed code before approvals, retirements and policy changes, but cannot send one yet. Those actions are blocked until it is set up.' });
  }
  if (caps.mutationsEnabled && caps.worker && !caps.worker.alive) {
    notices.push({ tone: 'bad', text: 'No Deploy worker has checked in recently, so a plan that is applied will not move forward. Ask whoever runs this server to start it.' });
  } else if (caps.worker?.alive && (caps.worker.oldestInFlightSeconds ?? 0) >= STUCK_AFTER_SECONDS) {
    notices.push({ tone: 'warn', text: `A deployment has been moving for ${Math.round((caps.worker.oldestInFlightSeconds as number) / 60)} minutes, which is longer than usual. Open it under Deployments to see where it is.` });
  }
  if (!caps.observeFromProvider) {
    notices.push({ tone: 'info', text: 'This server does not read the state of your cloud itself yet, so new plans can only be made from a terminal. Existing plans can still be reviewed here.' });
  }
  return notices;
}

// ---- Who may decide ---------------------------------------------------------------------------------------------------------

export const isAdminLevel = (level: string | undefined): boolean => {
  const value = String(level ?? '').toLowerCase();
  return value === 'owner' || value === 'admin';
};

/** The signed-in person's access level in a workspace, from the list the workbench already holds. Unknown is undefined, never guessed. */
export function accessLevelFor(response: { data?: Array<{ workspace_id?: string; access_level?: string }> } | null | undefined, workspaceId: string | null | undefined): string | undefined {
  if (!workspaceId) return undefined;
  const row = (response?.data ?? []).find((w) => w.workspace_id === workspaceId);
  return row?.access_level || undefined;
}

/**
 * Whether the server will hold a decision to the admin rule. When it does and the person is known not to be an admin, the control is
 * off with the reason. When their level is not known the control stays on and the server decides.
 */
function adminGate(caps: IDeployCapabilities | undefined, level: string | undefined, what: string): IControl | undefined {
  if (!caps?.adminOnly || level === undefined || isAdminLevel(level)) return undefined;
  return off(`Only a workspace owner or admin can ${what} on this server.`);
}

// ---- Step-up: an emailed code before decisions only a person may make ----------------------------------------------------------

export type StepUpAction = 'approve' | 'retire' | 'policy';

/** Mirrors the server: retiring and policy changes always need a code once step-up is on; an approval when a person must give it or mode is "all". */
export function stepUpNeeded(action: StepUpAction, caps: IDeployCapabilities | undefined, approvalNeedsAPerson: boolean): boolean {
  if (!caps) return false;
  const mode = caps.stepUp.mode;
  if (mode === 'off') return false;
  if (mode === 'misconfigured') return true;
  if (action !== 'approve') return true;
  return mode === 'all' || approvalNeedsAPerson;
}

/** Whether the server can send a code at all. When it cannot, the action it guards is off rather than a dead end. */
function stepUpGate(action: StepUpAction, caps: IDeployCapabilities | undefined, approvalNeedsAPerson: boolean): IControl | undefined {
  if (!stepUpNeeded(action, caps, approvalNeedsAPerson)) return undefined;
  if (caps && !caps.stepUp.ready) return off('This needs an emailed code, and this server cannot send one yet. Ask whoever runs it to finish setting up step-up approval.');
  return undefined;
}

/** The thing a code is good for. Must be exactly what the server asks for, so a code for one change cannot be spent on another. */
export const stepUpScope = {
  approve: (planHash: string): string => `plan:${planHash}`,
  retire: (productTag: string, name: string, version: string): string => `retire:${productTag}/${name}@${version}`,
  policy: (productTag: string, env: string): string => `policy:${productTag}/${env}`,
};

export const STEP_UP_HEADER = 'x-ductape-grant';

export const isSixDigitCode = (value: string): boolean => /^[0-9]{6}$/.test(value.trim());

// ---- Plans ------------------------------------------------------------------------------------------------------------------------

export type PlanStage = 'blocked' | 'pending_approval' | 'approved' | 'ready' | 'applied' | 'expired';
export type PlanIntent = 'deploy' | 'redeploy' | 'rollback' | 'traffic';

export interface IPlanAction { type: 'create' | 'update_release' | 'shift_traffic' | 'noop' | 'conflict'; reason: string; resource: string }

export interface IPlanDesired {
  product: string;
  name: string;
  kind: 'function' | 'service';
  version: string;
  env: string;
  target: { kind: string; connection: string; region?: string };
  releaseHash: string;
  trafficPercent: number;
  runtime?: Record<string, unknown>;
}

export interface IPlanRow {
  id: string;
  stage: PlanStage;
  status: 'pending' | 'approved' | 'applied';
  ok: boolean;
  intent?: PlanIntent;
  planHash: string;
  desired: IPlanDesired;
  actions: IPlanAction[];
  warnings: string[];
  placement?: Array<{ code: string; message: string }>;
  observedSource?: 'caller' | 'provider';
  expiresAt: string;
  createdAt: string;
  createdBy?: string;
  approval?: { approverId: string; approverKind: 'human' | 'agent'; approvedAt: string };
}

export interface IPlanDetail extends IPlanRow {
  observed?: Record<string, unknown>;
  release?: { releaseHash: string; imageDigest: string; imageRepository: string; version: string };
}

const STAGE: Record<PlanStage, { label: string; tone: Tone; detail: string }> = {
  blocked: { label: 'Blocked', tone: 'bad', detail: 'This plan has a conflict and cannot be applied. Fix the cause and make a new plan.' },
  pending_approval: { label: 'Needs approval', tone: 'warn', detail: 'A person must approve this exact plan before it can be applied.' },
  approved: { label: 'Approved', tone: 'info', detail: 'Approved and ready to apply.' },
  ready: { label: 'Ready', tone: 'info', detail: 'This environment does not need approval. It can be applied now.' },
  applied: { label: 'Applied', tone: 'good', detail: 'This plan was applied.' },
  expired: { label: 'Expired', tone: 'neutral', detail: 'Plans expire so a decision is never made on stale information. Make a new plan.' },
};

export const describeStage = (stage: string): { label: string; tone: Tone; detail: string } =>
  STAGE[stage as PlanStage] ?? { label: stage, tone: 'neutral', detail: '' };

const INTENT_LABEL: Record<PlanIntent, string> = { deploy: 'Deploy', redeploy: 'Redeploy', rollback: 'Roll back', traffic: 'Traffic change' };
export const describeIntent = (intent: string | undefined): string => (intent ? INTENT_LABEL[intent as PlanIntent] ?? intent : 'Deploy');

const ACTION_LABEL: Record<IPlanAction['type'], string> = {
  create: 'Create', update_release: 'Update release', shift_traffic: 'Shift traffic', noop: 'No change', conflict: 'Conflict',
};
export const describeAction = (type: string): { label: string; tone: Tone } => ({
  label: ACTION_LABEL[type as IPlanAction['type']] ?? type,
  tone: type === 'conflict' ? 'bad' : type === 'noop' ? 'neutral' : 'info',
});

/** Plans that need a person, newest first, then everything else newest first. What to do next sits at the top. */
export function sortPlans(plans: IPlanRow[]): IPlanRow[] {
  const rank = (stage: PlanStage): number => (stage === 'pending_approval' ? 0 : stage === 'approved' || stage === 'ready' ? 1 : 2);
  return [...plans].sort((a, b) => rank(a.stage) - rank(b.stage) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function planTotals(plans: IPlanRow[]): { total: number; needsApproval: number; readyToApply: number; blocked: number } {
  return {
    total: plans.length,
    needsApproval: plans.filter((p) => p.stage === 'pending_approval').length,
    readyToApply: plans.filter((p) => p.stage === 'approved' || p.stage === 'ready').length,
    blocked: plans.filter((p) => p.stage === 'blocked').length,
  };
}

/** Time left on a plan in words, or undefined when it is not waiting for anything. */
export function expiresIn(plan: Pick<IPlanRow, 'stage' | 'expiresAt'>, now: number = Date.now()): string | undefined {
  if (plan.stage === 'applied' || plan.stage === 'expired' || plan.stage === 'blocked') return undefined;
  const ms = Date.parse(plan.expiresAt) - now;
  if (!Number.isFinite(ms)) return undefined;
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export interface IPlanControls {
  approve: IControl;
  apply: IControl;
  /** Whether approving will ask for an emailed code. */
  approveNeedsCode: boolean;
}

/** What can be done with a plan now, and why not when something cannot. */
export function planControls(plan: Pick<IPlanRow, 'stage' | 'desired' | 'placement'>, caps: IDeployCapabilities | undefined, level: string | undefined): IPlanControls {
  const needsPerson = plan.stage === 'pending_approval';
  const approveNeedsCode = needsPerson && stepUpNeeded('approve', caps, true);

  let approve: IControl;
  let apply: IControl;
  switch (plan.stage) {
    case 'blocked':
      approve = off('A blocked plan cannot be approved.');
      apply = off(plan.placement?.length ? plan.placement.map((p) => p.message).join(' ') : 'A blocked plan cannot be applied.');
      break;
    case 'expired':
      approve = off('This plan has expired. Make a new one.');
      apply = off('This plan has expired. Make a new one.');
      break;
    case 'applied':
      approve = off('This plan was already applied.');
      apply = off('This plan was already applied.');
      break;
    case 'pending_approval':
      approve = adminGate(caps, level, 'approve plans') ?? stepUpGate('approve', caps, true) ?? on();
      apply = off('Approve this plan first. A person must approve the exact plan before it can be applied.');
      break;
    case 'approved':
      approve = off('Already approved.');
      apply = on();
      break;
    default:
      approve = off('This environment does not need approval.');
      apply = on();
  }
  if (apply.enabled) {
    if (caps && !caps.mutationsEnabled) apply = off('This server has changes to your cloud switched off, so nothing can be applied yet.');
    else if (caps && !caps.targets.includes(plan.desired.target.kind)) apply = off(`This server cannot deploy to ${plan.desired.target.kind} yet.`);
  }
  return { approve, apply, approveNeedsCode };
}

/** The headline of a plan in two lines, for confirming before approving. The individual changes are listed separately. */
export function summarizePlan(plan: Pick<IPlanRow, 'desired' | 'intent'>): string[] {
  const d = plan.desired;
  const lines = [`${describeIntent(plan.intent)}: ${d.name} ${d.version} in ${d.env}, on ${d.target.connection}${d.target.region ? ` (${d.target.region})` : ''}`];
  lines.push(`Release ${d.releaseHash.replace(/^sha256:/, '').slice(0, 12)} will receive ${Number.isInteger(d.trafficPercent) ? d.trafficPercent : Number(d.trafficPercent.toFixed(1))}% of traffic`);
  return lines;
}

// ---- Making a plan -------------------------------------------------------------------------------------------------------------

const TARGET_FOR_PROVIDER: Record<string, string> = { gcp: 'cloud_run', aws: 'aws_lambda', azure: 'azure_container_apps', cloudflare: 'cloudflare_workers' };

/** The connection fields that make an AWS connection ready for Fargate. Kept equal to the form's fields (utils/deployConnection.ts), which a test checks. */
export const FARGATE_CONNECTION_KEYS = [
  'fargate_cluster', 'fargate_listener_arn', 'fargate_base_domain', 'fargate_vpc_id', 'fargate_subnets', 'fargate_security_groups',
  'fargate_task_role_arn', 'fargate_execution_role_arn', 'fargate_log_group',
] as const;

/** The connection fields ECS Express Mode needs: the Fargate cluster, subnets, roles and log group, plus the infrastructure role. No domain, listener or VPC. */
export const EXPRESS_CONNECTION_KEYS = [
  'fargate_cluster', 'fargate_subnets', 'fargate_task_role_arn', 'fargate_execution_role_arn', 'fargate_log_group', 'express_infrastructure_role_arn',
] as const;

/** Whether an AWS connection holds all, some or none of what Express needs. Having no infrastructure role means it was never set up for Express, which is fine. */
export function expressSetup(metadata: Record<string, unknown> | undefined): { configured: boolean; missing: string[] } {
  const filled = (key: string) => { const v = metadata?.[key]; return Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim() !== ''; };
  if (!filled('express_infrastructure_role_arn')) return { configured: false, missing: [] };
  const missing = EXPRESS_CONNECTION_KEYS.filter((k) => !filled(k)).map((k) => k.replace(/^fargate_/, '').replace(/_/g, ' '));
  return { configured: missing.length === 0, missing };
}

/** Whether an AWS connection holds all, some or none of the Fargate details. None is fine: Lambda does not need them. */
export function fargateSetup(metadata: Record<string, unknown> | undefined): { configured: boolean; missing: string[] } {
  const filled = (key: string) => { const v = metadata?.[key]; return Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim() !== ''; };
  const present = FARGATE_CONNECTION_KEYS.filter(filled);
  return { configured: present.length === FARGATE_CONNECTION_KEYS.length, missing: present.length === 0 ? [] : FARGATE_CONNECTION_KEYS.filter((k) => !filled(k)).map((k) => k.replace(/^fargate_/, '').replace(/_/g, ' ')) };
}

export const targetKindForProvider = (provider: string | undefined): string | undefined => (provider ? TARGET_FOR_PROVIDER[provider] : undefined);

export interface IConnectionLike {
  tag?: string;
  display_name?: string;
  provider?: string;
  status?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ITargetOption {
  /** Unique per connection and target kind: one AWS connection can offer both Lambda and Fargate. */
  key: string;
  connectionTag: string;
  label: string;
  provider: string;
  targetKind: string;
  enabled: boolean;
  reason?: string;
  defaultRegion: string;
}

/** The region a connection falls back to, from what it holds. Empty when it names none, and the person says. */
export function defaultRegionFor(connection: IConnectionLike): string {
  const meta = connection.metadata ?? {};
  return String(meta.default_region ?? meta.default_location ?? meta.region ?? '').trim();
}

/** The connections a plan could target, each on or off with the reason. A connection that could never deploy is left out. */
export function targetOptions(connections: IConnectionLike[], caps: IDeployCapabilities | undefined): ITargetOption[] {
  const options: ITargetOption[] = [];
  for (const connection of connections) {
    if (!connection.tag) continue;
    const targetKind = targetKindForProvider(connection.provider);
    if (!targetKind) continue;
    const base = {
      key: `${connection.tag}::${targetKind}`, connectionTag: connection.tag, label: `${connection.display_name || connection.tag} (${connection.tag})`, provider: connection.provider as string, targetKind,
      defaultRegion: defaultRegionFor(connection),
    };
    // What stops any target of this connection (not deployable, not active) is separate from what this server can do for one kind.
    let connectionReason: string | undefined;
    if (!connection.scopes?.includes('deploy')) connectionReason = 'Not created for deploys. Create it with the deploy scope.';
    else if (connection.status !== 'active') connectionReason = 'Not active yet. Finish setting it up and validate it.';
    let reason = connectionReason;
    if (!reason && caps && !caps.targets.includes(targetKind)) reason = `This server cannot deploy to ${targetKind} yet.`;
    options.push({ ...base, enabled: !reason, ...(reason ? { reason } : {}) });
    if (connection.provider === 'aws') {
      const express = expressSetup(connection.metadata);
      if (express.configured || express.missing.length > 0) {
        let expressReason = connectionReason;
        if (!expressReason && !express.configured) expressReason = `ECS Express is only partly set up. Missing: ${express.missing.join(', ')}.`;
        else if (!expressReason && caps && !caps.targets.includes('aws_ecs_express')) expressReason = 'This server cannot deploy to aws_ecs_express yet.';
        options.push({ ...base, key: `${connection.tag}::aws_ecs_express`, label: `${base.label} - ECS Express (checked after traffic starts)`, targetKind: 'aws_ecs_express', enabled: !expressReason, ...(expressReason ? { reason: expressReason } : {}) });
      }
    }
    // An AWS connection that has been given the Fargate details offers Fargate as a second place to deploy. Partly set up, it is shown off with what is missing.
    if (connection.provider === 'aws') {
      const fargate = fargateSetup(connection.metadata);
      // A connection set up for Express alone has the cluster, roles and subnets but no listener, domain or VPC, and is not "partly Fargate".
      const meta = connection.metadata ?? {};
      const fargateSpecific = ['fargate_listener_arn', 'fargate_base_domain', 'fargate_vpc_id', 'fargate_security_groups'].some((k) => { const v = meta[k]; return Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim() !== ''; });
      if (fargate.configured || (fargate.missing.length > 0 && fargateSpecific)) {
        let fargateReason = connectionReason;
        if (!fargateReason && !fargate.configured) fargateReason = `Fargate is only partly set up. Missing: ${fargate.missing.join(', ')}.`;
        else if (!fargateReason && caps && !caps.targets.includes('aws_fargate')) fargateReason = 'This server cannot deploy to aws_fargate yet.';
        options.push({ ...base, key: `${connection.tag}::aws_fargate`, label: `${base.label} - Fargate`, targetKind: 'aws_fargate', enabled: !fargateReason, ...(fargateReason ? { reason: fargateReason } : {}) });
      }
    }
  }
  return options.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label));
}

export interface IReleaseLike {
  releaseHash: string;
  /** What the release is made of. A worker bundle runs only on Cloudflare Workers, an image only everywhere else. Absent means an image. */
  artifact?: 'image' | 'worker_bundle';
  kind: 'function' | 'service';
  product: string;
  name: string;
  version: string;
  createdAt?: string;
}

export interface INewPlanInput {
  product: string;
  release: IReleaseLike | undefined;
  env: string;
  target: ITargetOption | undefined;
  region: string;
  trafficPercent: number | string;
}

export interface INewPlanRequest {
  product: string;
  kind: 'function' | 'service';
  function?: string;
  service?: string;
  version: string;
  env: string;
  target: { kind: string; connection: string; region?: string };
  releaseHash: string;
  trafficPercent: number;
}

/** Whether a release can run on a target kind. A bundle runs only on Cloudflare Workers, an image only elsewhere, and Workers run functions only. */
export function releaseFitsTarget(release: Pick<IReleaseLike, 'artifact' | 'kind'>, targetKind: string | undefined): IControl {
  if (!targetKind) return on();
  const bundle = release.artifact === 'worker_bundle';
  const workers = targetKind === 'cloudflare_workers';
  if (bundle && !workers) return off('This release is a Cloudflare Worker bundle. It runs only on a Cloudflare Workers target.');
  if (workers && release.kind === 'service') return off('Cloudflare Workers cannot run a service. Deploy it to Cloud Run, Lambda or Container Apps.');
  if (workers && !bundle) return off('This release is a container image, which Cloudflare Workers cannot run. Publish a bundle with: ductape deploy releases publish-worker');
  return on();
}

/** Checks a new plan before it is sent and builds the request. Throws with a message a person can act on. */
export function buildNewPlanRequest(input: INewPlanInput): INewPlanRequest {
  if (!input.release) throw new Error('Choose the release to deploy.');
  if (!input.env) throw new Error('Choose an environment.');
  if (!input.target) throw new Error('Choose a cloud connection to deploy through.');
  if (!input.target.enabled) throw new Error(input.target.reason ?? 'That connection cannot be deployed through.');
  const fits = releaseFitsTarget(input.release, input.target.targetKind);
  if (!fits.enabled) throw new Error(fits.reason);
  const traffic = validateTraffic(input.trafficPercent);
  if (!traffic.ok) throw new Error(traffic.error);
  if (input.target.targetKind === 'aws_ecs_express' && traffic.value !== 100) throw new Error('ECS Express Mode cannot split traffic: AWS runs its own canary on every update. Use 100%, or deploy to Fargate to control the split.');
  const region = input.region.trim();
  const name = input.release.kind === 'service' ? { service: input.release.name } : { function: input.release.name };
  return {
    product: input.product, kind: input.release.kind, ...name, version: input.release.version, env: input.env,
    target: { kind: input.target.targetKind, connection: input.target.connectionTag, ...(region ? { region } : {}) },
    releaseHash: input.release.releaseHash, trafficPercent: traffic.value,
  };
}

/** Whether the workbench can make a new plan at all on this server, with the reason it cannot. */
export function newPlanGate(caps: IDeployCapabilities | undefined): IControl {
  if (!caps) return off('Checking what this server can do...');
  if (!caps.observeFromProvider) return off('This server does not read the state of your cloud itself yet, so plans can only be made from a terminal: ductape deploy plans create --file plan.json');
  return on();
}

// ---- Traffic ---------------------------------------------------------------------------------------------------------------------

export const TRAFFIC_PRESETS: readonly number[] = [0, 5, 10, 25, 50, 100];

export function validateTraffic(value: number | string): { ok: true; value: number } | { ok: false; error: string } {
  const text = typeof value === 'string' ? value.trim() : String(value);
  if (!/^\d{1,3}$/.test(text)) return { ok: false, error: 'Traffic must be a whole number from 0 to 100.' };
  const n = Number(text);
  if (n < 0 || n > 100) return { ok: false, error: 'Traffic must be a whole number from 0 to 100.' };
  return { ok: true, value: n };
}

/** What a traffic move means, in words, including the cases worth a second look. */
export function describeTrafficChange(from: number, to: number): { text: string; tone: Tone } {
  if (to === from) return { text: `No change: this release already receives ${from}%.`, tone: 'neutral' };
  if (to === 0) return { text: `Stop sending traffic to this release (was ${from}%). Nothing is deleted.`, tone: 'warn' };
  if (to === 100) return { text: `Send all traffic to this release (was ${from}%). It becomes the last known good release.`, tone: 'info' };
  return { text: `Send ${to}% of traffic to this release (was ${from}%). The rest keeps going to the last good release.`, tone: 'info' };
}

export type DeploymentIntent = 'redeploy' | 'rollback' | 'traffic';

export interface IIntentOption extends IControl { intent: DeploymentIntent; label: string; detail: string }

const IN_FLIGHT_STATES: ReadonlySet<DeploymentState> = new Set(['planned', 'building', 'built', 'provisioning', 'verifying', 'promoting']);

/** The changes a deployment can be planned for. Each is on or off with the reason, using the same rules the server applies. */
export function deploymentIntents(deployment: IDeployment, caps: IDeployCapabilities | undefined): IIntentOption[] {
  const gate = newPlanGate(caps);
  const inFlight = IN_FLIGHT_STATES.has(deployment.state);
  const blocked = (): IControl | undefined => (!gate.enabled ? off(gate.reason as string) : inFlight ? off(`This deployment is ${deployment.state}. Wait for it to finish before planning another change.`) : undefined);
  const hasEarlier = Boolean(deployment.lastGoodReleaseHash) && deployment.lastGoodReleaseHash !== deployment.releaseHash;
  const rollback = blocked() ?? (hasEarlier ? on() : off('There is no earlier release to go back to.'));
  return [
    { intent: 'traffic', label: 'Change traffic', detail: 'Send a different share of traffic to this release.', ...(blocked() ?? on()) },
    { intent: 'redeploy', label: 'Redeploy', detail: 'Run this release again, for example to repair what the cloud holds.', ...(blocked() ?? on()) },
    { intent: 'rollback', label: 'Roll back', detail: 'Go back to the last known good release.', ...rollback },
  ];
}

export interface IDeploymentPlanRequest { intent: DeploymentIntent; trafficPercent?: number; releaseHash?: string }

export function buildDeploymentPlanRequest(deployment: IDeployment, intent: DeploymentIntent, traffic?: number | string): IDeploymentPlanRequest {
  if (intent === 'redeploy') return { intent };
  if (intent === 'rollback') {
    if (!deployment.lastGoodReleaseHash || deployment.lastGoodReleaseHash === deployment.releaseHash) throw new Error('There is no earlier release to go back to.');
    return { intent, releaseHash: deployment.lastGoodReleaseHash };
  }
  const checked = validateTraffic(traffic ?? '');
  if (!checked.ok) throw new Error(checked.error);
  if (checked.value === deployment.trafficPercent && deployment.state === 'active') throw new Error(`This deployment already sends ${checked.value}% of traffic to its release.`);
  return { intent, trafficPercent: checked.value };
}

// ---- Versions --------------------------------------------------------------------------------------------------------------------

export type VersionStatus = 'available' | 'deprecated' | 'retired';

export interface IVersionServing { deploymentId: string; env: string; target: { kind: string; connection: string }; state: string; trafficPercent: number; releaseHash: string }

export interface IVersionRow {
  version: string;
  status: VersionStatus;
  deprecation?: { deprecatedAt: string; deprecatedBy: string; reason: string; sunsetAt?: string; replacementVersion?: string };
  retired?: { retiredAt: string; retiredBy: string };
  createdAt: string;
  isLatestAvailable: boolean;
  releases: number;
  serving: IVersionServing[];
}

export interface IFunctionSummary {
  product: string;
  kind: 'function' | 'service';
  name: string;
  latestAvailable?: string;
  counts: { available: number; deprecated: number; retired: number };
}

export function describeVersionStatus(status: string): { label: string; tone: Tone } {
  if (status === 'available') return { label: 'Available', tone: 'good' };
  if (status === 'deprecated') return { label: 'Deprecated', tone: 'warn' };
  if (status === 'retired') return { label: 'Retired', tone: 'neutral' };
  return { label: status, tone: 'neutral' };
}

/** Still serving: in motion, or active and receiving traffic. The server refuses to retire a version while any deployment of it is. */
export const stillServing = (row: Pick<IVersionServing, 'state' | 'trafficPercent'>): boolean =>
  IN_FLIGHT_STATES.has(row.state as DeploymentState) || (row.state === 'active' && row.trafficPercent > 0);

export interface IVersionControls { deprecate: IControl; undeprecate: IControl; retire: IControl; retireNeedsCode: boolean }

export function versionControls(version: IVersionRow, caps: IDeployCapabilities | undefined, level: string | undefined): IVersionControls {
  const retired = off('A retired version cannot be changed.');
  const retireNeedsCode = stepUpNeeded('retire', caps, true);
  if (version.status === 'retired') return { deprecate: retired, undeprecate: retired, retire: retired, retireNeedsCode };
  const live = version.serving.filter(stillServing);
  const where = live.map((d) => `${d.env} on ${d.target.connection} (${d.state}, ${d.trafficPercent}%)`).join(', ');
  let retire: IControl;
  if (version.status !== 'deprecated') retire = off('Deprecate a version before retiring it, so the people who use it have notice.');
  else if (live.length > 0) retire = off(`Still serving: ${where}. Move its traffic to another version first.`);
  else retire = adminGate(caps, level, 'retire versions') ?? stepUpGate('retire', caps, true) ?? on();
  return {
    deprecate: version.status === 'available' ? on() : off('Already deprecated.'),
    undeprecate: version.status === 'deprecated' ? on() : off('This version is not deprecated.'),
    retire,
    retireNeedsCode,
  };
}

const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
export const isValidVersion = (value: string): boolean => VERSION.test(value);

export interface IDeprecationInput { reason: string; sunsetAt?: string; replacementVersion?: string }

/** Checks a deprecation the way the server will, and returns the request. Throws with the reason. */
export function buildDeprecation(version: string, input: IDeprecationInput, siblings: Array<Pick<IVersionRow, 'version' | 'status'>>, compare: (a: string, b: string) => number, now: number = Date.now()): IDeprecationInput {
  const reason = input.reason.trim();
  if (!reason) throw new Error('Say why this version is being deprecated. People who use it will see the reason.');
  if (reason.length > 500) throw new Error('The reason can be up to 500 characters.');
  const out: IDeprecationInput = { reason };
  if (input.sunsetAt) {
    const when = Date.parse(input.sunsetAt);
    if (!Number.isFinite(when) || when <= now) throw new Error('The sunset date must be in the future.');
    out.sunsetAt = new Date(when).toISOString();
  }
  if (input.replacementVersion) {
    if (!isValidVersion(input.replacementVersion)) throw new Error('The replacement is not a valid version.');
    if (compare(input.replacementVersion, version) <= 0) throw new Error('The replacement must be a higher version than the one being deprecated.');
    const target = siblings.find((s) => s.version === input.replacementVersion);
    if (!target || target.status !== 'available') throw new Error(`Version ${input.replacementVersion} is not an available version of this function.`);
    out.replacementVersion = input.replacementVersion;
  }
  return out;
}

/** The versions a deprecated one could point people to: available, and higher. */
export function replacementChoices(version: string, siblings: Array<Pick<IVersionRow, 'version' | 'status'>>, compare: (a: string, b: string) => number): string[] {
  return siblings.filter((s) => s.status === 'available' && compare(s.version, version) > 0).map((s) => s.version).sort((a, b) => compare(b, a));
}

export interface IVersionEvent { event: string; actor: string; detail?: Record<string, unknown>; at: string }

const EVENT_LABEL: Record<string, string> = { registered: 'Registered', deprecated: 'Deprecated', undeprecated: 'Restored to available', retired: 'Retired' };
export const describeVersionEvent = (event: IVersionEvent): string => {
  const label = EVENT_LABEL[event.event] ?? event.event;
  const reason = typeof event.detail?.reason === 'string' ? event.detail.reason : undefined;
  return reason ? `${label}: ${reason}` : label;
};

/** "human:abc123" becomes "a person", "agent:abc123" becomes "an agent", so the history reads without ids. */
export function describeActor(actor: string | undefined): string {
  if (!actor) return 'unknown';
  if (actor.startsWith('human:')) return 'a person';
  if (actor.startsWith('agent:')) return 'an agent';
  return actor;
}

// ---- Environment policy ----------------------------------------------------------------------------------------------------------

export interface IPolicyDraft { requireHumanApproval: boolean; allowAgentApply: boolean }

/** What the server stores: when a person must approve, an agent cannot apply, whatever was asked. */
export const normalizePolicy = (draft: IPolicyDraft): IPolicyDraft => ({
  requireHumanApproval: draft.requireHumanApproval,
  allowAgentApply: draft.requireHumanApproval ? false : draft.allowAgentApply,
});

export const samePolicy = (a: IPolicyDraft, b: IPolicyDraft): boolean => {
  const x = normalizePolicy(a);
  const y = normalizePolicy(b);
  return x.requireHumanApproval === y.requireHumanApproval && x.allowAgentApply === y.allowAgentApply;
};

/** Whether a change gives up a safeguard: approval dropped, or agents allowed to apply. Worth a second look. */
export function weakensPolicy(before: IPolicyDraft, after: IPolicyDraft): boolean {
  const b = normalizePolicy(before);
  const a = normalizePolicy(after);
  return (b.requireHumanApproval && !a.requireHumanApproval) || (!b.allowAgentApply && a.allowAgentApply);
}

export function describePolicyChange(before: IPolicyDraft | undefined, after: IPolicyDraft): string {
  const a = normalizePolicy(after);
  if (!before) return a.requireHumanApproval ? 'A person must approve every plan' : a.allowAgentApply ? 'An agent may apply without approval' : 'Plans apply without approval, by a person only';
  const b = normalizePolicy(before);
  const parts: string[] = [];
  if (b.requireHumanApproval !== a.requireHumanApproval) parts.push(a.requireHumanApproval ? 'A person will now have to approve every plan' : 'Plans will no longer need a person\'s approval');
  if (b.allowAgentApply !== a.allowAgentApply) parts.push(a.allowAgentApply ? 'An agent may now apply plans' : 'An agent may no longer apply plans');
  return parts.length > 0 ? parts.join('. ') : 'No change';
}

export interface IPolicyChangeRow { at: string; actor: string; before?: IPolicyDraft; after: IPolicyDraft; summary: string }

export function policyControl(caps: IDeployCapabilities | undefined, level: string | undefined): IControl & { needsCode: boolean } {
  const needsCode = stepUpNeeded('policy', caps, true);
  const gate = adminGate(caps, level, 'change how an environment is governed') ?? stepUpGate('policy', caps, true);
  return { ...(gate ?? on()), needsCode };
}

// ---- Builds ---------------------------------------------------------------------------------------------------------------------

/** A build can be stopped while it waits for its source or runs. */
export function buildCancelControl(status: string): IControl {
  if (status === 'awaiting_upload' || status === 'building') return on();
  return off(status === 'succeeded' ? 'This build already finished.' : status === 'failed' ? 'This build already failed.' : status === 'cancelled' ? 'This build was already stopped.' : 'This build is no longer running.');
}

// ---- Errors --------------------------------------------------------------------------------------------------------------------

export interface IControlError { code?: string; message: string; stepUpRequired: boolean; codeInvalid: boolean }

/** The server's explanation and its code. A missing or wrong code is marked so the flow can ask again instead of failing. */
export function controlError(error: unknown, fallback = 'That did not work.'): IControlError {
  const response = (error as { response?: { status?: number; data?: { errors?: unknown; message?: unknown; meta?: { code?: string } } } })?.response;
  const code = response?.data?.meta?.code;
  const detail = response?.data?.errors ?? response?.data?.message;
  const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.join('; ') : undefined;
  return {
    code, stepUpRequired: code === 'STEP_UP_REQUIRED', codeInvalid: code === 'STEP_UP_CODE_INVALID',
    message: message ?? (error instanceof Error && error.message ? error.message : fallback),
  };
}

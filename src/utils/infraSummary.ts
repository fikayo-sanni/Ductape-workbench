import { hasDeployScope, isBuildInFlight, isInFlight, targetLabel, type IBuild, type IDeployment, type Tone } from '@/utils/deployments';
import { targetOptions, type IConnectionLike, type IDeployCapabilities, type IPlanRow } from '@/utils/deployControls';

/** The two summaries on the dashboard: what is deployed and how it is doing, and which cloud accounts are connected and ready. Pure. */

export interface IGroupCount { key: string; label: string; total: number; active: number; attention: number; inFlight: number }

export interface IDeploySummary {
  total: number;
  active: number;
  inFlight: number;
  /** Failed and rolled back. */
  attention: number;
  byEnvironment: IGroupCount[];
  byTarget: IGroupCount[];
  /** Failed and rolled-back deployments, newest first. */
  needsAttention: IDeployment[];
  /** The latest changes, newest first. */
  recent: IDeployment[];
  /** Plans waiting for a person to approve them. */
  plansAwaitingApproval: number;
  /** Plans that can never be applied as they are. */
  plansBlocked: number;
  builds: { inFlight: number; failed: number };
}

const byNewest = (a: IDeployment, b: IDeployment): number => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

function group(deployments: IDeployment[], keyOf: (d: IDeployment) => string, labelOf: (key: string) => string): IGroupCount[] {
  const groups = new Map<string, IGroupCount>();
  for (const d of deployments) {
    const key = keyOf(d);
    const entry = groups.get(key) ?? { key, label: labelOf(key), total: 0, active: 0, attention: 0, inFlight: 0 };
    entry.total += 1;
    if (d.state === 'active') entry.active += 1;
    else if (d.state === 'failed' || d.state === 'rolled_back') entry.attention += 1;
    else if (isInFlight(d.state)) entry.inFlight += 1;
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function summarizeDeployments(deployments: IDeployment[], plans: Array<Pick<IPlanRow, 'stage'>> = [], builds: Array<Pick<IBuild, 'status'>> = [], limit = 5): IDeploySummary {
  const newest = [...deployments].sort(byNewest);
  return {
    total: deployments.length,
    active: deployments.filter((d) => d.state === 'active').length,
    inFlight: deployments.filter((d) => isInFlight(d.state)).length,
    attention: deployments.filter((d) => d.state === 'failed' || d.state === 'rolled_back').length,
    byEnvironment: group(deployments, (d) => d.env, (key) => key),
    byTarget: group(deployments, (d) => d.target.kind, targetLabel),
    needsAttention: newest.filter((d) => d.state === 'failed' || d.state === 'rolled_back').slice(0, limit),
    recent: newest.slice(0, limit),
    plansAwaitingApproval: plans.filter((p) => p.stage === 'pending_approval').length,
    plansBlocked: plans.filter((p) => p.stage === 'blocked').length,
    builds: { inFlight: builds.filter((b) => isBuildInFlight(b.status)).length, failed: builds.filter((b) => b.status === 'failed').length },
  };
}

const PROVIDER_LABEL: Record<string, string> = { gcp: 'Google Cloud', aws: 'AWS', azure: 'Azure', cloudflare: 'Cloudflare' };
export const providerLabel = (provider: string | undefined): string =>
  PROVIDER_LABEL[String(provider)] ?? (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Unknown');

export interface IConnectionRow {
  tag: string;
  name: string;
  provider: string;
  providerLabel: string;
  status: string;
  statusLabel: string;
  statusTone: Tone;
  /** Whether deployments can go through it today. */
  deployReady: boolean;
  /** Why not, when it was made for deploys or could be, and cannot yet. */
  deployNote?: string;
  /** The targets it can deploy to, such as "AWS Lambda". */
  targets: string[];
  deployments: number;
}

export interface ICloudSummary {
  total: number;
  active: number;
  /** Connections that are not active: pending setup, or in a state that needs a look. */
  notActive: number;
  deployReady: number;
  byProvider: Array<{ provider: string; label: string; total: number; active: number }>;
  rows: IConnectionRow[];
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  pending: { label: 'Setup not finished', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' },
  invalid: { label: 'Invalid', tone: 'bad' },
  revoked: { label: 'Revoked', tone: 'bad' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};
const describeStatus = (status: string | undefined): { label: string; tone: Tone } =>
  STATUS[String(status)] ?? { label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown', tone: 'neutral' };

export function summarizeConnections(connections: IConnectionLike[], caps: IDeployCapabilities | undefined, deployments: Array<Pick<IDeployment, 'target'>> = []): ICloudSummary {
  const options = targetOptions(connections, caps);
  const usedBy = new Map<string, number>();
  for (const d of deployments) usedBy.set(d.target.connection, (usedBy.get(d.target.connection) ?? 0) + 1);

  const rows: IConnectionRow[] = connections.filter((c) => c.tag).map((c) => {
    const tag = c.tag as string;
    const mine = options.filter((o) => o.connectionTag === tag);
    const ready = mine.filter((o) => o.enabled);
    const status = describeStatus(c.status);
    // A note only for a connection that is meant for deploys, or could be, and is not ready: that is the one a person can fix.
    const blocked = mine.find((o) => !o.enabled);
    return {
      tag, name: c.display_name || tag, provider: String(c.provider ?? ''), providerLabel: providerLabel(c.provider),
      status: String(c.status ?? ''), statusLabel: status.label, statusTone: status.tone,
      deployReady: ready.length > 0,
      ...(ready.length === 0 && blocked?.reason && (hasDeployScope(c.scopes) || mine.length > 0) ? { deployNote: blocked.reason } : {}),
      targets: ready.map((o) => targetLabel(o.targetKind)),
      deployments: usedBy.get(tag) ?? 0,
    };
  });
  // Needing a look first, then the ones in use, then by name.
  const order = (row: IConnectionRow) => (row.statusTone === 'bad' ? 0 : row.statusTone === 'warn' ? 1 : 2);
  rows.sort((a, b) => order(a) - order(b) || b.deployments - a.deployments || a.name.localeCompare(b.name));

  const providers = new Map<string, { provider: string; label: string; total: number; active: number }>();
  for (const row of rows) {
    const entry = providers.get(row.provider) ?? { provider: row.provider, label: row.providerLabel, total: 0, active: 0 };
    entry.total += 1;
    if (row.status === 'active') entry.active += 1;
    providers.set(row.provider, entry);
  }
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    notActive: rows.filter((r) => r.status !== 'active').length,
    deployReady: rows.filter((r) => r.deployReady).length,
    byProvider: [...providers.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    rows,
  };
}


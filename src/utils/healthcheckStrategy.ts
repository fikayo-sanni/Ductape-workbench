/**
 * How a healthcheck decides when to probe, as the Workbench form and detail page present it.
 *
 * "When something fails" (reactive) assumes the asset is healthy, checks on a slow heartbeat, checks at
 * once when an operation on the asset fails, and keeps checking until it has recovered. "On a schedule"
 * (interval) checks every N seconds regardless.
 */

export type CheckStrategy = 'reactive' | 'interval';

export interface StrategyForm {
  strategy: CheckStrategy;
  /** Minutes between baseline checks while healthy. 0 turns the baseline off. */
  heartbeatMinutes: string;
  /** The slowest the recheck gets while an asset is down, in seconds. */
  recheckSeconds: string;
}

export const DEFAULT_STRATEGY_FORM: StrategyForm = {
  strategy: 'reactive',
  heartbeatMinutes: '15',
  recheckSeconds: '60',
};

export const HEARTBEAT_OPTIONS = [
  { value: '5', label: 'Every 5 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Every hour' },
  { value: '0', label: 'Never, only when something fails' },
];

export const RECHECK_OPTIONS = [
  { value: '15', label: 'Every 15 seconds' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every minute' },
  { value: '120', label: 'Every 2 minutes' },
  { value: '300', label: 'Every 5 minutes' },
];

const wholeNumber = (value: string) => /^\d+$/.test(String(value).trim());

/** The first problem with the strategy fields, or undefined. Interval checks are validated by the interval field. */
export function validateStrategy(form: StrategyForm): string | undefined {
  if (form.strategy !== 'reactive') return undefined;
  if (!wholeNumber(form.heartbeatMinutes)) return 'Choose how often to check while healthy.';
  const heartbeat = Number(form.heartbeatMinutes);
  if (heartbeat !== 0 && heartbeat < 1) return 'The baseline check must be at least a minute apart, or never.';
  if (!wholeNumber(form.recheckSeconds) || Number(form.recheckSeconds) < 1) return 'Choose how often to recheck while the asset is down.';
  return undefined;
}

export interface StrategyFields {
  mode: 'reactive';
  heartbeat: number;
  recovery: { max: number };
}

/** The fields to save for a reactive check. Interval checks save nothing extra: no mode means interval. */
export function strategyFields(form: StrategyForm): StrategyFields | null {
  if (form.strategy !== 'reactive') return null;
  return {
    mode: 'reactive',
    heartbeat: Number(form.heartbeatMinutes) * 60_000,
    recovery: { max: Number(form.recheckSeconds) * 1000 },
  };
}

interface StoredCheck {
  mode?: string;
  heartbeat?: number;
  recovery?: { max?: number };
}

const minutes = (ms: number) => {
  const value = ms / 60_000;
  return value === 1 ? '1 minute' : value % 1 === 0 ? `${value} minutes` : `${Math.round(ms / 1000)} seconds`;
};

/** One sentence describing how a stored check decides when to probe. */
export function describeStrategy(check: StoredCheck, intervalLabel?: string): string {
  if (check.mode !== 'reactive') return intervalLabel ? `Checks on a schedule, ${intervalLabel}.` : 'Checks on a schedule.';
  const heartbeat = check.heartbeat ?? 15 * 60_000;
  const baseline = heartbeat > 0 ? `a baseline check every ${minutes(heartbeat)}` : 'no baseline check';
  const recheck = check.recovery?.max ?? 60_000;
  return `Assumed healthy until something fails: ${baseline}, then rechecks at least every ${minutes(recheck)} until it recovers.`;
}

export interface EnvState {
  status?: string;
  lastChecked?: string;
  monitor_state?: string;
}

export interface HealthView {
  tone: 'good' | 'bad' | 'warn';
  label: string;
  note?: string;
}

/**
 * Health is assumed until a failure says otherwise, so a check that has never run is healthy, not unknown.
 * Only an unavailable status is unhealthy, and a check still probing a failure says it is rechecking.
 */
export function healthView(env: EnvState | undefined): HealthView {
  const status = String(env?.status ?? '').toLowerCase();
  if (status === 'unavailable' || status === 'unhealthy' || status === 'error') {
    return env?.monitor_state === 'probing'
      ? { tone: 'bad', label: 'Down', note: 'Rechecking until it recovers' }
      : { tone: 'bad', label: 'Unhealthy' };
  }
  if (env?.monitor_state === 'probing') return { tone: 'warn', label: 'Recovering', note: 'Confirming it is stable' };
  return env?.lastChecked
    ? { tone: 'good', label: 'Healthy' }
    : { tone: 'good', label: 'Healthy', note: 'No failures seen' };
}

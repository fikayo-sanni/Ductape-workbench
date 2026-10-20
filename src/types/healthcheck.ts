export interface CheckEnvStatus {
  slug: string;
  status: string;
  lastAvailable?: string;
  lastChecked?: string;
  lastLatency: string;
  averageLatency: string;
  payload?: any;
  /** Reactive checks: `sleeping` while healthy, `probing` while watching a failure. */
  monitor_state?: 'sleeping' | 'probing';
  next_check_at?: string;
  probe_reason?: string;
}

export interface IHealthCheck {
  _id?: string;
  name: string;
  description: string;
  tag: string;
  checkIntervals: string;
  /** Milliseconds; used when `checkIntervals` is not set. */
  interval?: number;
  /** `reactive` checks wait for a failure; checks without a mode run on their interval. */
  mode?: 'interval' | 'reactive';
  heartbeat?: number;
  recovery?: { initial?: number; max?: number; successes?: number };
  retries: number;
  envs: CheckEnvStatus[];
}


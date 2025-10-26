export interface CheckEnvStatus {
  slug: string;
  status: string;
  lastAvailable?: string;
  lastChecked?: string;
  lastLatency: string;
  averageLatency: string;
  payload?: any;
}

export interface IHealthCheck {
  _id?: string;
  name: string;
  description: string;
  tag: string;
  checkIntervals: string;
  retries: number;
  envs: CheckEnvStatus[];
}


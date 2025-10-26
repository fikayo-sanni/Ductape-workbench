export interface IWebhook {
  _id?: string;
  name: string;
  tag: string;
  description: string;
  envs: IWebhookEnv[];
  events: IWebhookEvent[];
  active?: boolean;
}

export interface IWebhookEnv {
  _id?: string;
  slug: string;
  registration_url: string;
  method: string;
  sample: string;
}

export interface IWebhookEvent {
  _id: string;
  name: string;
  tag: string;
  description: string;
  selector: string;
  selectorValue?: string;
  sample: any;
}


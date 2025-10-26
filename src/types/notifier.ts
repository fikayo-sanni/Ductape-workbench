/* eslint-disable @typescript-eslint/no-explicit-any */

export interface INotifierEnv {
  _id?: string;
  slug: string;
  push_notifications?: any;
  emails?: any;
  sms?: any;
  callbacks?: any;
}

export interface IProductNotifier {
  _id?: string;
  name: string;
  tag: string;
  description: string;
  envs: Array<INotifierEnv>;
  messages?: any[];
}


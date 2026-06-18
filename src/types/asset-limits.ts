export type AssetLimitKey =
  | 'product'
  | 'app'
  | 'database'
  | 'cache'
  | 'storage'
  | 'messageBroker'
  | 'notifier'
  | 'cloudFunction'
  | 'job'
  | 'dbAction';

export type WorkbenchAssetType =
  | 'product'
  | 'app'
  | 'database'
  | 'graph'
  | 'vector'
  | 'cache'
  | 'storage'
  | 'message-broker'
  | 'notifier'
  | 'session';

export interface AssetLimitStatus {
  current: number;
  limit: number | null;
  atLimit: boolean;
  overageUnitPrice: number | null;
  label: string;
}

export interface WorkspaceAssetLimits {
  planName: string;
  isEnterprise: boolean;
  isPayAsYouGo: boolean;
  unlimited: boolean;
  assets: Record<AssetLimitKey, AssetLimitStatus>;
}

export interface AssetLimitsResponse {
  status: boolean;
  message: string;
  data: WorkspaceAssetLimits;
}

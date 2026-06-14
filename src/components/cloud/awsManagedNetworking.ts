export type CloudNetworkingMode = 'customer' | 'managed' | 'vpc_connector';

export interface IAllowedSourceCidr {
  cidr: string;
  label?: string;
  source?: 'custom' | 'ductape_proxy' | 'detected';
}

export interface IManagedSecurityGroupRef {
  groupId: string;
  region: string;
  vpcId?: string;
  name?: string;
}

export interface ICloudManagedNetworking {
  mode?: CloudNetworkingMode;
  allowed_sources?: IAllowedSourceCidr[];
  include_ductape_proxy?: boolean;
  ductape_proxy_host?: string;
  ductape_proxy_addresses?: string[];
  managed_security_group?: IManagedSecurityGroupRef;
}

export function getCloudManagedNetworking(
  metadata: Record<string, unknown> | undefined,
): ICloudManagedNetworking {
  const raw = metadata?.networking;
  if (!raw || typeof raw !== 'object') return { mode: 'managed' };
  return raw as ICloudManagedNetworking;
}

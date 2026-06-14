export type CloudNetworkingMode = 'customer' | 'managed' | 'vpc_connector';

export interface IVpcConnectorSecurityGroupRef {
  groupId: string;
  region: string;
  vpcId?: string;
  name?: string;
}

export interface IVpcConnectorConfig {
  vpc_id: string;
  subnet_ids: string[];
  region: string;
  connector_security_group: IVpcConnectorSecurityGroupRef;
  data_security_group: IVpcConnectorSecurityGroupRef;
  app_security_group_ids?: string[];
  agent_status?: 'pending' | 'connected' | 'disconnected';
  agent_last_seen_at?: string;
  enrollment_token?: string;
}

export interface ICloudNetworkingMetadata {
  mode?: CloudNetworkingMode;
  vpc_connector?: IVpcConnectorConfig;
}

export function getCloudNetworkingMetadata(
  metadata: Record<string, unknown> | undefined,
): ICloudNetworkingMetadata {
  const raw = metadata?.networking;
  if (!raw || typeof raw !== 'object') return {};
  return raw as ICloudNetworkingMetadata;
}

export function getVpcConnectorConfig(
  metadata: Record<string, unknown> | undefined,
): IVpcConnectorConfig | undefined {
  const networking = getCloudNetworkingMetadata(metadata);
  if (networking.mode !== 'vpc_connector') return networking.vpc_connector;
  return networking.vpc_connector;
}

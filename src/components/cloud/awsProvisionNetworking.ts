import { getCloudManagedNetworking } from '@/components/cloud/awsManagedNetworking';
import {
  type AwsRegisteredSecurityGroup,
  type AwsSecurityGroupResourceType,
  parseRegisteredSecurityGroups,
  securityGroupsForResourceType,
} from '@/components/cloud/awsSecurityGroups';
import { getCloudNetworkingMetadata, getVpcConnectorConfig } from '@/components/cloud/awsVpcConnector';

export interface AutoProvisionSecurityGroup {
  groupId: string;
  label: string;
  detail?: string;
}

/** Security groups the backend auto-attaches at RDS/Neptune provision (mirrors resolveAwsProvisionParams). */
export function resolveAutoProvisionSecurityGroups(
  metadata: Record<string, unknown> | undefined,
): AutoProvisionSecurityGroup[] {
  const items: AutoProvisionSecurityGroup[] = [];
  const networking = getCloudNetworkingMetadata(metadata);
  const managed = getCloudManagedNetworking(metadata);

  if (networking.mode === 'managed' && managed.managed_security_group?.groupId) {
    const sg = managed.managed_security_group;
    items.push({
      groupId: sg.groupId,
      label: 'Ductape IP allowlist',
      detail: sg.region ? `Region ${sg.region}` : undefined,
    });
  }

  const vpcConnector = getVpcConnectorConfig(metadata);
  if (networking.mode === 'vpc_connector' && vpcConnector?.data_security_group?.groupId) {
    const sg = vpcConnector.data_security_group;
    items.push({
      groupId: sg.groupId,
      label: 'VPC connector data',
      detail: vpcConnector.vpc_id ? `VPC ${vpcConnector.vpc_id}` : undefined,
    });
  }

  return items;
}

export type AwsProvisionNetworkingUiState = {
  autoGroups: AutoProvisionSecurityGroup[];
  registeredGroups: AwsRegisteredSecurityGroup[];
  /** Customer tags must be selected before provision when true. */
  requiresCustomerSelection: boolean;
  /** Customer tags may be added on top of auto-attached groups. */
  allowsOptionalCustomerSelection: boolean;
  /** No auto groups and no registered groups — user must configure Private access first. */
  needsNetworkingSetup: boolean;
};

export function resolveAwsProvisionNetworkingUi(
  metadata: Record<string, unknown> | undefined,
  resourceType: AwsSecurityGroupResourceType,
): AwsProvisionNetworkingUiState {
  const autoGroups = resolveAutoProvisionSecurityGroups(metadata);
  const registeredGroups = securityGroupsForResourceType(
    parseRegisteredSecurityGroups(metadata),
    resourceType,
  );
  const hasAuto = autoGroups.length > 0;
  const hasRegistered = registeredGroups.length > 0;

  return {
    autoGroups,
    registeredGroups,
    requiresCustomerSelection: !hasAuto && hasRegistered,
    allowsOptionalCustomerSelection: hasAuto && hasRegistered,
    needsNetworkingSetup: !hasAuto && !hasRegistered,
  };
}

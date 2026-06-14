const DEFAULT_ASSUMABLE_ROLE_NAME = 'DuctapeAccess';

function formatIamUserAssumeRolePolicy(resource: string): string {
  return JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'sts:AssumeRole',
          Resource: resource,
        },
      ],
    },
    null,
    2,
  );
}

/** Inline IAM user policy so the Ductape integrations principal may sts:AssumeRole the customer role. */
export function buildIamUserAssumeRolePolicy(roleArn?: string, accountId?: string): string | null {
  const trimmed = roleArn?.trim();
  if (trimmed?.startsWith('arn:aws:iam::')) {
    return formatIamUserAssumeRolePolicy(trimmed);
  }

  const resolvedAccountId = parseAwsAccountIdFromRoleArn(trimmed) || accountId?.trim();
  if (!resolvedAccountId) {
    return null;
  }

  return formatIamUserAssumeRolePolicy(
    `arn:aws:iam::${resolvedAccountId}:role/${DEFAULT_ASSUMABLE_ROLE_NAME}`,
  );
}

export function isAssumeRoleValidationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('sts:assumerole') ||
    lower.includes('failed to assume role') ||
    lower.includes('not authorized to perform')
  );
}

/** Managed allowlist / VPC connector need EC2 security group APIs on the customer role. */
export function isEc2NetworkingPermissionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('ec2:createsecuritygroup') ||
    lower.includes('ec2:authorizesecuritygroupingress') ||
    lower.includes('ec2:revokesecuritygroupingress') ||
    lower.includes('ec2:describesecuritygroups') ||
    (lower.includes('not authorized to perform') && lower.includes('ec2:'))
  );
}

export function parseAwsAccountIdFromRoleArn(roleArn?: string): string | undefined {
  const match = roleArn?.trim().match(/^arn:aws:iam::(\d{12}):role\//);
  return match?.[1];
}

/** AWS VPC-backed provision services that require customer-managed security groups. */
export const AWS_VPC_PROVISION_SERVICES = ['rds', 'neptune'] as const;

export function awsVpcInboundPort(service: string): string {
  return service === 'neptune' ? '8182' : '5432';
}

/** Extra statements for the customer DuctapeAccess role when using managed allowlist. */
/** Extra statements for VPC connector mode (connector + data security groups). */
export function buildCustomerRoleVpcConnectorPolicy(): string {
  return JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DuctapeVpcConnector',
          Effect: 'Allow',
          Action: [
            'ec2:DescribeVpcs',
            'ec2:DescribeSubnets',
            'ec2:DescribeSecurityGroups',
            'ec2:CreateSecurityGroup',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:RevokeSecurityGroupIngress',
            'ec2:CreateTags',
          ],
          Resource: '*',
        },
      ],
    },
    null,
    2,
  );
}

export function buildCustomerRoleManagedNetworkingPolicy(): string {
  return JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DuctapeManagedNetworking',
          Effect: 'Allow',
          Action: [
            'ec2:DescribeVpcs',
            'ec2:DescribeSubnets',
            'ec2:DescribeSecurityGroups',
            'ec2:CreateSecurityGroup',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:RevokeSecurityGroupIngress',
            'ec2:CreateTags',
          ],
          Resource: '*',
        },
      ],
    },
    null,
    2,
  );
}

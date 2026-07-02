export type AwsSecurityGroupResourceType = 'rds' | 'neptune';

export interface AwsRegisteredSecurityGroup {
  tag: string;
  groupId: string;
  resourceTypes: AwsSecurityGroupResourceType[];
  region?: string;
  description?: string;
}

export const AWS_SG_TAG_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;
export const AWS_SG_ID_PATTERN = /^sg-[a-f0-9]+$/i;

export function parseRegisteredSecurityGroups(
  metadata: Record<string, unknown> | undefined,
): AwsRegisteredSecurityGroup[] {
  const raw = metadata?.security_groups;
  if (!Array.isArray(raw)) return [];

  const groups: AwsRegisteredSecurityGroup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const tag = String(row.tag || '').trim();
    const groupId = String(row.groupId || row.group_id || '').trim();
    const resourceTypes = Array.isArray(row.resourceTypes)
      ? (row.resourceTypes as string[])
          .map(String)
          .filter((t): t is AwsSecurityGroupResourceType => t === 'rds' || t === 'neptune')
      : [];
    if (!tag || !groupId || !resourceTypes.length) continue;
    groups.push({
      tag,
      groupId,
      resourceTypes,
      region: row.region ? String(row.region) : undefined,
      description: row.description ? String(row.description) : undefined,
    });
  }
  return groups;
}

export function securityGroupsForResourceType(
  groups: AwsRegisteredSecurityGroup[],
  resourceType: AwsSecurityGroupResourceType,
): AwsRegisteredSecurityGroup[] {
  return groups.filter((g) => g.resourceTypes.includes(resourceType));
}

/** RDS covers both engines on one registered security group — list both ports. */
export function awsVpcInboundPort(service: AwsSecurityGroupResourceType): string {
  return service === 'neptune' ? '8182' : '5432/3306';
}

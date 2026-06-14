import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  type AwsRegisteredSecurityGroup,
  type AwsSecurityGroupResourceType,
  awsVpcInboundPort,
} from '@/components/cloud/awsSecurityGroups';

export interface SecurityGroupPickerProps {
  groups: AwsRegisteredSecurityGroup[];
  resourceType: AwsSecurityGroupResourceType;
  value: string[];
  onChange: (tags: string[]) => void;
  required?: boolean;
  className?: string;
}

export default function SecurityGroupPicker({
  groups,
  resourceType,
  value,
  onChange,
  required,
  className,
}: SecurityGroupPickerProps) {
  const filtered = groups.filter((g) => g.resourceTypes.includes(resourceType));
  const selected = new Set(value);

  const toggle = (tag: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(tag);
    else next.delete(tag);
    onChange([...next]);
  };

  if (!filtered.length) {
    return (
      <div className={className}>
        <Label className={required ? 'required' : undefined}>VPC security groups</Label>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed">
          No security groups registered for {resourceType.toUpperCase()} on this connection. Open
          Cloud → your connection → Security groups and register customer-managed groups.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Label className={required ? 'required' : undefined}>VPC security groups</Label>
      <p className="text-xs text-grey-600 mt-1 mb-2">
        Select one or more registered groups (inbound TCP {awsVpcInboundPort(resourceType)} must be
        pre-configured in AWS). Ductape never modifies security groups.
      </p>
      <div className="space-y-2 rounded-lg border border-grey-400 bg-white p-3">
        {filtered.map((group) => (
          <label
            key={group.tag}
            className="flex items-start gap-3 cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected.has(group.tag)}
              onCheckedChange={(checked) => toggle(group.tag, checked === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="font-medium text-grey">{group.tag}</span>
              <span className="font-mono text-xs text-grey-600 ml-2">{group.groupId}</span>
              {group.description ? (
                <span className="block text-xs text-grey-600 mt-0.5">{group.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

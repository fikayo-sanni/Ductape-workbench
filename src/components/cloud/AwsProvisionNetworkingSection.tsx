import { CheckCircle2 } from 'lucide-react';
import SecurityGroupPicker from '@/components/cloud/SecurityGroupPicker';
import {
  type AwsSecurityGroupResourceType,
  awsVpcInboundPort,
} from '@/components/cloud/awsSecurityGroups';
import type { AwsProvisionNetworkingUiState } from '@/components/cloud/awsProvisionNetworking';

export interface AwsProvisionNetworkingSectionProps {
  ui: AwsProvisionNetworkingUiState;
  resourceType: AwsSecurityGroupResourceType;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  connectionTag?: string;
}

export default function AwsProvisionNetworkingSection({
  ui,
  resourceType,
  selectedTags,
  onSelectedTagsChange,
  connectionTag,
}: AwsProvisionNetworkingSectionProps) {
  const port = awsVpcInboundPort(resourceType);
  const serviceLabel = resourceType === 'neptune' ? 'Neptune' : 'RDS';

  if (ui.needsNetworkingSetup) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
        <p className="text-xs font-medium text-amber-900">Private access required</p>
        <p className="text-xs text-amber-800 leading-relaxed">
          Configure networking on cloud connection{' '}
          {connectionTag ? (
            <code className="font-mono text-[11px]">{connectionTag}</code>
          ) : (
            'above'
          )}{' '}
          before provisioning {serviceLabel}: use <span className="font-medium">IP allowlist</span>,{' '}
          <span className="font-medium">VPC connector</span>, or register{' '}
          <span className="font-medium">your security groups</span> under Private access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ui.autoGroups.length ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <p className="text-xs font-medium text-grey flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            Security groups attached automatically
          </p>
          <ul className="text-xs space-y-1.5">
            {ui.autoGroups.map((group) => (
              <li key={group.groupId} className="text-grey">
                <span className="font-medium">{group.label}</span>
                <code className="font-mono text-[11px] text-grey-600 ml-2">{group.groupId}</code>
                {group.detail ? (
                  <span className="block text-grey-600 mt-0.5">{group.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-grey-600 leading-relaxed">
            Inbound TCP {port} is opened for workbench and proxy traffic. No manual selection needed.
          </p>
        </div>
      ) : null}

      {ui.requiresCustomerSelection || ui.allowsOptionalCustomerSelection ? (
        <SecurityGroupPicker
          groups={ui.registeredGroups}
          resourceType={resourceType}
          value={selectedTags}
          required={ui.requiresCustomerSelection}
          onChange={onSelectedTagsChange}
        />
      ) : null}

      {ui.allowsOptionalCustomerSelection ? (
        <p className="text-[11px] text-grey-600 leading-relaxed -mt-1">
          Optionally add registered groups (e.g. your application servers) — they will be attached
          alongside the groups above.
        </p>
      ) : null}

      {ui.requiresCustomerSelection ? (
        <p className="text-[11px] text-grey-600 leading-relaxed -mt-1">
          Select groups with inbound TCP {port} already configured in AWS. Ductape does not modify
          your rules.
        </p>
      ) : null}
    </div>
  );
}

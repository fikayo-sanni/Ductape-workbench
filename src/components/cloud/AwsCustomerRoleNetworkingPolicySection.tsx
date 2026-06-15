import type { Ref } from 'react';
import CloudCopySnippet from '@/components/cloud/CloudCopySnippet';
import {
  buildCustomerRoleManagedNetworkingPolicy,
  buildCustomerRoleVpcConnectorPolicy,
} from '@/components/cloud/awsIamUserPolicy';
import { cn } from '@/lib/utils';

export interface AwsCustomerRoleNetworkingPolicySectionProps {
  /** setup = full guidance during connection setup; allowlist = IP allowlist panel only */
  variant?: 'setup' | 'allowlist';
  highlight?: boolean;
  innerRef?: Ref<HTMLDivElement>;
  className?: string;
}

export default function AwsCustomerRoleNetworkingPolicySection({
  variant = 'setup',
  highlight = false,
  innerRef,
  className,
}: AwsCustomerRoleNetworkingPolicySectionProps) {
  const isSetup = variant === 'setup';

  return (
    <div
      ref={innerRef}
      className={cn(
        'rounded-lg border p-4 sm:p-6 shadow-sm space-y-4',
        highlight
          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
          : 'border-emerald-500/30 bg-emerald-500/5',
        className,
      )}
    >
      <div>
        {isSetup ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
            Required for RDS / Neptune — IP allowlist
          </p>
        ) : null}
        <h3 className="text-sm font-semibold text-grey mt-1">
          {isSetup ? 'Step 3 — EC2 policy on DuctapeAccess role' : 'Required IAM on DuctapeAccess role'}
        </h3>
        <p className="text-xs text-grey-600 mt-1 leading-relaxed">
          {isSetup ? (
            <>
              If you will use <span className="font-medium text-grey">IP allowlist</span> under Private
              access (or want it ready before activating), attach this inline policy to the same role
              as RDS/Neptune — e.g.{' '}
              <code className="font-mono text-[11px]">DuctapeAccess</code>. IAM → Roles → your role →
              Add permissions → Create inline policy → JSON.
            </>
          ) : (
            <>
              IP allowlist creates and updates a security group in your AWS account. In IAM → Roles →{' '}
              <code className="font-mono text-[11px]">DuctapeAccess</code> → Add permissions → Create
              inline policy → JSON, paste this, save, then click Save allowlist again.
            </>
          )}
        </p>
      </div>

      <CloudCopySnippet
        value={buildCustomerRoleManagedNetworkingPolicy()}
        label="IP allowlist (managed networking) IAM policy"
      />

      {isSetup ? (
        <>
          <p className="text-xs text-grey-600 leading-relaxed border-t border-emerald-500/20 pt-3">
            Using <span className="font-medium text-grey">VPC connector</span> or{' '}
            <span className="font-medium text-grey">your own security groups</span> instead? You can
            skip the policy above. VPC connector uses a different inline policy (shown under Private
            access after activation). Customer-managed groups need no EC2 write permissions on the role.
          </p>
          <details className="rounded-lg border border-grey-300 bg-white/60">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-grey">
              VPC connector IAM policy (optional — only if using VPC connector mode)
            </summary>
            <div className="border-t border-grey-300 px-4 py-4">
              <CloudCopySnippet
                value={buildCustomerRoleVpcConnectorPolicy()}
                label="VPC connector IAM policy"
              />
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}

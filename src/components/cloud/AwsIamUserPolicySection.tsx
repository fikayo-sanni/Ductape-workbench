import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { buildIamUserAssumeRolePolicy } from '@/components/cloud/awsIamUserPolicy';

type AwsIamUserPolicySectionProps = {
  roleArn?: string;
  ductapeAwsAccountId?: string;
  ductapeCallerArn?: string;
};

async function copyToClipboard(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

export default function AwsIamUserPolicySection({
  roleArn,
  ductapeAwsAccountId,
  ductapeCallerArn,
}: AwsIamUserPolicySectionProps) {
  const policyJson = buildIamUserAssumeRolePolicy(roleArn, ductapeAwsAccountId);
  const usingRoleArn = Boolean(roleArn?.trim()?.startsWith('arn:aws:iam::'));
  const placeholderResource = ductapeAwsAccountId
    ? `arn:aws:iam::${ductapeAwsAccountId}:role/DuctapeAccess`
    : null;

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-6 shadow-sm space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
          Required — do not skip
        </p>
        <h3 className="text-sm font-semibold text-grey mt-1">Step 1 — IAM user permission</h3>
        <p className="text-xs text-grey-600 mt-1 leading-relaxed">
          Ductape validates this connection by calling <code className="font-mono">sts:AssumeRole</code>{' '}
          using an IAM user configured on the integrations service
          {ductapeCallerArn ? (
            <>
              {' '}
              (
              <span className="font-mono">{ductapeCallerArn}</span>)
            </>
          ) : ductapeAwsAccountId ? (
            <>
              {' '}
              (account <span className="font-mono">{ductapeAwsAccountId}</span>)
            </>
          ) : null}
          . That user must be allowed to assume your <span className="font-mono">DuctapeAccess</span>{' '}
          role — otherwise validation fails with &quot;not authorized to perform: sts:AssumeRole&quot;.
        </p>
      </div>

      {ductapeCallerArn ? (
        <div className="rounded-lg border border-amber-500/30 bg-white p-3">
          <p className="text-xs text-grey-600">Attach the policy below to this IAM user</p>
          <p className="font-mono text-sm text-grey mt-1 break-all">{ductapeCallerArn}</p>
        </div>
      ) : null}

      <ol className="text-xs text-grey-600 space-y-2 list-decimal list-inside leading-relaxed">
        <li>
          Open{' '}
          <a
            href="https://console.aws.amazon.com/iamv2/home#/users"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            IAM → Users
            <ExternalLink className="h-3 w-3" />
          </a>{' '}
          and select the IAM user whose access keys power your Ductape integrations service
          {ductapeCallerArn ? (
            <>
              {' '}
              (<span className="font-mono">{ductapeCallerArn}</span>)
            </>
          ) : (
            <>
              {' '}
              (for local Docker, the user in <code className="font-mono">platform/.env</code>)
            </>
          )}
          .
        </li>
        <li>
          <span className="font-medium text-grey">Add permissions</span> → Create inline policy →
          JSON → paste the policy below → save.
        </li>
        <li>
          Name the role <code className="font-mono text-xs">DuctapeAccess</code> in Step 2 so it
          matches the <code className="font-mono text-xs">Resource</code> ARN in this policy. Enter your
          Role ARN in Step 4 to regenerate this policy if your role lives in a different AWS account.
        </li>
      </ol>

      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="iam-user-policy-json">IAM user inline policy</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => policyJson && copyToClipboard(policyJson, 'IAM user policy')}
            disabled={!policyJson}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
        </div>
        <Textarea
          id="iam-user-policy-json"
          className="mt-2 font-mono text-xs min-h-[120px]"
          readOnly
          value={policyJson || ''}
        />
        {!policyJson ? (
          <div className="flex items-center gap-2 text-sm text-grey-600 mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading AWS account ID for this policy…
          </div>
        ) : usingRoleArn ? (
          <p className="text-xs text-grey-600 mt-2">
            Policy scoped to <span className="font-mono">{roleArn?.trim()}</span>.
          </p>
        ) : placeholderResource ? (
          <p className="text-xs text-grey-600 mt-2">
            Policy uses account <span className="font-mono">{ductapeAwsAccountId}</span> and role{' '}
            <span className="font-mono">DuctapeAccess</span> (
            <span className="font-mono">{placeholderResource}</span>). Update the account ID if your role
            is in a different AWS account.
          </p>
        ) : null}
      </div>

      <p className="text-xs text-grey-600 border-t border-amber-500/20 pt-3 leading-relaxed">
        <span className="font-medium text-grey">Local Docker:</span> set{' '}
        <code className="font-mono">AWS_ACCESS_KEY_ID</code> and{' '}
        <code className="font-mono">AWS_SECRET_ACCESS_KEY</code> in{' '}
        <code className="font-mono">platform/.env</code> for that IAM user, then restart the{' '}
        <code className="font-mono">integrations</code> service.
      </p>
    </div>
  );
}

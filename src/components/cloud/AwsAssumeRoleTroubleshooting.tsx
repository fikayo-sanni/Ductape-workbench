import { AlertTriangle } from 'lucide-react';

type AwsAssumeRoleTroubleshootingProps = {
  errorMessage: string;
  externalId?: string;
  ductapeAwsAccountId?: string;
  ductapeCallerArn?: string;
};

function parseCallerArnFromError(message: string): string | undefined {
  const match = message.match(/User:\s*(arn:aws:iam::\d{12}:user\/\S+)/i);
  return match?.[1];
}

export default function AwsAssumeRoleTroubleshooting({
  errorMessage,
  externalId,
  ductapeAwsAccountId,
  ductapeCallerArn,
}: AwsAssumeRoleTroubleshootingProps) {
  const callerArn = ductapeCallerArn || parseCallerArnFromError(errorMessage);
  const callerName = callerArn?.split('/').pop();

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-grey">AssumeRole failed — fix both policies</p>
          <p className="text-sm text-grey-600 mt-1 leading-relaxed break-words">{errorMessage}</p>
        </div>
      </div>
      <ul className="text-sm text-grey-600 space-y-2 list-disc list-inside leading-relaxed">
        <li>
          <span className="font-medium text-grey">Step 1 — IAM user policy:</span>{' '}
          {callerArn ? (
            <>
              open IAM → Users → <span className="font-mono">{callerName}</span> and add an inline
              policy allowing <code className="font-mono text-xs">sts:AssumeRole</code> on{' '}
              <span className="font-mono">arn:aws:iam::…:role/DuctapeAccess</span> (copy JSON from Step
              1 above). This error usually means this step is missing.
            </>
          ) : (
            <>
              the integrations IAM user must have <code className="font-mono text-xs">sts:AssumeRole</code>{' '}
              on your DuctapeAccess role ARN (see Step 1 above).
            </>
          )}
        </li>
        <li>
          <span className="font-medium text-grey">Step 2 — Role trust policy:</span> on role{' '}
          <span className="font-mono">DuctapeAccess</span>, paste the trust JSON from Step 2 so it trusts
          Ductape
          {ductapeAwsAccountId ? (
            <>
              {' '}
              account <span className="font-mono">{ductapeAwsAccountId}</span>
            </>
          ) : null}{' '}
          with external ID{' '}
          {externalId ? (
            <span className="font-mono">{externalId}</span>
          ) : (
            'shown in this tab'
          )}
          .
        </li>
        <li>
          <span className="font-medium text-grey">Role name:</span> the role must be named{' '}
          <code className="font-mono text-xs">DuctapeAccess</code> unless you updated the IAM user policy
          Resource ARN to match a different name.
        </li>
        <li>
          <span className="font-medium text-grey">Role ARN:</span> confirm the ARN you entered matches
          the DuctapeAccess role in IAM (including account ID and role name).
        </li>
      </ul>
    </div>
  );
}

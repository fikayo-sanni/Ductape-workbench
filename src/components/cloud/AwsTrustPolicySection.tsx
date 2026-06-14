import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

type AwsTrustPolicySectionProps = {
  trustPolicy: string;
  externalId?: string;
  ductapeAwsAccountId?: string;
  loading?: boolean;
};

async function copyToClipboard(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

export default function AwsTrustPolicySection({
  trustPolicy,
  externalId,
  ductapeAwsAccountId,
  loading = false,
}: AwsTrustPolicySectionProps) {
  return (
    <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-grey">Step 2 — Role trust policy</h3>
        <p className="text-xs text-grey-600 mt-1">
          Create an IAM role named <span className="font-mono font-medium">DuctapeAccess</span> (to match
          the Step 1 IAM user policy), then paste this JSON into the{' '}
          <span className="font-medium">role’s</span> trust relationship (not the IAM user). Pair this with
          the IAM user permission above so AssumeRole can succeed.
        </p>
      </div>

      {(ductapeAwsAccountId || externalId) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ductapeAwsAccountId ? (
            <div className="rounded-lg border border-grey-400 bg-grey-100 p-3">
              <p className="text-xs text-grey-600">Ductape AWS account</p>
              <p className="font-mono text-sm text-grey mt-1">{ductapeAwsAccountId}</p>
            </div>
          ) : null}
          {externalId ? (
            <div className="rounded-lg border border-grey-400 bg-grey-100 p-3 flex justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-grey-600">External ID</p>
                <p className="font-mono text-sm text-grey mt-1 truncate">{externalId}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => copyToClipboard(externalId, 'external ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {loading && !trustPolicy ? (
        <div className="flex items-center gap-2 text-sm text-grey-600 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading trust policy…
        </div>
      ) : null}

      {trustPolicy ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="trust-policy-json">Policy JSON</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(trustPolicy, 'trust policy')}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
          <Textarea
            id="trust-policy-json"
            className="mt-2 font-mono text-xs min-h-[160px]"
            readOnly
            value={trustPolicy}
          />
        </div>
      ) : !loading ? (
        <p className="text-sm text-grey-600">
          Trust policy could not be loaded. Refresh the page or check that the integrations service
          is running.
        </p>
      ) : null}
    </div>
  );
}

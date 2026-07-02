import { ExternalLink } from 'lucide-react';
import { awsVpcInboundPort } from '@/components/cloud/awsSecurityGroups';

export type AwsSecurityGroupsGuideVariant = 'panel' | 'setup';

export interface AwsSecurityGroupsGuideProps {
  variant?: AwsSecurityGroupsGuideVariant;
}

export default function AwsSecurityGroupsGuide({ variant = 'panel' }: AwsSecurityGroupsGuideProps) {
  const isSetup = variant === 'setup';

  return (
    <div className="space-y-4">
      <div className={isSetup ? undefined : 'bg-grey-50/80 border border-grey-300 rounded-lg p-4 space-y-4'}>
        <div>
          <p className="text-xs font-semibold text-grey">How Ductape connects</p>
          <p className="text-xs text-grey-600 mt-1 leading-relaxed">
            The SDK on your servers and the Ductape proxy both open <span className="font-medium text-grey">direct</span>{' '}
            TCP connections to the RDS or Neptune endpoint — Ductape is not a database TCP tunnel. Your
            security group must allow inbound from <span className="font-medium text-grey">both</span> callers.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-grey">Required inbound rules</p>
          <p className="text-xs text-grey-600 mt-1 leading-relaxed">
            Add these on the customer-managed group in EC2 before you register it here. Ductape never
            calls <code className="font-mono text-[11px]">ec2:AuthorizeSecurityGroupIngress</code>.
          </p>
          <table className="mt-2 w-full text-xs border border-grey-300 rounded-lg overflow-hidden">
            <thead className="bg-grey-100/80">
              <tr>
                <th className="text-left font-semibold text-grey px-3 py-2 border-b border-grey-300">Service</th>
                <th className="text-left font-semibold text-grey px-3 py-2 border-b border-grey-300">Port</th>
                <th className="text-left font-semibold text-grey px-3 py-2 border-b border-grey-300">Protocol</th>
              </tr>
            </thead>
            <tbody className="text-grey-600">
              <tr className="border-b border-grey-300">
                <td className="px-3 py-2 font-medium text-grey">RDS (PostgreSQL / MySQL)</td>
                <td className="px-3 py-2 font-mono">{awsVpcInboundPort('rds')}</td>
                <td className="px-3 py-2">TCP</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-grey">Neptune (Gremlin)</td>
                <td className="px-3 py-2 font-mono">{awsVpcInboundPort('neptune')}</td>
                <td className="px-3 py-2">TCP (WebSocket)</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-grey-600 mt-2 leading-relaxed">
            One group can cover both services — add both port rules if you register it for RDS and Neptune.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-grey">Sources to allow</p>
          <ul className="text-xs text-grey-600 mt-1 space-y-2 list-disc list-inside leading-relaxed">
            <li>
              <span className="font-medium text-grey">Your application servers</span> — wherever the SDK
              runs. In the same VPC, use your app security group as the source (recommended). Otherwise
              use your app NAT or egress IP/CIDR.
            </li>
            <li>
              <span className="font-medium text-grey">Ductape proxy</span> — workbench and hosted proxy
              paths run the SDK server-side and connect the same way. Allow your self-hosted proxy
              security group, or Ductape proxy egress IPs for hosted deployments.
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-grey">RDS vs Neptune</p>
          <ul className="text-xs text-grey-600 mt-1 space-y-2 list-disc list-inside leading-relaxed">
            <li>
              <span className="font-medium text-grey">RDS</span> — provisioned{' '}
              <span className="font-medium text-grey">publicly accessible</span> by default, so internet
              paths work when you allow your app and proxy IPs on TCP {awsVpcInboundPort('rds')}. Set{' '}
              <code className="font-mono text-[11px]">publiclyAccessible: false</code> only when both
              callers can reach the VPC (peering, VPN, proxy in VPC).
            </li>
            <li>
              <span className="font-medium text-grey">Neptune</span> — always VPC-scoped. Callers need a
              network path into the VPC (same VPC, peering, VPN, or self-hosted proxy in the VPC). Allow
              TCP {awsVpcInboundPort('neptune')} from app and proxy security groups or VPC CIDRs.
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-grey">Example (app and proxy in the same VPC)</p>
          <pre className="mt-1 text-[11px] font-mono text-grey-600 bg-white border border-grey-300 rounded-md p-3 overflow-x-auto leading-relaxed">
{`sg-ductape-data
  Inbound TCP ${awsVpcInboundPort('rds')}  ← sg-your-app
  Inbound TCP ${awsVpcInboundPort('rds')}  ← sg-ductape-proxy
  Inbound TCP ${awsVpcInboundPort('neptune')} ← sg-your-app
  Inbound TCP ${awsVpcInboundPort('neptune')} ← sg-ductape-proxy`}
          </pre>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-grey">Create groups in AWS</p>
        <ol className="text-xs text-grey-600 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Open{' '}
            <a
              href="https://console.aws.amazon.com/ec2/home#SecurityGroups:"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              EC2 → Security Groups
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            in the VPC where you provision RDS or Neptune.
          </li>
          <li>Add the inbound rules above for your app and proxy sources.</li>
          <li>
            {isSetup ? (
              <>
                After the connection is active, open the <span className="font-medium text-grey">Private access</span>{' '}
                tab, register each group id with a short tag, then pass{' '}
                <code className="font-mono text-[11px]">securityGroups: [&quot;your-tag&quot;]</code> when
                provisioning or linking.
              </>
            ) : (
              <>
                Copy each group id (e.g. <code className="font-mono text-[11px]">sg-0abc123</code>) and
                register it below with a tag used in the SDK:{' '}
                <code className="font-mono text-[11px]">securityGroups: [&quot;prod-rds&quot;]</code>
              </>
            )}
          </li>
        </ol>
      </div>

      <p className="text-[11px] text-grey-600 leading-relaxed">
        S3, SQS, and public OpenSearch domains do not use VPC security groups. You do not need egress
        rules on the database security group — AWS security groups are stateful.
      </p>
    </div>
  );
}

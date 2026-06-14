import { AWS_VPC_PROVISION_SERVICES } from '@/components/cloud/awsIamUserPolicy';
import AwsSecurityGroupsGuide from '@/components/cloud/AwsSecurityGroupsGuide';

export default function AwsRdsNetworkingSection() {
  return (
    <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-6 shadow-sm space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
          Required for AWS VPC resources
        </p>
        <h3 className="text-sm font-semibold text-grey mt-1">Customer-managed security groups</h3>
        <p className="text-xs text-grey-600 mt-1 leading-relaxed">
          Ductape provisions AWS VPC resources ({AWS_VPC_PROVISION_SERVICES.join(', ')}) with security
          groups you provide. Ductape <span className="font-medium text-grey">never</span> calls{' '}
          <code className="font-mono">ec2:AuthorizeSecurityGroupIngress</code> — you control firewall
          rules in your AWS account. <code className="font-mono">AmazonRDSFullAccess</code> /{' '}
          <code className="font-mono">NeptuneFullAccess</code> are sufficient; no EC2 write permissions
          needed.
        </p>
      </div>

      <AwsSecurityGroupsGuide variant="setup" />
    </div>
  );
}

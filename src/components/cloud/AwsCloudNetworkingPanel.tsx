import { useState } from 'react';
import { CheckCircle2, Globe, Network, Shield } from 'lucide-react';
import AwsManagedNetworkingPanel from '@/components/cloud/AwsManagedNetworkingPanel';
import AwsSecurityGroupsPanel from '@/components/cloud/AwsSecurityGroupsPanel';
import AwsVpcConnectorPanel from '@/components/cloud/AwsVpcConnectorPanel';
import { getCloudManagedNetworking } from '@/components/cloud/awsManagedNetworking';
import { getCloudNetworkingMetadata } from '@/components/cloud/awsVpcConnector';
import type { SDKProxyService } from '@/services/sdkProxy';
import { cn } from '@/lib/utils';

export interface AwsCloudNetworkingPanelProps {
  connection: {
    id?: string;
    tag?: string;
    provider?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
  workspaceId?: string;
}

type NetworkingMode = 'vpc_connector' | 'managed' | 'customer';

const MODES: Array<{
  id: NetworkingMode;
  title: string;
  description: string;
  icon: typeof Network;
  recommended?: boolean;
}> = [
  {
    id: 'vpc_connector',
    title: 'VPC connector',
    description: 'Best for private RDS and Neptune. Run a small agent in your VPC — no IP allowlisting.',
    icon: Network,
    recommended: true,
  },
  {
    id: 'managed',
    title: 'IP allowlist',
    description: 'Ductape creates a security group and opens ports for workbench and proxy traffic.',
    icon: Globe,
  },
  {
    id: 'customer',
    title: 'Your security groups',
    description: 'You manage EC2 groups and register them here. Full control, more setup.',
    icon: Shield,
  },
];

function resolveSavedMode(metadata?: Record<string, unknown>): NetworkingMode {
  const networking = getCloudNetworkingMetadata(metadata);
  const saved = getCloudManagedNetworking(metadata);
  if (networking.mode === 'vpc_connector') return 'vpc_connector';
  if (networking.mode === 'customer' || saved.mode === 'customer') return 'customer';
  if (networking.mode === 'managed' || saved.managed_security_group?.groupId) return 'managed';
  return 'managed';
}

export default function AwsCloudNetworkingPanel({
  connection,
  sdkProxy,
  workspaceId,
}: AwsCloudNetworkingPanelProps) {
  const savedMode = resolveSavedMode(connection.metadata);
  const [mode, setMode] = useState<NetworkingMode>(savedMode);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-grey">How should Ductape reach your databases?</h2>
        <p className="text-xs text-grey-600 mt-1 leading-relaxed">
          Only needed for RDS and Neptune. S3, SQS, and public OpenSearch work without this.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;
          const isSaved = savedMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-grey-400 bg-white hover:border-grey-500',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', selected ? 'text-primary' : 'text-grey-600')} />
                {item.recommended ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-medium text-grey mt-2">{item.title}</p>
              <p className="text-xs text-grey-600 mt-1 leading-relaxed">{item.description}</p>
              {isSaved ? (
                <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active on this connection
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        {mode === 'vpc_connector' ? (
          <AwsVpcConnectorPanel connection={connection} sdkProxy={sdkProxy} workspaceId={workspaceId} />
        ) : mode === 'managed' ? (
          <AwsManagedNetworkingPanel connection={connection} sdkProxy={sdkProxy} />
        ) : (
          <AwsSecurityGroupsPanel connection={connection} sdkProxy={sdkProxy} />
        )}
      </div>
    </div>
  );
}
